import request from 'supertest';
import { createApp } from '../../app.js';
import { createSessionStore } from '../../config/session.js';
import { accountId, bidx, browser, buildApp, cipher, config, createPool, lastEmail, migrate, origin, PASSWORD, resetData, signUpVerified }
  from './harness.js';

// Request-path branches not reached by the use-case suites: session bootstrap edge cases,
// the application error handlers, transport guards, validation refusals, state guards on
// closed associations and unreadable stored data. Only the clock and the failing database
// or store (boundaries) are replaced; every domain module is the real one.

let pool, app, clock;
beforeAll(() => { migrate(); pool = createPool(); });
beforeEach(async () => { await resetData(pool); ({ app, clock } = buildApp(pool)); });
afterAll(() => pool.end());


/** App over the real database and store, whose boundaries can be switched off per test. */
const flaky = () => {
  const down = { db: false, store: false };
  const db = { query: (...args) => (down.db ? Promise.reject(new Error('connection lost')) : pool.query(...args)),
    connect: (...args) => pool.connect(...args) };
  const store = createSessionStore(pool, () => {});
  const get = store.get.bind(store);
  store.get = (sid, callback) => (down.store ? callback(new Error('store down')) : get(sid, callback));
  return { app: createApp(config, { store, db, cipher, now: () => clock.now }), down };
};

describe('session bootstrap (UC1 anonymous visit, UC3 sign-in)', () => {
  test('a request with neither Origin nor Referer is refused with 403', async () => {
    const response = await request(app).get('/api/session');
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: 'Request origin rejected' });
  });

  test('a same-origin Referer is accepted when Origin is absent', async () => {
    const response = await request(app).get('/api/session').set('Referer', `${origin}/signin`);
    expect(response.status).toBe(200);
    expect(response.body.account).toBeNull();
    expect(response.body.csrfToken).toMatch(/^[a-f0-9]{64}$/);
  });

  test('a foreign Referer is refused with 403', async () => {
    const response = await request(app).get('/api/session').set('Referer', 'https://evil.example/page');
    expect(response.status).toBe(403);
  });

  test('a second anonymous visit keeps the same CSRF token', async () => {
    const client = await browser(app);
    const again = await client.get('/api/session');
    expect(again.status).toBe(200);
    expect(again.body).toEqual({ account: null, csrfToken: client.state.csrf });
  });

  test('a signed-in visit returns the account view with the session token', async () => {
    const client = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
    const response = await client.get('/api/session');
    expect(response.status).toBe(200);
    expect(response.body.csrfToken).toBe(client.state.csrf);
    expect(response.body.account).toMatchObject({ email: 'claire@example.org', emailVerified: true,
      associations: [expect.objectContaining({ slug: 'troupe' })], invitations: [] });
  });

  test('a session whose auth version moved on is replaced by an anonymous one', async () => {
    const client = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
    await pool.query('UPDATE account SET auth_version = auth_version + 1');
    const response = await client.get('/api/session');
    expect(response.status).toBe(200);
    expect(response.body.account).toBeNull();
    expect(response.body.csrfToken).toMatch(/^[a-f0-9]{64}$/);
    expect(response.body.csrfToken).not.toBe(client.state.csrf);
    expect((await client.get('/api/account')).status).toBe(401);
  });

  test('a session whose account no longer exists is replaced by an anonymous one', async () => {
    const client = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
    await pool.query('TRUNCATE account CASCADE');
    const response = await client.get('/api/session');
    expect(response.body.account).toBeNull();
    expect((await client.get('/api/account')).status).toBe(401);
  });

  test('an unavailable database answers 503 on the bootstrap of a signed-in session', async () => {
    const outage = flaky();
    const client = await signUpVerified(outage.app, pool, 'claire@example.org', 'Troupe');
    outage.down.db = true;
    const response = await client.get('/api/session');
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ message: 'Session unavailable' });
    outage.down.db = false;
    expect((await client.get('/api/session')).body.account).not.toBeNull();
  });
});

