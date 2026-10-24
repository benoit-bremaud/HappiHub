import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFieldCipher } from '../../domain/fieldCipher.js';
import { reencrypt } from '../../jobs/reencrypt.js';
import { deliverOutbox } from '../../services/outbox.js';
import { sharedTestKeyring, testKeyring } from '../testCipher.js';
import { bidx, browser, buildApp, cipher, createPool, migrate, PASSWORD, resetData, signUpVerified } from './harness.js';

// Spec db-encryption-at-rest § 11 (integration): AC1, AC5, AC7, D4 and D7 on a real PostgreSQL.
let pool, app;
beforeAll(() => { migrate(); pool = createPool(); });
beforeEach(async () => { await resetData(pool); ({ app } = buildApp(pool)); });
afterAll(() => pool.end());

const PERSONAL = {
  account: ['email_enc', 'pending_email_enc', 'display_name_enc'],
  invitation: ['email_enc'],
  association: ['contact_email_enc'],
  outbox_message: ['recipient_enc', 'payload_enc'],
};

/** Every personal column populated at least once through the API. */
const populate = async () => {
  const claire = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
  await claire.patch('/api/account', { displayName: 'Claire Martin' });
  await claire.patch('/api/account', { email: 'claire.new@example.org', currentPassword: PASSWORD });
  await claire.patch('/api/associations/troupe', { contactEmail: 'contact@troupe.example.org' });
  expect((await claire.post('/api/associations/troupe/invitations', { email: 'malik@example.org' })).status).toBe(201);
  return claire;
};

/** Raw values of every personal column (what a dump, a replica or an SQL read sees). */
const rawValues = async () => {
  const values = [];
  for (const [table, columns] of Object.entries(PERSONAL)) {
    // Test-only text from the fixed names above, never from input.
    const { rows } = await pool.query(`SELECT ${columns.join(', ')} FROM ${table}`);
    for (const row of rows) for (const column of columns) values.push({ column: `${table}.${column}`, value: row[column] });
  }
  return values;
};

describe('no plaintext at rest (AC1)', () => {
  test('every personal column holds only hh1 envelopes', async () => {
    await populate();
    const values = await rawValues();
    for (const column of Object.entries(PERSONAL).flatMap(([t, cs]) => cs.map((c) => `${t}.${c}`)))
      expect(values.some((v) => v.column === column && v.value !== null)).toBe(true);
    for (const { value } of values.filter((v) => v.value !== null)) {
      expect(value).toMatch(/^hh1\.k1\.[A-Za-z0-9_-]+$/);
      expect(value).not.toContain('@');
    }
    const dump = JSON.stringify(values);
    for (const plain of ['claire', 'malik', 'Claire Martin', 'troupe.example', 'verify-email#'])
      expect(dump).not.toContain(plain);
  });

  test('the API and the export still return the decrypted values (AC2, § 13)', async () => {
    const claire = await populate();
    const exported = (await claire.get('/api/account/export')).body;
    expect(exported.account).toMatchObject({ email: 'claire@example.org', pendingEmail: 'claire.new@example.org',
      displayName: 'Claire Martin' });
    expect(exported.invitationsSent).toEqual([expect.objectContaining({ association: 'troupe', email: 'malik@example.org' })]);
    const view = (await claire.get('/api/associations/troupe')).body;
    expect(view.contactEmail).toBe('contact@troupe.example.org');
    expect(view.members[0]).toMatchObject({ displayName: 'Claire Martin', email: 'claire@example.org' });
  });
});

describe('normalization and fail-closed reads', () => {
  test('stored addresses are folded (spec § 5, replaces the dropped CHECK lower)', async () => {
    await signUpVerified(app, pool, ' Ada@Example.FR ');
    const { rows: [row] } = await pool.query('SELECT email_enc FROM account');
    expect(cipher.decrypt('account.email_enc', row.email_enc)).toBe('ada@example.fr');
  });

  test('a corrupted envelope fails the request without leaking it (AC3)', async () => {
    const claire = await signUpVerified(app, pool, 'claire@example.org');
    await claire.patch('/api/account', { displayName: 'Claire Martin' });
    const { rows: [row] } = await pool.query('SELECT display_name_enc FROM account');
    const corrupted = `${row.display_name_enc.slice(0, -2)}AA`;
    await pool.query('UPDATE account SET display_name_enc = $1', [corrupted]);
    const response = await claire.get('/api/account');
    // The account loads in the auth middleware, which fails closed with its generic 503.
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ message: 'Authentication unavailable' });
    expect(JSON.stringify(response.body)).not.toContain(corrupted.split('.')[2]);
  });

  test('delivery refuses to run without a cipher instead of failing every message', () => {
    expect(() => deliverOutbox(pool, { send: jest.fn() })).toThrow('Field cipher is required');
  });
});

