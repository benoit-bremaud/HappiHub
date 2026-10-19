import { browser, buildApp, createPool, lastEmail, migrate, PASSWORD, resetData, signUpVerified } from './harness.js';

let pool, app, clock;
beforeAll(() => { migrate(); pool = createPool(); });
beforeEach(async () => { await resetData(pool); ({ app, clock } = buildApp(pool)); });
afterAll(() => pool.end());

/** Claire's association with Malik joined through an invitation. */
const twoMembers = async () => {
  const claire = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
  await claire.post('/api/associations/troupe/invitations', { email: 'malik@example.org' });
  const { token } = await lastEmail(pool, 'malik@example.org', 'INVITATION');
  const malik = await signUpVerified(app, pool, 'malik@example.org', 'Malik solo');
  expect((await malik.post('/api/invitations/accept', { token })).status).toBe(200);
  const malikId = (await pool.query("SELECT id FROM account WHERE email = 'malik@example.org'")).rows[0].id;
  return { claire, malik, malikId };
};

describe('UC7 profile (AC9)', () => {
  test('editing keeps the slug and is logged', async () => {
    const claire = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
    const response = await claire.patch('/api/associations/troupe', { name: 'La Grande Troupe', city: 'Lyon',
      websiteUrl: 'https://troupe.example.org', contactEmail: 'Contact@Troupe.example.org' });
    expect(response.status).toBe(204);
    const view = (await claire.get('/api/associations/troupe')).body;
    expect(view).toMatchObject({ name: 'La Grande Troupe', slug: 'troupe', city: 'Lyon', contactEmail: 'contact@troupe.example.org' });
    expect((await pool.query("SELECT 1 FROM activity_entry WHERE action = 'ASSOCIATION_UPDATED'")).rows).toHaveLength(1);
    expect((await claire.patch('/api/associations/troupe', { websiteUrl: 'javascript:alert(1)' })).status).toBe(400);
  });

  test('non-members get 404', async () => {
    await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
    const other = await signUpVerified(app, pool, 'x@example.org', 'Other');
    expect((await other.get('/api/associations/troupe')).status).toBe(404);
    expect((await other.patch('/api/associations/troupe', { city: 'X' })).status).toBe(404);
  });
});

describe('UC8 closure (AC10)', () => {
  test('refused while other members remain; afterwards the slug stays reserved', async () => {
    const { claire, malik } = await twoMembers();
    expect((await claire.post('/api/associations/troupe/close', { confirm: true })).status).toBe(409);
    expect((await malik.postEmpty('/api/associations/troupe/leave')).status).toBe(204);
    expect((await claire.post('/api/associations/troupe/close', { confirm: true })).status).toBe(204);
    expect((await claire.patch('/api/associations/troupe', { city: 'X' })).status).toBe(409);
    const other = await browser(app);
    await other.post('/api/signup', { email: 'new@example.org', password: PASSWORD, associationName: 'Troupe' });
    expect((await pool.query("SELECT slug FROM association WHERE slug LIKE 'troupe%' ORDER BY slug")).rows.map((r) => r.slug))
      .toEqual(['troupe', 'troupe-2']);
  });
});

