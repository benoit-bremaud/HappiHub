import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { seedDemo } from '../../jobs/seedDemo.js';
import { DEMO_ACCOUNTS } from '../../seed/demoDataset.js';
import { bidx, browser, buildApp, createPool, migrate, resetData } from './harness.js';

// Demo seed of the test-environment spec (#251): AC1, AC2, AC4, AC5 (API part), AC7, AC8, G1–G5.
const migrationsDir = `${__dirname}/../../migrations`;
let pool, app, clock, credentialsFile;
beforeAll(() => { migrate(); pool = createPool(); });
beforeEach(async () => {
  await resetData(pool);
  ({ app, clock } = buildApp(pool));
  credentialsFile = join(mkdtempSync(join(tmpdir(), 'happihub-seed-')), '.demo-credentials.local.json');
});
afterAll(() => pool.end());

const seed = (options = {}) => {
  const { db, cipher, links, limits } = app.locals.ctx;
  return seedDemo({ db, cipher, links, limits }, { clock, credentialsFile, migrationsDir, ...options });
};
const count = async (table) => (await pool.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n;
const counts = async () => Object.fromEntries(await Promise.all(
  ['account', 'association', 'membership', 'event', 'invitation', 'outbox_message', 'activity_entry']
    .map(async (table) => [table, await count(table)])));
const passwords = () => Object.fromEntries(JSON.parse(readFileSync(credentialsFile, 'utf8')).accounts
  .map(({ key, password }) => [key, password]));
const email = (key) => DEMO_ACCOUNTS.find((a) => a.key === key).email;
const eventByTitle = async (title) => (await pool.query('SELECT * FROM event WHERE title = $1', [title])).rows[0];

const signIn = async (key) => {
  const client = await browser(app);
  const response = client.adopt(await client.post('/api/session', { email: email(key), password: passwords()[key] }));
  return { client, status: response.status };
};

describe('demo seed (AC1, AC4, AC7)', () => {
  test('creates personas, associations, events and a 0600 credentials file', async () => {
    const tally = await seed();
    expect(tally).toEqual({ created: 38, updated: 0, unchanged: 0 });
    expect(statSync(credentialsFile).mode & 0o777).toBe(0o600);
    expect(Object.keys(passwords())).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']);
    expect(Object.values(passwords()).every((p) => p.length >= 20)).toBe(true);

    const { rows: accounts } = await pool.query(
      'SELECT email_verified_at, pending_email_enc, platform_role, associations_created FROM account WHERE email_bidx = $1',
      [bidx(email('P5'))]);
    expect(accounts[0].email_verified_at).toBeNull();
    const role = await pool.query('SELECT platform_role FROM account WHERE email_bidx = $1', [bidx(email('P7'))]);
    expect(role.rows[0].platform_role).toBe('MODERATOR');
    const marc = await pool.query('SELECT associations_created FROM account WHERE email_bidx = $1', [bidx(email('P8'))]);
    expect(marc.rows[0].associations_created).toBe(5);
    const paul = await pool.query('SELECT pending_email_bidx FROM account WHERE email_bidx = $1', [bidx(email('P6'))]);
    expect(paul.rows[0].pending_email_bidx).toEqual(bidx('paul.new@demo.example.com'));

    const statuses = Object.fromEntries((await pool.query(
      "SELECT name, status FROM association WHERE name LIKE 'Demo %'")).rows.map((r) => [r.name, r.status]));
    expect(statuses).toMatchObject({ 'Demo Tréteaux du Quartier': 'ACTIVE', 'Demo Chorale du Canal': 'ACTIVE',
      'Demo Atelier fermé': 'CLOSED', 'Demo Marc 5': 'ACTIVE' });
    expect(await count('invitation')).toBe(1);

    expect(await count('event')).toBe(20);
    expect(await eventByTitle('Brouillon minimal')).toMatchObject({ status: 'DRAFT' });
    expect((await eventByTitle('Ancien brouillon oublié')).cleanup_notice_at).not.toBeNull();
    expect(await eventByTitle('Exposition terminée')).toMatchObject({ status: 'ARCHIVED' });
    expect(await eventByTitle('Concert commencé avant-hier')).toMatchObject({ status: 'PUBLISHED', ends_at: null });
    expect(await eventByTitle('Projection annulée')).toMatchObject({ status: 'CANCELLED' });
    expect((await eventByTitle('Projection annulée')).cancellation_reason).toHaveLength(500);
    expect(await eventByTitle('Spectacle masqué par la modération')).toMatchObject({ hidden_by_moderation: true });
    const moved = await eventByTitle('Concert déplacé');
    expect(moved.schedule_changed_at).not.toBeNull();
    expect(moved.version).toBeGreaterThan(2);
    const { rows: [longest] } = await pool.query('SELECT max(length(title))::int AS n FROM event');
    expect(longest.n).toBe(120);
    expect((await pool.query("SELECT 1 FROM event WHERE venue_normalized_city = '2A004'")).rows).toHaveLength(1);

    const outbox = (await pool.query('SELECT failed_at, recipient_bidx FROM outbox_message')).rows;
    expect(outbox.filter((r) => r.failed_at)).toEqual([expect.objectContaining({ recipient_bidx: bidx(email('P4')) })]);
    expect(outbox.filter((r) => !r.failed_at)).toEqual([expect.objectContaining({ recipient_bidx: bidx(email('P5')) })]);
  });

  test('stores no clear email in account, invitation or outbox_message (AC4)', async () => {
    await seed();
    const { rows } = await pool.query(`SELECT email_enc AS v FROM account UNION ALL SELECT pending_email_enc FROM account
      UNION ALL SELECT email_enc FROM invitation UNION ALL SELECT recipient_enc FROM outbox_message`);
    const values = rows.map((r) => r.v).filter(Boolean);
    expect(values).toHaveLength(12);
    expect(values.every((v) => v.startsWith('hh1.') && !v.includes('@'))).toBe(true);
  });
});

describe('demo seed reruns (AC2, AC8, D2)', () => {
  test('a second run creates nothing, keeps passwords and unrelated rows', async () => {
    await (await browser(app)).post('/api/signup', { email: 'dev@example.org', password: 'a developer own passphrase' });
    await seed();
    const before = await counts();
    const kept = passwords();
    const tally = await seed();
    expect(tally).toMatchObject({ created: 0, updated: 0 });
    expect(await counts()).toEqual(before);
    expect(passwords()).toEqual(kept);
    expect((await pool.query('SELECT 1 FROM account WHERE email_bidx = $1', [bidx('dev@example.org')])).rows).toHaveLength(1);
  });

  test('a rerun completes a half-built account, membership and event (D7)', async () => {
    await seed();
    const lea = bidx(email('P7'));
    await pool.query("UPDATE account SET platform_role = 'NONE', display_name_enc = NULL WHERE email_bidx = $1", [lea]);
    await pool.query('DELETE FROM membership WHERE account_id = (SELECT id FROM account WHERE email_bidx = $1)', [bidx(email('P2'))]);
    await pool.query("UPDATE event SET status = 'DRAFT', published_at = NULL WHERE title = 'Le Malade imaginaire'");
    await pool.query("UPDATE event SET hidden_by_moderation = false WHERE title = 'Spectacle masqué par la modération'");
    const tally = await seed();
    expect(tally).toMatchObject({ created: 1, updated: 3 });
    expect((await pool.query('SELECT platform_role, display_name_enc FROM account WHERE email_bidx = $1', [lea])).rows[0])
      .toMatchObject({ platform_role: 'MODERATOR', display_name_enc: expect.stringMatching(/^hh1\./) });
    expect(await eventByTitle('Le Malade imaginaire')).toMatchObject({ status: 'PUBLISHED' });
    expect(await eventByTitle('Spectacle masqué par la modération')).toMatchObject({ hidden_by_moderation: true });
    expect((await signIn('P2')).status).toBe(200);
  });

  test('--rotate-passwords replaces every password', async () => {
    await seed();
    const old = passwords();
    expect((await seed({ rotatePasswords: true })).updated).toBe(8);
    expect(Object.keys(old).every((key) => passwords()[key] !== old[key])).toBe(true);
    expect((await signIn('P1')).status).toBe(200);
  });

  test('--reset then reseed the same day stays under the event quota and keeps unrelated data', async () => {
    await (await browser(app)).post('/api/signup', { email: 'dev@example.org', password: 'a developer own passphrase' });
    await seed();
    clock.now += 3600e3;
    await expect(seed({ reset: true })).resolves.toMatchObject({ updated: 0 });
    expect(await count('event')).toBe(20);
    expect((await pool.query('SELECT 1 FROM account WHERE email_bidx = $1', [bidx('dev@example.org')])).rows).toHaveLength(1);
  });

  test('skips the outbox fixture when non-demo emails are pending (G4)', async () => {
    await (await browser(app)).post('/api/signup', { email: 'dev@example.org', password: 'a developer own passphrase' });
    const log = jest.fn();
    await seed({ log });
    expect(log).toHaveBeenCalledWith('outbox fixture skipped: non-demo emails are pending');
    expect((await pool.query('SELECT 1 FROM outbox_message WHERE failed_at IS NOT NULL')).rows).toHaveLength(0);
  });

  test('refuses an unmigrated schema level', async () => {
    const fake = mkdtempSync(join(tmpdir(), 'happihub-migrations-'));
    const real = readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).length;
    for (let n = 0; n <= real; n += 1) writeFileSync(join(fake, `${n}.sql`), '');
    await expect(seed({ migrationsDir: fake })).rejects.toThrow('npm run migrate');
  });
});