describe('blind-index constraints', () => {
  test('a duplicate account address is refused by email_bidx, whatever its case', async () => {
    await signUpVerified(app, pool, 'claire@example.org');
    await expect(pool.query("INSERT INTO account (email_enc, email_bidx, password_hash) VALUES ($1, $2, 'x')",
      [cipher.encrypt('account.email_enc', 'claire@example.org'), bidx(' Claire@Example.org ')]))
      .rejects.toMatchObject({ code: '23505' });
  });

  test('a second pending invitation for the same address is refused', async () => {
    const claire = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
    await claire.post('/api/associations/troupe/invitations', { email: 'malik@example.org' });
    expect((await claire.post('/api/associations/troupe/invitations', { email: 'MALIK@example.org' })).status).toBe(409);
    const { rows: [first] } = await pool.query('SELECT association_id, token_hash FROM invitation');
    await expect(pool.query(`INSERT INTO invitation (association_id, email_enc, email_bidx, token_hash, expires_at)
      VALUES ($1, $2, $3, 'other', now())`, [first.association_id, cipher.encrypt('invitation.email_enc', 'malik@example.org'),
      bidx('malik@example.org')])).rejects.toMatchObject({ code: '23505' });
  });

  test('account deletion erases invitations and outbox rows by blind index (AC7)', async () => {
    const claire = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
    await claire.post('/api/associations/troupe/invitations', { email: 'gone@example.org' });
    const gone = await signUpVerified(app, pool, 'gone@example.org', 'Solo');
    await gone.patch('/api/account', { email: 'gone.next@example.org', currentPassword: PASSWORD });
    expect((await gone.del('/api/account', { password: PASSWORD, confirm: true })).status).toBe(204);
    for (const address of ['gone@example.org', 'gone.next@example.org']) {
      expect((await pool.query('SELECT 1 FROM invitation WHERE email_bidx = $1', [bidx(address)])).rows).toHaveLength(0);
      expect((await pool.query('SELECT 1 FROM outbox_message WHERE recipient_bidx = $1', [bidx(address)])).rows).toHaveLength(0);
    }
  });
});

describe('re-encryption job (§ 6.2, AC5)', () => {
  test('moves every envelope to the new active key and is idempotent', async () => {
    const claire = await populate();
    const rotated = createFieldCipher({ ...sharedTestKeyring, active: 'k2' });
    const first = await reencrypt(pool, rotated, { batch: 2 });
    expect(first.rotatedRows).toMatchObject({ account: 1, invitation: 1, association: 1 });
    expect(first.rotatedRows.outbox_message).toBeGreaterThan(2);
    expect(Object.values(first.remaining).every((count) => count === 0)).toBe(true);
    for (const { value } of (await rawValues()).filter((v) => v.value !== null)) expect(value).toMatch(/^hh1\.k2\./);
    expect(await reencrypt(pool, rotated)).toEqual({ rotatedRows: { account: 0, invitation: 0, association: 0, outbox_message: 0 },
      remaining: first.remaining });
    // Readers holding both keys keep working during the staged rotation.
    expect((await claire.get('/api/account')).body.displayName).toBe('Claire Martin');
    // The blind-index key does not rotate: lookups by address still match.
    expect((await pool.query('SELECT 1 FROM account WHERE email_bidx = $1', [bidx('claire@example.org')])).rows).toHaveLength(1);
  });

  test('pages past one batch and reports rows locked during the run as remaining', async () => {
    for (const name of ['a', 'b', 'c']) await signUpVerified(app, pool, `${name}@example.org`);
    const rotated = createFieldCipher({ ...sharedTestKeyring, active: 'k2' });
    const holder = await pool.connect();
    try {
      await holder.query('BEGIN');
      await holder.query('SELECT id FROM account WHERE email_bidx = $1 FOR UPDATE', [bidx('b@example.org')]);
      const run = await reencrypt(pool, rotated, { batch: 1 });
      expect(run.rotatedRows.account).toBe(2);
      expect(run.remaining['account.email_enc']).toBe(1);
    } finally {
      await holder.query('ROLLBACK');
      holder.release();
    }
    expect((await reencrypt(pool, rotated, { batch: 1 })).rotatedRows.account).toBe(1);
  });
});

describe('session table stays free of personal data (D4)', () => {
  test('sess holds only the allowed keys', async () => {
    await signUpVerified(app, pool, 'claire@example.org');
    await browser(app);
    const { rows } = await pool.query('SELECT sess FROM session');
    expect(rows.length).toBeGreaterThan(0);
    for (const { sess } of rows) {
      expect(['cookie', 'accountId', 'authVersion', 'startedAt', 'csrfToken']).toEqual(expect.arrayContaining(Object.keys(sess)));
      expect(JSON.stringify(sess)).not.toContain('@');
    }
  });
});

describe('production boot refusals (AC4, D7)', () => {
  let dir;
  beforeAll(() => { dir = mkdtempSync(join(tmpdir(), 'happihub-keyring-')); });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  const boot = (script, env) => {
    try {
      execFileSync('node', [script], { cwd: `${__dirname}/../..`, stdio: 'pipe', timeout: 20000,
        env: { PATH: process.env.PATH, NODE_ENV: 'production', SESSION_SECRET_PROD: 's'.repeat(40),
          APP_URL_PROD: 'https://happihub.example.org', ...env } });
      return '';
    } catch (error) { return error.stderr.toString(); }
  };

  test('API, maintenance and migrations refuse a remote URL without sslmode=verify-full', () => {
    const file = join(dir, 'keyring.json');
    writeFileSync(file, JSON.stringify(testKeyring()), { mode: 0o400 });
    const env = { FIELD_KEYRING_FILE_PROD: file, DATABASE_URL_PROD: 'postgres://u:p@db.example.net:5432/happihub?sslmode=require' };
    for (const script of ['server.js', 'jobs/runMaintenance.js', 'jobs/migrate.js', 'jobs/runReencrypt.js'])
      expect(boot(script, env)).toContain('A remote database requires sslmode=verify-full in production');
  });

  test('the API refuses to start without a valid keyring', () => {
    const invalid = join(dir, 'invalid.json');
    writeFileSync(invalid, JSON.stringify({ ...testKeyring(), active: 'missing' }), { mode: 0o400 });
    const env = { DATABASE_URL_PROD: 'postgres://u:p@127.0.0.1:1/happihub' };
    expect(boot('server.js', env)).toContain('FIELD_KEYRING_FILE_PROD is not configured');
    expect(boot('server.js', { ...env, FIELD_KEYRING_FILE_PROD: invalid })).toContain('Field keyring is invalid');
  });
});