describe('application wiring and error handlers', () => {
  test.each([
    ['without a database pool', {}, 'Database pool is required'],
    ['without a field cipher', { db: {} }, 'Field cipher is required'],
  ])('createApp %s refuses to start', (_label, deps, message) => {
    expect(() => createApp(config, deps)).toThrow(message);
  });

  test('createApp falls back to the system clock when none is injected', async () => {
    const store = createSessionStore(pool, () => {});
    const defaultClockApp = createApp(config, { store, db: pool, cipher });
    const response = await request(defaultClockApp).get('/api/session').set('Origin', origin);
    expect(response.status).toBe(200);
    expect(response.body.csrfToken).toMatch(/^[a-f0-9]{64}$/);
  });

  test('a body over 100 kb is refused with 413 and the generic message', async () => {
    const client = await browser(app);
    const response = await client.post('/api/signup', { email: 'a@example.org', password: 'x'.repeat(120_000) });
    expect(response.status).toBe(413);
    expect(response.body).toEqual({ message: 'Invalid request' });
  });

  test('malformed JSON is refused with 400 and the generic message', async () => {
    const client = await browser(app);
    const response = await client.agent.post('/api/signup').set('Origin', origin).set('X-CSRF-Token', client.state.csrf)
      .set('Content-Type', 'application/json').send('{"email": ');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Invalid request' });
  });

  // Pins current behavior: the fix for #376 must update this test to expect the body-parser 415.
  test('any other failure while parsing answers a generic 500 that echoes nothing (#376)', async () => {
    const client = await browser(app);
    const response = await client.agent.post('/api/signup').set('Origin', origin).set('X-CSRF-Token', client.state.csrf)
      .set('Content-Type', 'application/json').set('Content-Encoding', 'br').send('{"email":"secret@example.org"}');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Server error' });
  });

  test('readiness is 200 with a database and 503 without one', async () => {
    expect((await request(app).get('/ready')).body).toEqual({ ready: true });
    const outage = flaky();
    outage.down.db = true;
    const response = await request(outage.app).get('/ready');
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ ready: false });
  });

  test('a failing session store answers 503 before any route runs', async () => {
    const outage = flaky();
    const client = await browser(outage.app);
    outage.down.store = true;
    const response = await client.get('/api/session');
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ message: 'Session unavailable' });
  });

  // Coverage of the limiter-key fallback; the limiter itself is exercised in accounts.test.js.
  test('a sign-in body without a string email is validated, not crashed on, by the limiter', async () => {
    const client = await browser(app);
    const missing = await client.post('/api/session', {});
    const numeric = await client.post('/api/session', { email: 42, password: PASSWORD });
    expect([missing.status, numeric.status]).toEqual([400, 400]);
  });
});

describe('transport guards on writes', () => {
  test('a non-empty body that is not JSON is refused with 415', async () => {
    const client = await browser(app);
    const response = await client.agent.post('/api/session').set('Origin', origin).set('X-CSRF-Token', client.state.csrf)
      .set('Content-Type', 'text/plain').send('email=a');
    expect(response.status).toBe(415);
    expect(response.body).toEqual({ message: 'JSON request required' });
  });
});

describe('request validation refusals', () => {
  test('a password reset confirmation without a password is 400 with the password hint', async () => {
    const client = await browser(app);
    const response = await client.post('/api/password-reset/confirm', { token: 'a'.repeat(43) });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: 'Invalid request', hint: expect.any(String) });
  });

  test('an invalid account update names the offending field', async () => {
    const claire = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
    const response = await claire.patch('/api/account', { email: 'not-an-email', currentPassword: PASSWORD });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: 'Invalid request', field: 'email' });
  });

  test('an empty display name clears the stored name', async () => {
    const claire = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
    await claire.patch('/api/account', { displayName: 'Claire' });
    const cleared = await claire.patch('/api/account', { displayName: '' });
    expect(cleared.status).toBe(200);
    expect(cleared.body.displayName).toBeNull();
    expect((await pool.query('SELECT display_name_enc FROM account')).rows[0].display_name_enc).toBeNull();
  });

  test('creating an association without a name is 400', async () => {
    const claire = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
    const response = await claire.post('/api/associations', {});
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: 'Invalid request', field: 'name' });
  });

  test('an association name without letters still gets the fallback slug', async () => {
    const claire = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
    const response = await claire.post('/api/associations', { name: '!!' });
    expect(response.status).toBe(201);
    expect(response.body.slug).toBe('association');
  });
});