describe('demo accounts through the API (AC5)', () => {
  test('organizers sign in; Sofia cannot edit A1 events; visitors see only public events', async () => {
    await seed();
    const { client: claire, status } = await signIn('P1');
    expect(status).toBe(200);
    expect((await signIn('P2')).status).toBe(200);
    const { client: sofia } = await signIn('P3');
    expect((await signIn('P5')).status).toBe(401);
    const first = await eventByTitle('Le Malade imaginaire');
    expect((await sofia.patch(`/api/associations/demo-treteaux-du-quartier/events/${first.id}`,
      { baseVersion: first.version, changes: { title: 'Pris' } })).status).toBe(404);
    expect((await claire.get(`/api/associations/demo-treteaux-du-quartier/events/${first.id}`)).status).toBe(200);

    const visitor = await browser(app);
    expect((await visitor.get(`/api/events/${first.id}`)).status).toBe(200);
    for (const title of ['Brouillon minimal', 'Ancien brouillon oublié', 'Spectacle masqué par la modération'])
      expect((await visitor.get(`/api/events/${(await eventByTitle(title)).id}`)).status).toBe(404);
  });

  const runRefused = (args, env) => {
    let failure;
    try {
      execFileSync('node', ['jobs/runSeedDemo.js', ...args], { cwd: `${__dirname}/../..`, stdio: 'pipe',
        env: { PATH: process.env.PATH, DATABASE_URL_DEV: process.env.TEST_DATABASE_URL.replace(/\/[^/]+$/, '/x_demo'), ...env } });
    } catch (error) { failure = error; }
    return failure;
  };

  test.each([
    ['without --confirm', [], {}, '--confirm is required'],
    ['in production', ['--confirm'], { NODE_ENV: 'production' }, 'NODE_ENV must be unset or development'],
  ])('the runner refuses %s and writes nothing (AC3)', async (_, args, env, reason) => {
    const before = await counts();
    const failure = runRefused(args, env);
    expect(failure.status).toBe(1);
    expect(failure.stderr.toString()).toContain(reason);
    expect(await counts()).toEqual(before);
  });
});
