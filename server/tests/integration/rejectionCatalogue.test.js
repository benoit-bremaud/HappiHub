import { browser, buildApp, createPool, lastEmail, migrate, origin, PASSWORD, resetData, signUpVerified } from './harness.js';

// Rejection catalogue of the test-environment spec § 5 (D4, AC6): one test per case id, run on
// the disposable database. The same list is the manual QA checklist on the demo database.
const DAY = 24 * 3600e3;
const NEUTRAL = 'Invalid email or password, or email not verified yet.';
const EVENTS = '/api/associations/troupe/events';
let pool, app, clock;
beforeAll(() => { migrate(); pool = createPool(); });
beforeEach(async () => { await resetData(pool); ({ app, clock } = buildApp(pool)); });
afterAll(() => pool.end());

const signIn = async (email, password) => (await browser(app)).post('/api/session', { email, password });
const claire = () => signUpVerified(app, pool, 'claire@example.org', 'Troupe');
const complete = (overrides = {}) => ({ title: 'Le Malade imaginaire', type: 'THEATRE', shortDescription: 'Comédie',
  startsAt: new Date(clock.now + 7 * DAY).toISOString(), venueLabel: 'Salle des fêtes', venueCity: '75056',
  priceKind: 'FREE', posterStyle: 'classic', ...overrides });
const draft = async (client, body = complete()) => (await client.post(EVENTS, body)).body;

describe('sign-in and session (R-AUTH)', () => {
  test('R-AUTH-1/2: wrong password and unknown email get the same neutral 401', async () => {
    await claire();
    const wrong = await signIn('claire@example.org', 'not the right passphrase');
    const unknown = await signIn('nobody@example.org', PASSWORD);
    expect([wrong.status, unknown.status]).toEqual([401, 401]);
    expect(wrong.body).toEqual({ message: NEUTRAL });
    expect(unknown.body).toEqual(wrong.body);
  });

  test('R-AUTH-3: email case and spaces are folded', async () => {
    await claire();
    expect((await signIn('  Claire@EXAMPLE.org ', PASSWORD)).status).toBe(200);
  });

  test('R-AUTH-4: the sixth failure for one email and IP in 15 minutes is 429', async () => {
    await claire();
    for (let n = 0; n < 5; n += 1) expect((await signIn('claire@example.org', `wrong passphrase ${n}`)).status).toBe(401);
    expect((await signIn('claire@example.org', PASSWORD)).status).toBe(429);
  });

  test('R-AUTH-5: empty or 1025-character password is 400; a body over 100 kB is 413', async () => {
    expect((await signIn('claire@example.org', '')).status).toBe(400);
    expect((await signIn('claire@example.org', 'x'.repeat(1025))).status).toBe(400);
    expect((await signIn('claire@example.org', 'x'.repeat(101 * 1024))).status).toBe(413);
  });

  test('R-AUTH-6/6b: an unverified account gets the neutral 401; resend answers 202', async () => {
    const client = await browser(app);
    await client.post('/api/signup', { email: 'nora@example.org', password: PASSWORD });
    const refused = await signIn('nora@example.org', PASSWORD);
    expect(refused.status).toBe(401);
    expect(refused.body).toEqual({ message: NEUTRAL });
    expect((await client.post('/api/email-verification/resend', { email: 'nora@example.org' })).status).toBe(202);
  });

  test('R-AUTH-7: a write without CSRF token or with a foreign Origin is 403', async () => {
    const client = await claire();
    expect((await client.agent.patch('/api/account').set('Origin', origin).send({ displayName: 'C' })).status).toBe(403);
    expect((await client.agent.patch('/api/account').set('Origin', 'https://evil.example')
      .set('X-CSRF-Token', client.state.csrf).send({ displayName: 'C' })).status).toBe(403);
  });

  test('R-AUTH-8: a wrong current password is 403 without change; the sixth attempt is 429', async () => {
    const client = await claire();
    const change = (currentPassword) => client.patch('/api/account',
      { currentPassword, newPassword: 'a brand new quiet passphrase' });
    for (let n = 0; n < 5; n += 1) expect((await change(`wrong passphrase ${n}`)).status).toBe(403);
    expect((await change(PASSWORD)).status).toBe(429);
    expect((await signIn('claire@example.org', PASSWORD)).status).toBe(200);
  });
});

