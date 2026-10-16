import { browser, sessionId, buildApp, createPool, lastEmail, migrate, PASSWORD, resetData, signUpVerified } from './harness.js';

let pool, app, clock;
beforeAll(() => { migrate(); pool = createPool(); });
beforeEach(async () => { await resetData(pool); ({ app, clock } = buildApp(pool)); });
afterAll(() => pool.end());

const count = async (table) => (await pool.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n;

describe('UC1 sign-up (AC1, AC2)', () => {
  test('creates account, association with readable slug and membership; no session yet', async () => {
    const client = await browser(app);
    const response = await client.post('/api/signup', { email: 'Claire@Example.org', password: PASSWORD, associationName: 'Les Tréteaux' });
    expect(response.status).toBe(202);
    expect(sessionId(response)).toBe(client.state.sessionId);
    const { rows: [association] } = await pool.query('SELECT slug FROM association');
    expect(association.slug).toBe('les-treteaux');
    expect(await count('membership')).toBe(1);
    expect((await pool.query('SELECT email FROM account')).rows[0].email).toBe('claire@example.org');
    expect((await client.get('/api/account')).status).toBe(401);
    const email = await lastEmail(pool, 'claire@example.org', 'VERIFY');
    expect(email.payload.link).toMatch(/^http:\/\/localhost:3000\/verify-email#[A-Za-z0-9_-]{43}$/);
  });

  test('a failure inside the transaction leaves nothing behind', async () => {
    await pool.query("INSERT INTO account (email, password_hash) VALUES ('blocker@example.org', 'x')");
    // Force the association insert to fail after the account insert.
    await pool.query('ALTER TABLE association ADD CONSTRAINT test_block CHECK (name <> $$Boom$$)');
    try {
      const client = await browser(app);
      expect((await client.post('/api/signup', { email: 'new@example.org', password: PASSWORD, associationName: 'Boom' })).status).toBe(500);
      expect(await count('account')).toBe(1);
      expect(await count('association')).toBe(0);
      expect(await count('outbox_message')).toBe(0);
    } finally { await pool.query('ALTER TABLE association DROP CONSTRAINT test_block'); }
  });

  test('an existing email gets the same answer, no cookie, and only ACCOUNT_EXISTS', async () => {
    const first = await browser(app);
    const fresh = await first.post('/api/signup', { email: 'a@example.org', password: PASSWORD, associationName: 'Alpha' });
    const second = await browser(app);
    const existing = await second.post('/api/signup', { email: 'a@example.org', password: PASSWORD, associationName: 'Beta' });
    expect(existing.status).toBe(fresh.status);
    expect(existing.body).toEqual({ ...fresh.body, similarAssociation: false });
    expect(sessionId(existing)).toBe(second.state.sessionId);
    expect((await pool.query("SELECT 1 FROM session WHERE sess->>'accountId' IS NOT NULL")).rows).toHaveLength(0);
    expect(await count('association')).toBe(1);
    expect((await lastEmail(pool, 'a@example.org', 'ACCOUNT_EXISTS')).payload.resetLink).toBe('http://localhost:3000/forgot-password');
  });

  test('a similar name warns and gets a suffix', async () => {
    await signUpVerified(app, pool, 'one@example.org', 'Les Tréteaux');
    const client = await browser(app);
    const response = await client.post('/api/signup', { email: 'two@example.org', password: PASSWORD, associationName: 'Les treteaux' });
    expect(response.body.similarAssociation).toBe(true);
    expect((await pool.query('SELECT slug FROM association ORDER BY created_at')).rows.map((r) => r.slug))
      .toEqual(['les-treteaux', 'les-treteaux-2']);
  });

  test('password policy A2 and invalid input answer 400 with a hint', async () => {
    const client = await browser(app);
    const response = await client.post('/api/signup', { email: 'x@example.org', password: 'short', associationName: 'X Y' });
    expect(response.status).toBe(400);
    expect(response.body.hint).toMatch(/15 to 64/);
    expect((await client.post('/api/signup', { email: 'x@example.org', password: 'passwordpassword', associationName: 'X Y' })).status).toBe(400);
  });

  test('AC3: a sixth association is refused even after closing earlier ones', async () => {
    const client = await signUpVerified(app, pool, 'c@example.org', 'Assoc 1');
    for (const n of [2, 3, 4, 5]) expect((await client.post('/api/associations', { name: `Assoc ${n}` })).status).toBe(201);
    expect((await client.post('/api/associations/assoc-5/close', { confirm: true })).status).toBe(204);
    const refused = await client.post('/api/associations', { name: 'Assoc 6' });
    expect(refused.status).toBe(409);
  });
});

describe('UC2 verification (AC4, N1)', () => {
  test('the link signs the new user in once; reuse changes nothing', async () => {
    const client = await browser(app);
    await client.post('/api/signup', { email: 'v@example.org', password: PASSWORD, associationName: 'Verif' });
    const { token } = await lastEmail(pool, 'v@example.org', 'VERIFY');
    const verified = client.adopt(await client.post('/api/email-verification', { token }));
    expect(verified.status).toBe(200);
    expect(verified.body.signUpVerification).toBe(true);
    const account = await client.get('/api/account');
    expect(account.body.emailVerified).toBe(true);
    expect((await client.post('/api/email-verification', { token })).status).toBe(410);
  });

  test('expired and unknown tokens change nothing', async () => {
    const client = await browser(app);
    await client.post('/api/signup', { email: 'e@example.org', password: PASSWORD, associationName: 'Expire' });
    const { token } = await lastEmail(pool, 'e@example.org', 'VERIFY');
    clock.now += 24 * 3600e3 + 1;
    const later = await browser(app);
    expect((await later.post('/api/email-verification', { token })).status).toBe(410);
    expect((await later.post('/api/email-verification', { token: 'x'.repeat(43) })).status).toBe(410);
    expect((await later.post('/api/email-verification', { token: 'not a token' })).status).toBe(410);
    expect((await pool.query('SELECT email_verified_at FROM account')).rows[0].email_verified_at).toBeNull();
  });

  test('resend is neutral and issues a new link for unverified accounts only', async () => {
    const client = await browser(app);
    await client.post('/api/signup', { email: 'r@example.org', password: PASSWORD, associationName: 'Resend' });
    const before = await lastEmail(pool, 'r@example.org', 'VERIFY');
    clock.now += 1000;
    const known = await client.post('/api/email-verification/resend', { email: 'r@example.org' });
    const unknown = await client.post('/api/email-verification/resend', { email: 'nobody@example.org' });
    expect([known.status, unknown.status]).toEqual([202, 202]);
    expect(known.body).toEqual(unknown.body);
    const after = await lastEmail(pool, 'r@example.org', 'VERIFY');
    expect(after.token).not.toBe(before.token);
    expect((await client.post('/api/email-verification', { token: before.token })).status).toBe(410);
  });
});

describe('sign-in and sessions (AC14)', () => {
  test('sign-in stores the session in PostgreSQL and sign-out deletes the row', async () => {
    await signUpVerified(app, pool, 's@example.org');
    await pool.query('DELETE FROM session');
    const client = await browser(app);
    const signedIn = client.adopt(await client.post('/api/session', { email: 'S@example.org', password: PASSWORD }));
    expect(signedIn.status).toBe(200);
    expect(signedIn.body.account.associations).toHaveLength(1);
    const { rows } = await pool.query("SELECT sess FROM session WHERE sess->>'accountId' IS NOT NULL");
    expect(rows).toHaveLength(1);
    expect((await client.del('/api/session')).status).toBe(204);
    expect((await pool.query("SELECT 1 FROM session WHERE sess->>'accountId' IS NOT NULL")).rows).toHaveLength(0);
  });

  test('wrong credentials are neutral', async () => {
    await signUpVerified(app, pool, 'n@example.org');
    const client = await browser(app);
    const wrong = await client.post('/api/session', { email: 'n@example.org', password: 'wrong password here' });
    const unknown = await client.post('/api/session', { email: 'ghost@example.org', password: 'wrong password here' });
    expect([wrong.status, unknown.status]).toEqual([401, 401]);
    expect(wrong.body).toEqual(unknown.body);
  });

  test('the 8 h absolute cap ends the session even when active', async () => {
    const client = await signUpVerified(app, pool, 'cap@example.org');
    for (let i = 0; i < 17; i += 1) { clock.now += 29 * 60e3; await client.get('/api/account'); }
    expect((await client.get('/api/account')).status).toBe(401);
  });

  test('a store outage fails closed', async () => {
    const client = await signUpVerified(app, pool, 'down@example.org');
    await pool.query('ALTER TABLE session RENAME TO session_offline');
    try { expect((await client.get('/api/account')).status).toBe(503); }
    finally { await pool.query('ALTER TABLE session_offline RENAME TO session'); }
  });
});

describe('UC3 reset (AC5)', () => {
  test('answers neutrally, replaces the hash, revokes other sessions and signs in', async () => {
    const other = await signUpVerified(app, pool, 'p@example.org');
    const client = await browser(app);
    const known = await client.post('/api/password-reset', { email: 'p@example.org' });
    const unknown = await client.post('/api/password-reset', { email: 'ghost@example.org' });
    expect(known.status).toBe(202); expect(known.body).toEqual(unknown.body);
    const { token } = await lastEmail(pool, 'p@example.org', 'RESET');
    expect((await lastEmail(pool, 'p@example.org', 'RESET')).payload.link).toContain('/reset-password#');
    const confirmed = client.adopt(await client.post('/api/password-reset/confirm', { token, password: 'a brand new sentence here' }));
    expect(confirmed.status).toBe(200);
    expect((await client.get('/api/account')).status).toBe(200);
    expect((await other.get('/api/account')).status).toBe(401);
    expect((await pool.query('SELECT auth_version FROM account')).rows[0].auth_version).toBe(1);
    expect((await client.post('/api/password-reset/confirm', { token, password: 'another long sentence ok' })).status).toBe(410);
    const signIn = await (await browser(app)).post('/api/session', { email: 'p@example.org', password: 'a brand new sentence here' });
    expect(signIn.status).toBe(200);
  });

  test('a reset link expires after 1 h', async () => {
    await signUpVerified(app, pool, 'old@example.org');
    const client = await browser(app);
    await client.post('/api/password-reset', { email: 'old@example.org' });
    const { token } = await lastEmail(pool, 'old@example.org', 'RESET');
    clock.now += 3600e3 + 1;
    expect((await (await browser(app)).post('/api/password-reset/confirm', { token, password: 'a brand new sentence here' })).status).toBe(410);
  });
});

describe('UC4 account update (AC6)', () => {
  test('display name needs no password; email and password need the current one', async () => {
    const client = await signUpVerified(app, pool, 'u@example.org');
    expect((await client.patch('/api/account', { displayName: 'Claire' })).body.displayName).toBe('Claire');
    expect((await client.patch('/api/account', { email: 'new@example.org' })).status).toBe(403);
    expect((await client.patch('/api/account', { newPassword: 'a brand new sentence here', currentPassword: 'wrong one' })).status).toBe(403);
  });

  test('a new email stays pending until verified and the old address is notified', async () => {
    const client = await signUpVerified(app, pool, 'old-mail@example.org');
    const updated = await client.patch('/api/account', { email: 'new-mail@example.org', currentPassword: PASSWORD });
    expect(updated.body).toMatchObject({ email: 'old-mail@example.org', pendingEmail: 'new-mail@example.org' });
    expect(await lastEmail(pool, 'old-mail@example.org', 'EMAIL_CHANGE_NOTICE')).toBeDefined();
    const { token } = await lastEmail(pool, 'new-mail@example.org', 'VERIFY');
    const verified = await client.post('/api/email-verification', { token });
    expect(verified.body.signUpVerification).toBe(false);
    expect((await client.get('/api/account')).body).toMatchObject({ email: 'new-mail@example.org', pendingEmail: null });
  });

  test('an existing email is never taken and nothing is sent to it', async () => {
    await signUpVerified(app, pool, 'taken@example.org', 'Taken');
    const client = await signUpVerified(app, pool, 'mover@example.org', 'Mover');
    const updated = await client.patch('/api/account', { email: 'taken@example.org', currentPassword: PASSWORD });
    expect(updated.status).toBe(200);
    const { rows } = await pool.query("SELECT count(*)::int AS n FROM outbox_message WHERE recipient = 'taken@example.org' AND template = 'VERIFY'");
    expect(rows[0].n).toBe(1); // only the sign-up email of the existing account
    expect((await client.get('/api/account')).body.email).toBe('mover@example.org');
  });

  test('a password change keeps this session and revokes the others', async () => {
    const client = await signUpVerified(app, pool, 'pw@example.org');
    const other = await browser(app);
    other.adopt(await other.post('/api/session', { email: 'pw@example.org', password: PASSWORD }));
    expect((await client.patch('/api/account', { newPassword: 'a brand new sentence here', currentPassword: PASSWORD })).status).toBe(200);
    expect((await client.get('/api/account')).status).toBe(200);
    expect((await other.get('/api/account')).status).toBe(401);
  });

  test('AC17: wrong current password is limited to 5 per 15 min with Retry-After', async () => {
    const client = await signUpVerified(app, pool, 'limit@example.org');
    for (let i = 0; i < 5; i += 1) expect((await client.patch('/api/account', { email: 'z@example.org', currentPassword: 'nope' })).status).toBe(403);
    const limited = await client.patch('/api/account', { email: 'z@example.org', currentPassword: PASSWORD });
    expect(limited.status).toBe(429);
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
  });
});

describe('UC5 export (AC7)', () => {
  test('contains only the requester data and is limited to 3 per day', async () => {
    const client = await signUpVerified(app, pool, 'me@example.org', 'Mine');
    await signUpVerified(app, pool, 'other@example.org', 'Theirs');
    const response = await client.get('/api/account/export');
    expect(response.headers['content-disposition']).toMatch(/attachment/);
    expect(JSON.stringify(response.body)).not.toMatch(/other@example\.org|theirs/);
    expect(response.body.memberships.map((m) => m.slug)).toEqual(['mine']);
    expect(response.body.activity[0]).toMatchObject({ association: 'mine', action: 'ASSOCIATION_CREATED' });
    expect(response.body.account).not.toHaveProperty('passwordHash');
    await client.get('/api/account/export'); await client.get('/api/account/export');
    const limited = await client.get('/api/account/export');
    expect(limited.status).toBe(429);
    expect(limited.headers['retry-after']).toBeDefined();
  });
});

describe('UC6 deletion (AC8)', () => {
  test('requires password and confirmation', async () => {
    const client = await signUpVerified(app, pool, 'd@example.org');
    expect((await client.del('/api/account', { password: PASSWORD })).status).toBe(400);
    expect((await client.del('/api/account', { password: 'wrong', confirm: true })).status).toBe(403);
  });

  test('closes sole-member associations, purges emails and invitations, keeps activity anonymised', async () => {
    const client = await signUpVerified(app, pool, 'gone@example.org', 'Solo');
    const invitee = await signUpVerified(app, pool, 'host@example.org', 'Host');
    await invitee.post('/api/associations/host/invitations', { email: 'gone@example.org' });
    expect((await client.get('/api/account')).body.soleMemberOf).toEqual([{ name: 'Solo', slug: 'solo' }]);
    expect((await client.del('/api/account', { password: PASSWORD, confirm: true })).status).toBe(204);
    expect((await pool.query("SELECT status FROM association WHERE slug = 'solo'")).rows[0].status).toBe('CLOSED');
    expect((await pool.query("SELECT 1 FROM invitation WHERE email = 'gone@example.org'")).rows).toHaveLength(0);
    expect((await pool.query("SELECT 1 FROM outbox_message WHERE recipient = 'gone@example.org'")).rows).toHaveLength(0);
    const { rows } = await pool.query("SELECT actor_id FROM activity_entry e JOIN association a ON a.id = e.association_id WHERE a.slug = 'solo'");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.actor_id === null)).toBe(true);
    expect((await client.get('/api/account')).status).toBe(401);
  });

  test('the last super administrator cannot delete their account', async () => {
    const client = await signUpVerified(app, pool, 'root@example.org');
    await pool.query("UPDATE account SET platform_role = 'SUPER_ADMIN'");
    expect((await client.del('/api/account', { password: PASSWORD, confirm: true })).status).toBe(409);
  });
});