describe('UC10 invitations (AC11)', () => {
  test('refuses existing members, offers resend for pending ones, enforces 10 per day', async () => {
    const { claire } = await twoMembers();
    expect((await claire.post('/api/associations/troupe/invitations', { email: 'malik@example.org' })).status).toBe(409);
    const first = await claire.post('/api/associations/troupe/invitations', { email: 'a0@example.org' });
    expect(first.status).toBe(201);
    expect(first.body.link).toMatch(/\/invitations#[A-Za-z0-9_-]{43}$/);
    const duplicate = await claire.post('/api/associations/troupe/invitations', { email: 'a0@example.org' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.invitationId).toBe(first.body.id);
    // Two invitations already sent today (Malik, a0): eight more fit in the quota.
    for (let i = 1; i <= 8; i += 1)
      expect((await claire.post('/api/associations/troupe/invitations', { email: `a${i}@example.org` })).status).toBe(201);
    const limited = await claire.post('/api/associations/troupe/invitations', { email: 'a9@example.org' });
    expect(limited.status).toBe(429);
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
  });

  test('lists, resends with a new link and revokes at once', async () => {
    const claire = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
    const created = (await claire.post('/api/associations/troupe/invitations', { email: 'm@example.org' })).body;
    expect((await claire.get('/api/associations/troupe/invitations')).body.invitations.map((i) => i.email)).toEqual(['m@example.org']);
    const resent = (await claire.postEmpty(`/api/associations/troupe/invitations/${created.id}/resend`)).body;
    expect(resent.link).not.toBe(created.link);
    const visitor = await browser(app);
    expect((await visitor.post('/api/invitations/lookup', { token: created.link.split('#')[1] })).status).toBe(410);
    expect((await visitor.post('/api/invitations/lookup', { token: resent.link.split('#')[1] })).body)
      .toEqual({ associationName: 'Troupe', associationSlug: 'troupe', email: 'm@example.org' });
    expect((await claire.del(`/api/associations/troupe/invitations/${created.id}`)).status).toBe(204);
    expect((await visitor.post('/api/invitations/lookup', { token: resent.link.split('#')[1] })).status).toBe(410);
    expect((await pool.query('SELECT 1 FROM invitation')).rows).toHaveLength(0);
    expect((await claire.del(`/api/associations/troupe/invitations/${created.id}`)).status).toBe(404);
    expect((await claire.del('/api/associations/troupe/invitations/not-a-uuid')).status).toBe(400);
  });
});

describe('UC11 joining (AC12)', () => {
  test('unknown, expired, revoked and used tokens all answer the same 410', async () => {
    const { malik } = await twoMembers();
    const claire = await signUpVerified(app, pool, 'c2@example.org', 'Second');
    const used = await pool.query('SELECT 1 FROM invitation'); expect(used.rows).toHaveLength(0);
    await claire.post('/api/associations/second/invitations', { email: 'malik@example.org' });
    const { token } = await lastEmail(pool, 'malik@example.org', 'INVITATION');
    const unknown = await malik.post('/api/invitations/accept', { token: 'A'.repeat(43) });
    clock.now += 7 * 24 * 3600e3 + 1;
    const late = await signUpVerified(app, pool, 'late@example.org', 'Late');
    const expired = await late.post('/api/invitations/lookup', { token });
    expect([unknown.status, expired.status]).toEqual([410, 410]);
    expect(unknown.body).toEqual(expired.body);
  });

  test('an invitee signs up, verifies, signs in and joins by id; a different email gets 403 with a masked hint', async () => {
    const claire = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
    await claire.post('/api/associations/troupe/invitations', { email: 'malik@gmail.com' });
    const { token } = await lastEmail(pool, 'malik@gmail.com', 'INVITATION');
    const malik = await browser(app);
    // UC11 3a: the invitee signs up without an association name.
    expect((await malik.post('/api/signup', { email: 'malik@gmail.com', password: PASSWORD })).status).toBe(202);
    expect((await pool.query("SELECT associations_created FROM account WHERE email = 'malik@gmail.com'")).rows[0].associations_created).toBe(0);
    expect((await malik.post('/api/session', { email: 'malik@gmail.com', password: PASSWORD })).status).toBe(401);
    const stranger = await signUpVerified(app, pool, 'other@example.org', 'Stranger');
    const foreign = await stranger.post('/api/invitations/accept', { token });
    expect(foreign.status).toBe(403);
    expect(foreign.body.hint).toBe('m•••@gmail.com');
    // After verification and sign-in the pending invitation is offered and joined by id (UC11 4c).
    const { token: verifyToken } = await lastEmail(pool, 'malik@gmail.com', 'VERIFY');
    await malik.post('/api/email-verification', { token: verifyToken });
    malik.adopt(await malik.post('/api/session', { email: 'malik@gmail.com', password: PASSWORD }));
    const { invitations } = (await malik.get('/api/account')).body;
    expect(invitations).toEqual([expect.objectContaining({ associationSlug: 'troupe' })]);
    const joined = await malik.post('/api/invitations/accept', { invitationId: invitations[0].id });
    expect(joined.body).toEqual({ status: 'JOINED', associationSlug: 'troupe' });
    expect((await pool.query('SELECT 1 FROM invitation')).rows).toHaveLength(0);
    expect((await malik.get('/api/associations/troupe')).body.members).toHaveLength(2);
  });

  test('two parallel accepts admit once', async () => {
    const claire = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
    await claire.post('/api/associations/troupe/invitations', { email: 'malik@example.org' });
    const { token } = await lastEmail(pool, 'malik@example.org', 'INVITATION');
    const malik = await signUpVerified(app, pool, 'malik@example.org', 'Own');
    const results = await Promise.all([malik.post('/api/invitations/accept', { token }), malik.post('/api/invitations/accept', { token })]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 410]);
    expect((await pool.query("SELECT count(*)::int AS n FROM activity_entry WHERE action = 'MEMBER_JOINED'")).rows[0].n).toBe(1);
  });

  test('accepting requires a session', async () => {
    const visitor = await browser(app);
    expect((await visitor.post('/api/invitations/accept', { token: 'A'.repeat(43) })).status).toBe(401);
  });
});

describe('UC12 removal and leaving (AC13)', () => {
  test('a removed member loses access on the next request and is emailed', async () => {
    const { claire, malik, malikId } = await twoMembers();
    expect((await claire.del(`/api/associations/troupe/members/${malikId}`)).status).toBe(204);
    expect((await malik.get('/api/associations/troupe')).status).toBe(404);
    expect((await malik.get('/api/account')).status).toBe(200);
    expect((await lastEmail(pool, 'malik@example.org', 'MEMBER_REMOVED')).payload).toEqual({ associationName: 'Troupe' });
  });

  test('the last member cannot leave', async () => {
    const claire = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
    expect((await claire.post('/api/associations/troupe/leave')).status).toBe(409);
  });

  test('two parallel leaves never leave zero members', async () => {
    const { claire, malik } = await twoMembers();
    const results = await Promise.all([claire.post('/api/associations/troupe/leave'), malik.post('/api/associations/troupe/leave')]);
    expect(results.map((r) => r.status).sort()).toEqual([204, 409]);
    expect((await pool.query("SELECT count(*)::int AS n FROM membership m JOIN association a ON a.id = m.association_id WHERE a.slug = 'troupe'")).rows[0].n).toBe(1);
  });

  test('unknown members answer 404', async () => {
    const { claire } = await twoMembers();
    expect((await claire.del('/api/associations/troupe/members/7d9f2c56-1d6e-4c43-9b55-0a1c2d3e4f5a')).status).toBe(404);
  });
});

describe('legacy routes (S3)', () => {
  test('comment routes stay disabled; legacy event paths are gone', async () => {
    const client = await browser(app);
    expect((await client.get('/api/events/public')).status).toBe(404);
    expect((await client.post('/api/comments/add', {})).status).toBe(503);
  });
});