describe('signup (R-SIGN)', () => {
  test('R-SIGN-1: an existing email gets the new-signup answer and an ACCOUNT_EXISTS email', async () => {
    await claire();
    const fresh = await (await browser(app)).post('/api/signup', { email: 'new@example.org', password: PASSWORD });
    const existing = await (await browser(app)).post('/api/signup', { email: 'claire@example.org', password: PASSWORD });
    expect(existing.status).toBe(fresh.status);
    expect(existing.body).toEqual(fresh.body);
    expect(await lastEmail(pool, 'claire@example.org', 'ACCOUNT_EXISTS')).toBeTruthy();
  });

  test.each([
    ['14 characters', 'fourteen chars'],
    ['65 characters', 'x'.repeat(65)],
    ['over 72 bytes', 'é'.repeat(37)],
    ['a blocklisted password', 'passwordpassword'],
  ])('R-SIGN-2: %s is 400 with field and hint', async (_, password) => {
    const response = await (await browser(app)).post('/api/signup', { email: 'new@example.org', password });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ field: 'password', hint: expect.any(String) });
  });
});

describe('events (R-EVT)', () => {
  test.each([
    ['R-EVT-1 empty title', { title: '' }, 'title'],
    ['R-EVT-1 121-character title', { title: 'x'.repeat(121) }, 'title'],
    ['R-EVT-4 zero amount', { priceKind: 'AMOUNT', priceAmountCents: 0 }, 'priceAmountCents'],
    ['R-EVT-4 negative amount', { priceKind: 'AMOUNT', priceAmountCents: -100 }, 'priceAmountCents'],
    ['R-EVT-5 malformed city code', { venueCity: 'ABCDE' }, 'venueCity'],
    ['R-EVT-5 code that is no commune', { venueCity: '99999' }, 'venueCity'],
  ])('%s is 400 INVALID_FIELD', async (_, override, field) => {
    const response = await (await claire()).post(EVENTS, complete(override));
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'INVALID_FIELD', details: { field } });
  });

  test('R-EVT-2: an end before the start is 400', async () => {
    const response = await (await claire()).post(EVENTS, complete({ endsAt: new Date(clock.now + DAY).toISOString() }));
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'INVALID_FIELD', details: { field: 'endsAt' } });
  });

  test('R-EVT-3: publishing an incomplete draft or a past start is 422 PUBLICATION_REFUSED', async () => {
    const client = await claire();
    const incomplete = await draft(client, { title: 'Brouillon', type: 'TALK' });
    const missing = await client.post(`${EVENTS}/${incomplete.id}/publish`, { baseVersion: 1 });
    expect(missing.status).toBe(422);
    expect(missing.body.details.failures).toEqual(expect.arrayContaining(['MISSING_FIELD:venueLabel', 'MISSING_FIELD:venueCity']));
    const past = await draft(client, complete({ startsAt: new Date(clock.now - DAY).toISOString() }));
    const late = await client.post(`${EVENTS}/${past.id}/publish`, { baseVersion: 1 });
    expect(late.status).toBe(422);
    expect(late.body).toMatchObject({ code: 'PUBLICATION_REFUSED', details: { failures: ['START_IN_PAST'] } });
  });

  test('R-EVT-6: a stale version on publish or cancel is 409 STALE_VERSION', async () => {
    const client = await claire();
    const event = await draft(client);
    await client.patch(`${EVENTS}/${event.id}`, { baseVersion: 1, changes: { title: 'Renamed' } });
    expect((await client.post(`${EVENTS}/${event.id}/publish`, { baseVersion: 1 })).body.code).toBe('STALE_VERSION');
    await client.post(`${EVENTS}/${event.id}/publish`, { baseVersion: 2 });
    const cancel = await client.post(`${EVENTS}/${event.id}/cancel`, { baseVersion: 2, confirm: true });
    expect(cancel.status).toBe(409);
    expect(cancel.body.code).toBe('STALE_VERSION');
  });

  test('R-EVT-6b: a stale base is 409 EDIT_CONFLICT; a stale edit without base is 400 BASE_REQUIRED', async () => {
    const client = await claire();
    const event = await draft(client);
    await client.patch(`${EVENTS}/${event.id}`, { baseVersion: 1, changes: { title: 'Theirs' } });
    const conflict = await client.patch(`${EVENTS}/${event.id}`,
      { baseVersion: 1, changes: { title: 'Mine' }, base: { title: 'Le Malade imaginaire' } });
    expect(conflict.status).toBe(409);
    expect(conflict.body.code).toBe('EDIT_CONFLICT');
    const noBase = await client.patch(`${EVENTS}/${event.id}`, { baseVersion: 1, changes: { title: 'Mine' } });
    expect(noBase.status).toBe(400);
    expect(noBase.body.code).toBe('BASE_REQUIRED');
  });

  test('R-EVT-7: a member of another association gets 404 without data', async () => {
    const event = await draft(await claire());
    const sofia = await signUpVerified(app, pool, 'sofia@example.org', 'Chorale');
    const response = await sofia.patch(`${EVENTS}/${event.id}`, { baseVersion: 1, changes: { title: 'Pris' } });
    expect(response.status).toBe(404);
    expect(JSON.stringify(response.body)).not.toContain('Malade');
  });

  test.each(['createdBy', 'associationId', 'authorId'])('R-EVT-8: a body carrying %s is 400 UNKNOWN_FIELD', async (field) => {
    const response = await (await claire()).post(EVENTS, complete({ [field]: '00000000-0000-0000-0000-000000000000' }));
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('UNKNOWN_FIELD');
  });
});