describe('email change confirmation (UC4)', () => {
  test('a pending address taken in the meantime makes the link expire and keeps the current address', async () => {
    const claire = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
    await claire.patch('/api/account', { email: 'new@example.org', currentPassword: PASSWORD });
    const { token } = await lastEmail(pool, 'new@example.org', 'VERIFY');
    const rival = await browser(app);
    await rival.post('/api/signup', { email: 'new@example.org', password: PASSWORD, associationName: 'Rivals' });

    const response = await (await browser(app)).post('/api/email-verification', { token });

    expect(response.status).toBe(410);
    expect((await pool.query('SELECT count(*)::int AS n FROM account WHERE email_bidx = $1', [bidx('new@example.org')])).rows[0].n).toBe(1);
    const { rows: [account] } = await pool.query('SELECT email_bidx FROM account WHERE id = $1',
      [await accountId(pool, 'claire@example.org')]);
    expect(Buffer.compare(account.email_bidx, bidx('claire@example.org'))).toBe(0);
  });
});

// Known gap (production): verifyEmail clears the taken pending address, then throws, so the
// transaction rolls the clearing back and the stale pending change stays on the account.
// Tracked by #375: the clearing is rolled back with the 410.
test.todo('a pending address found taken at verification is cleared durably (#375)');

describe('invitation guards (UC10, UC11)', () => {
  const invite = async (claire, email = 'malik@example.org') => (await claire.post('/api/associations/troupe/invitations', { email })).body;

  test('resending an unknown invitation is 404', async () => {
    const claire = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
    const response = await claire.post('/api/associations/troupe/invitations/00000000-0000-4000-8000-000000000000/resend');
    expect(response.status).toBe(404);
  });

  test('a malformed token is the same 410 for lookup and accept', async () => {
    const claire = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
    const lookup = await (await browser(app)).post('/api/invitations/lookup', { token: 'not-a-token' });
    const accept = await claire.post('/api/invitations/accept', { token: 'not-a-token' });
    expect([lookup.status, accept.status]).toEqual([410, 410]);
    expect(lookup.body.message).toBe(accept.body.message);
  });

  test('inviting and resending on a closed association are refused with 409', async () => {
    const claire = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
    const { id } = await invite(claire);
    expect((await claire.post('/api/associations/troupe/close', { confirm: true })).status).toBe(204);
    const created = await claire.post('/api/associations/troupe/invitations', { email: 'other@example.org' });
    const resent = await claire.post(`/api/associations/troupe/invitations/${id}/resend`);
    expect([created.status, resent.status]).toEqual([409, 409]);
    expect(created.body.message).toBe('This association is closed.');
  });
});

describe('association and event state guards', () => {
  test('closing an association twice is refused with 409', async () => {
    const claire = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
    expect((await claire.post('/api/associations/troupe/close', { confirm: true })).status).toBe(204);
    const again = await claire.post('/api/associations/troupe/close', { confirm: true });
    expect(again.status).toBe(409);
    expect(again.body.message).toBe('This association is already closed.');
  });

  test('creating an event on a closed association is refused with 409 and writes nothing', async () => {
    const claire = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
    await claire.post('/api/associations/troupe/close', { confirm: true });
    const response = await claire.post('/api/associations/troupe/events', { title: 'Late', type: 'CONCERT' });
    expect(response.status).toBe(409);
    expect((await pool.query('SELECT count(*)::int AS n FROM event')).rows[0].n).toBe(0);
  });
});