describe('quotas (AC17)', () => {
  test('sign-up is limited to 5 per hour per IP', async () => {
    const client = await browser(app);
    for (let i = 0; i < 5; i += 1) await client.post('/api/signup', { email: `q${i}@example.org`, password: PASSWORD, associationName: `Q ${i}` });
    const limited = await client.post('/api/signup', { email: 'q9@example.org', password: PASSWORD, associationName: 'Q 9' });
    expect(limited.status).toBe(429);
    expect(limited.headers['retry-after']).toBeDefined();
  });

  test('sign-in failures are limited per (email, IP) pair', async () => {
    const client = await browser(app);
    for (let i = 0; i < 5; i += 1) await client.post('/api/session', { email: 'x@example.org', password: 'wrong password' });
    expect((await client.post('/api/session', { email: 'x@example.org', password: 'wrong password' })).status).toBe(429);
  });

  test('reset emails: 5 per hour per IP', async () => {
    const client = await browser(app);
    for (let i = 0; i < 5; i += 1) await client.post('/api/password-reset', { email: `r${i}@example.org` });
    expect((await client.post('/api/password-reset', { email: 'r9@example.org' })).status).toBe(429);
  });

  test('per-recipient cap answers neutrally and sends nothing beyond 10 per hour', async () => {
    ({ app } = buildApp(pool, clock, { trustedProxy: '127.0.0.1' }));
    await signUpVerified(app, pool, 'victim@example.org');
    for (let i = 0; i < 12; i += 1) {
      const response = await (await browser(app)).post('/api/password-reset', { email: 'victim@example.org' })
        .set('X-Forwarded-For', `203.0.113.${i + 1}`);
      expect(response.status).toBe(202);
    }
    const { rows } = await pool.query("SELECT count(*)::int AS n FROM outbox_message WHERE recipient = 'victim@example.org' AND template IN ('VERIFY', 'RESET')");
    expect(rows[0].n).toBe(10); // 1 sign-up verification + 9 resets, then silently capped
  });
});