describe('associations and public reads (R-ASSO, R-PUB)', () => {
  test('R-ASSO-1: a sixth association is 409', async () => {
    const client = await claire();
    for (let n = 2; n <= 5; n += 1) expect((await client.post('/api/associations', { name: `Troupe ${n}` })).status).toBe(201);
    expect((await client.post('/api/associations', { name: 'Troupe 6' })).status).toBe(409);
  });

  test('R-ASSO-2: an expired, revoked or unknown invitation is 410', async () => {
    const owner = await claire();
    const malik = await signUpVerified(app, pool, 'malik@example.org', 'Malik');
    const accept = (token) => malik.post('/api/invitations/accept', { token });
    const invite = async (email) => (await owner.post('/api/associations/troupe/invitations', { email })).body;
    const revoked = await invite('malik@example.org');
    await owner.del(`/api/associations/troupe/invitations/${revoked.id}`);
    expect((await accept(revoked.link.split('#')[1])).status).toBe(410);
    expect((await accept('A'.repeat(43))).status).toBe(410);
    const expired = await invite('malik@example.org');
    clock.now += 7 * DAY + 1;
    // Malik's session has expired by then; the anonymous lookup gives the same 410.
    const lookup = await (await browser(app)).post('/api/invitations/lookup', { token: expired.link.split('#')[1] });
    expect(lookup.status).toBe(410);
  });

  test('R-PUB-1: drafts, hidden events and closed associations are 404; published events stay readable', async () => {
    const client = await claire();
    const visitor = await browser(app);
    const hidden = await draft(client);
    const open = await draft(client, complete({ title: 'Public' }));
    const unpublished = await draft(client, complete({ title: 'Draft' }));
    await client.post(`${EVENTS}/${hidden.id}/publish`, { baseVersion: 1 });
    await client.post(`${EVENTS}/${open.id}/publish`, { baseVersion: 1 });
    await pool.query('UPDATE event SET hidden_by_moderation = true WHERE id = $1', [hidden.id]);
    const sofia = await signUpVerified(app, pool, 'sofia@example.org', 'Chorale');
    const theirs = (await sofia.post('/api/associations/chorale/events', complete({ title: 'Chorale' }))).body;
    await sofia.post(`/api/associations/chorale/events/${theirs.id}/publish`, { baseVersion: 1 });

    const publicView = await visitor.get(`/api/events/${open.id}`);
    expect(publicView.status).toBe(200);
    expect(JSON.stringify(publicView.body)).not.toMatch(/createdBy|lastEditedBy|accountId|version/);
    expect((await visitor.get(`/api/events/${theirs.id}`)).status).toBe(200);
    expect((await visitor.get(`/api/events/${unpublished.id}`)).status).toBe(404);
    expect((await visitor.get(`/api/events/${hidden.id}`)).status).toBe(404);
    expect((await client.post('/api/associations/troupe/close', { confirm: true })).status).toBe(204);
    expect((await visitor.get(`/api/events/${open.id}`)).status).toBe(404);
  });
});