describe('event field validation (UC15)', () => {
  const EVENTS = '/api/associations/troupe/events';

  test.each([
    ['a title without a type', { title: 'Concert' }, 'type'],
    ['a type without a title', { type: 'CONCERT' }, 'title'],
    ['a start that is not an ISO date', { title: 'Concert', type: 'CONCERT', startsAt: 'tomorrow' }, 'startsAt'],
    ['an impossible calendar date', { title: 'Concert', type: 'CONCERT', startsAt: '2030-02-30T10:00:00Z' }, 'startsAt'],
  ])('%s is 400 INVALID_FIELD', async (_label, body, field) => {
    const claire = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
    const response = await claire.post(EVENTS, body);
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'INVALID_FIELD', details: { field } });
  });

  test('a draft without a city has a null city in the member view', async () => {
    const claire = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
    const created = await claire.post(EVENTS, { title: 'Concert', type: 'CONCERT' });
    expect(created.status).toBe(201);
    const read = await claire.get(`${EVENTS}/${created.body.id}`);
    expect(read.body.venueCity).toBeNull();
  });
});

describe('commune search and city labels', () => {
  const search = async (q) => (await (await browser(app)).get(`/api/communes?q=${encodeURIComponent(q)}`)).body.communes;

  test('a five-character INSEE code returns exactly that commune', async () => {
    expect(await search('69123')).toEqual([{ code: '69123', name: 'Lyon', department: '69' }]);
  });

  test('a query that folds to nothing returns no commune', async () => {
    expect(await search('--')).toEqual([]);
  });

  test('the exact name comes before longer names sharing the prefix', async () => {
    const names = (await search('Aix')).map((commune) => commune.name);
    expect(names[0]).toBe('Aix');
    expect(names.length).toBeGreaterThan(1);
    expect(names.slice(1).every((name) => name.startsWith('Aix'))).toBe(true);
  });

  test('an agenda city outside the reference list is labelled by its own code', async () => {
    const claire = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
    await pool.query(
      `INSERT INTO event (association_id, type, title, short_description, status, starts_at, venue_label, venue_address,
         venue_normalized_city, published_at, created_by, last_edited_by)
       SELECT a.id, 'CONCERT', 'Odd', 'Short', 'PUBLISHED', $1, 'Hall', '1 rue Secrète', '99999', $1, m.account_id, m.account_id
       FROM association a JOIN membership m ON m.association_id = a.id`, [new Date(clock.now + 86_400_000)]);
    const cities = await (await browser(app)).get('/api/events/cities');
    expect(cities.body).toEqual(expect.arrayContaining([{ code: '99999', name: '99999' }]));
    const { rows: [{ id }] } = await pool.query('SELECT id FROM event');
    const mine = await claire.get(`/api/associations/troupe/events/${id}`);
    expect(mine.body.venueCity).toEqual({ code: '99999', name: null });
  });
});

describe('unreadable stored data is never echoed (field encryption, real flows)', () => {
  const sign = async () => signUpVerified(app, pool, 'claire@example.org', 'Troupe');
  const valid = (kid) => `hh1.${kid}.${Buffer.alloc(40, 7).toString('base64url')}`;

  test.each([
    ['not an envelope', 'garbage'],
    ['too short a payload', 'hh1.k1.AAAA'],
    ['an unknown key id', valid('zz')],
    ['a payload failing authentication', valid('k1')],
  ])('a display name stored as %s answers 503 without leaking it', async (_label, stored) => {
    const claire = await sign();
    await pool.query('UPDATE account SET display_name_enc = $1', [stored]);
    const response = await claire.get('/api/account');
    expect(response.status).toBe(503);
    expect(JSON.stringify(response.body)).not.toContain(stored);
  });

  test('an envelope copied to another column fails authentication', async () => {
    const claire = await sign();
    await pool.query('UPDATE account SET display_name_enc = email_enc');
    expect((await claire.get('/api/account')).status).toBe(503);
  });
});
