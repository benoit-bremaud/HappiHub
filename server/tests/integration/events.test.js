import { browser, buildApp, createPool, lastEmail, migrate, resetData, signUpVerified } from './harness.js';

// Brick B acceptance criteria BC1–BC12, BC14–BC16, BC18, BC19 (spec § 8) against the Express
// app and a disposable PostgreSQL. BC13 is in maintenance.test.js, BC17 in migrations.test.js.

const HOUR = 3600e3;
const DAY = 24 * HOUR;
let pool, app, clock;
beforeAll(() => { migrate(); pool = createPool(); });
beforeEach(async () => { await resetData(pool); ({ app, clock } = buildApp(pool)); });
afterAll(() => pool.end());

const EVENTS = '/api/associations/troupe/events';
const future = () => new Date(clock.now + 7 * DAY).toISOString();
const complete = () => ({ title: 'Concert', type: 'CONCERT', shortDescription: 'Live music', startsAt: future(),
  venueLabel: 'Salle des fêtes', venueCity: '69123' });
const row = async (id) => (await pool.query('SELECT * FROM event WHERE id = $1', [id])).rows[0];
const accountId = async (email) => (await pool.query('SELECT id FROM account WHERE email = $1', [email])).rows[0].id;
const activity = async (action) =>
  (await pool.query('SELECT * FROM activity_entry WHERE action = $1 ORDER BY occurred_at', [action])).rows;

/** Claire (display name "Claire") with her association "troupe". */
const claireOnly = async () => {
  const claire = await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
  await claire.patch('/api/account', { displayName: 'Claire' });
  return claire;
};

/** Claire and Malik, both members of "troupe"; Malik also owns "malik-solo". */
const twoMembers = async () => {
  const claire = await claireOnly();
  await claire.post('/api/associations/troupe/invitations', { email: 'malik@example.org' });
  const { token } = await lastEmail(pool, 'malik@example.org', 'INVITATION');
  const malik = await signUpVerified(app, pool, 'malik@example.org', 'Malik solo');
  await malik.patch('/api/account', { displayName: 'Malik' });
  expect((await malik.post('/api/invitations/accept', { token })).status).toBe(200);
  return { claire, malik };
};

const create = async (client, body = complete()) => {
  const response = await client.post(EVENTS, body);
  expect(response.status).toBe(201);
  return response.body;
};

const published = async (client, body = complete()) => {
  const event = await create(client, body);
  const response = await client.post(`${EVENTS}/${event.id}/publish`, { baseVersion: 1 });
  expect(response.status).toBe(200);
  return response.body;
};

describe('UC15 create (BC1, BC2)', () => {
  test('a member creates a draft with title and type only; others get 404 (BC1)', async () => {
    const claire = await claireOnly();
    const created = await claire.post(EVENTS, { title: 'Atelier', type: 'WORKSHOP' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ title: 'Atelier', type: 'WORKSHOP', status: 'DRAFT', version: 1,
      priceKind: 'FREE', posterStyle: 'classic', lastEditedBy: 'Claire', venueCity: null });
    expect(await row(created.body.id)).toMatchObject({ created_by: await accountId('claire@example.org') });
    const outsider = await signUpVerified(app, pool, 'x@example.org', 'Other');
    expect((await outsider.post(EVENTS, { title: 'Intrus', type: 'OTHER' })).status).toBe(404);
    expect((await outsider.get(`${EVENTS}/${created.body.id}`)).status).toBe(404);
    expect((await (await browser(app)).post(EVENTS, { title: 'Anonymous', type: 'OTHER' })).status).toBe(401);
    expect((await claire.post(EVENTS, { title: 'No type' })).body).toMatchObject({ code: 'INVALID_FIELD',
      details: { field: 'type' } });
  });

  test('the 21st creation in 24 h answers 429 with Retry-After; other associations are unaffected (BC2)', async () => {
    const claire = await claireOnly();
    const other = await signUpVerified(app, pool, 'x@example.org', 'Other');
    const { rows: [{ id }] } = await pool.query("SELECT id FROM association WHERE slug = 'troupe'");
    const oldest = clock.now - 23 * HOUR;
    await pool.query(`INSERT INTO event (association_id, type, title, created_at)
      SELECT $1, 'TALK', 'Seed ' || n, $2::timestamptz + n * interval '1 minute' FROM generate_series(0, 18) AS n`,
    [id, new Date(oldest)]);
    await pool.query(`INSERT INTO event (association_id, type, title, created_at) VALUES ($1, 'TALK', 'Expired', $2)`,
      [id, new Date(clock.now - 25 * HOUR)]);
    const attempts = await Promise.all([1, 2, 3].map((n) => claire.post(EVENTS, { title: `Race ${n}`, type: 'TALK' })));
    expect(attempts.map((r) => r.status).sort()).toEqual([201, 429, 429]);
    const refused = attempts.find((r) => r.status === 429);
    expect(refused.body).toMatchObject({ code: 'EVENT_QUOTA' });
    expect(Number(refused.headers['retry-after'])).toBe(HOUR / 1000);
    expect((await other.post('/api/associations/other/events', { title: 'Free', type: 'TALK' })).status).toBe(201);
  });
});

describe('UC16/UC17 edit (BC3–BC7)', () => {
  test('a save with the current version applies and increments it (BC3)', async () => {
    const claire = await claireOnly();
    const event = await create(claire);
    const saved = await claire.patch(`${EVENTS}/${event.id}`, { baseVersion: 1, changes: { title: 'Grand concert' } });
    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({ title: 'Grand concert', version: 2, lastEditedBy: 'Claire' });
    expect(await row(event.id)).toMatchObject({ version: 2, last_edited_by: await accountId('claire@example.org') });
  });

  test('concurrent saves of different fields both succeed (BC4)', async () => {
    const { claire, malik } = await twoMembers();
    const event = await create(claire);
    const [a, b] = await Promise.all([
      claire.patch(`${EVENTS}/${event.id}`, { baseVersion: 1, changes: { title: 'Claire title' }, base: { title: 'Concert' } }),
      malik.patch(`${EVENTS}/${event.id}`, { baseVersion: 1, changes: { venueLabel: 'Théâtre' },
        base: { venueLabel: 'Salle des fêtes' } }),
    ]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(await row(event.id)).toMatchObject({ title: 'Claire title', venue_label: 'Théâtre', version: 3 });
  });

  test('concurrent saves of the same field: one conflict, nothing written, resubmission succeeds (BC5)', async () => {
    const { claire, malik } = await twoMembers();
    const event = await create(claire);
    const save = (client, title) => client.patch(`${EVENTS}/${event.id}`,
      { baseVersion: 1, changes: { title, venueLabel: `${title} hall` }, base: { title: 'Concert', venueLabel: 'Salle des fêtes' } });
    const responses = await Promise.all([save(claire, 'Claire'), save(malik, 'Malik')]);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    const loser = responses.find((r) => r.status === 409);
    const winner = responses.find((r) => r.status === 200).body;
    expect(loser.body).toMatchObject({ code: 'EDIT_CONFLICT', details: { version: 2, lastEditedBy: winner.lastEditedBy,
      conflicts: [{ field: 'title', theirs: winner.title }, { field: 'venueLabel', theirs: winner.venueLabel }] } });
    expect(await row(event.id)).toMatchObject({ version: 2, title: winner.title });
    const loserClient = winner.lastEditedBy === 'Claire' ? malik : claire;
    const resolved = await loserClient.patch(`${EVENTS}/${event.id}`, { baseVersion: 2, changes: { title: 'Agreed' } });
    expect(resolved.body).toMatchObject({ title: 'Agreed', version: 3 });
  });

  test('clearing a required field of a published event answers 422 and changes nothing (BC6)', async () => {
    const claire = await claireOnly();
    const event = await published(claire);
    const response = await claire.patch(`${EVENTS}/${event.id}`, { baseVersion: 2, changes: { venueCity: null } });
    expect(response.status).toBe(422);
    expect(response.body).toEqual({ message: expect.any(String), code: 'PUBLISHED_FIELD_REQUIRED',
      details: { fields: ['venueCity'] } });
    expect(await row(event.id)).toMatchObject({ version: 2, venue_normalized_city: '69123' });
  });

  test('start, end or venue changes of a published event set schedule_changed_at; others do not (BC7)', async () => {
    const claire = await claireOnly();
    const event = await published(claire);
    await claire.patch(`${EVENTS}/${event.id}`, { baseVersion: 2, changes: { title: 'Renamed', priceKind: 'PAY_WHAT_YOU_WANT' } });
    expect((await row(event.id)).schedule_changed_at).toBeNull();
    const moved = await claire.patch(`${EVENTS}/${event.id}`, { baseVersion: 3, changes: { venueAddress: '1 rue Haute' } });
    expect(moved.body.scheduleChangedAt).toBe(new Date(clock.now).toISOString());
  });
});

describe('UC18 publish (BC8, BC9)', () => {
  test('guard codes, stale version and second publish leave the event as it was (BC8)', async () => {
    const claire = await claireOnly();
    const sparse = await create(claire, { title: 'Sparse', type: 'TALK' });
    const missing = await claire.post(`${EVENTS}/${sparse.id}/publish`, { baseVersion: 1 });
    expect(missing.status).toBe(422);
    expect(missing.body).toMatchObject({ code: 'PUBLICATION_REFUSED', details: { failures: ['MISSING_FIELD:shortDescription',
      'MISSING_FIELD:startsAt', 'MISSING_FIELD:venueLabel', 'MISSING_FIELD:venueCity'] } });

    const event = await create(claire);
    await pool.query("UPDATE account SET email_verified_at = NULL WHERE email = 'claire@example.org'");
    await pool.query("UPDATE event SET starts_at = $2 WHERE id = $1", [event.id, new Date(clock.now - HOUR)]);
    expect((await claire.post(`${EVENTS}/${event.id}/publish`, { baseVersion: 1 })).body.details.failures)
      .toEqual(['EMAIL_NOT_VERIFIED', 'START_IN_PAST']);
    await pool.query("UPDATE account SET email_verified_at = now() WHERE email = 'claire@example.org'");
    await pool.query("UPDATE event SET starts_at = $2 WHERE id = $1", [event.id, future()]);

    expect((await claire.post(`${EVENTS}/${event.id}/publish`, { baseVersion: 7 })).body)
      .toMatchObject({ code: 'STALE_VERSION', details: { version: 1 } });
    expect(await row(event.id)).toMatchObject({ status: 'DRAFT', version: 1, published_at: null });
    expect((await claire.post(`${EVENTS}/${event.id}/publish`, { baseVersion: 1 })).status).toBe(200);
    const again = await claire.post(`${EVENTS}/${event.id}/publish`, { baseVersion: 2 });
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('INVALID_TRANSITION');
    expect((await row(event.id)).version).toBe(2);
  });

  test('publish sets published_at; the public read has no account ids or editing metadata (BC9)', async () => {
    const claire = await claireOnly();
    const event = await published(claire);
    expect(event).toMatchObject({ status: 'PUBLISHED', version: 2, publishedAt: new Date(clock.now).toISOString() });
    const response = await (await browser(app)).get(`/api/events/${event.id}`);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: event.id, title: 'Concert', status: 'PUBLISHED', ended: false,
      venueCity: { code: '69123', name: 'Lyon' }, association: { name: 'Troupe', slug: 'troupe' } });
    for (const hidden of ['version', 'lastEditedBy', 'lastEditedByFormerMember', 'createdBy', 'createdAt', 'updatedAt', 'cleanupNoticeAt'])
      expect(response.body).not.toHaveProperty(hidden);
    const claireId = await accountId('claire@example.org');
    const { rows: [{ association_id: associationId }] } = await pool.query('SELECT association_id FROM event');
    expect(JSON.stringify(response.body)).not.toMatch(new RegExp(`${claireId}|${associationId}|Claire"`));
  });
});

describe('UC19 cancel and UC20 delete (BC10, BC11)', () => {
  test('cancel requires confirm, keeps the reason and is final (BC10)', async () => {
    const claire = await claireOnly();
    const event = await published(claire);
    const path = `${EVENTS}/${event.id}`;
    expect((await claire.post(`${path}/cancel`, { baseVersion: 2 })).body).toMatchObject({ code: 'INVALID_REQUEST',
      details: { field: 'confirm' } });
    const cancelled = await claire.post(`${path}/cancel`, { baseVersion: 2, confirm: true, reason: 'Artist ill' });
    expect(cancelled.body).toMatchObject({ status: 'CANCELLED', cancellationReason: 'Artist ill', version: 3 });
    const writes = [claire.patch(path, { baseVersion: 3, changes: { title: 'X' } }),
      claire.post(`${path}/publish`, { baseVersion: 3 }), claire.post(`${path}/cancel`, { baseVersion: 3, confirm: true }),
      claire.post(`${path}/delete`, { baseVersion: 3, confirm: true })];
    for (const response of await Promise.all(writes)) expect(response.body.code).toBe('EVENT_READ_ONLY');
    expect((await (await browser(app)).get(`/api/events/${event.id}`)).body.status).toBe('CANCELLED');
  });

  test('cancel after the effective end answers EVENT_ENDED (A1)', async () => {
    const claire = await claireOnly();
    const event = await published(claire);
    await pool.query('UPDATE event SET starts_at = $2 WHERE id = $1', [event.id, new Date(clock.now - DAY - 1000)]);
    const response = await claire.post(`${EVENTS}/${event.id}/cancel`, { baseVersion: 2, confirm: true });
    expect(response.body.code).toBe('EVENT_ENDED');
    expect((await row(event.id)).status).toBe('PUBLISHED');
  });

  test('delete only drafts, with confirm and the current version (BC11)', async () => {
    const claire = await claireOnly();
    const draft = await create(claire);
    const path = `${EVENTS}/${draft.id}/delete`;
    expect((await claire.post(path, { baseVersion: 1 })).status).toBe(400);
    expect((await claire.post(path, { baseVersion: 2, confirm: true })).body.code).toBe('STALE_VERSION');
    expect((await claire.post(path, { baseVersion: 1, confirm: true })).status).toBe(204);
    expect((await claire.get(`${EVENTS}/${draft.id}`)).status).toBe(404);
    const live = await published(claire);
    expect((await claire.post(`${EVENTS}/${live.id}/delete`, { baseVersion: 2, confirm: true })).body.code)
      .toBe('INVALID_TRANSITION');
  });
});

describe('reads (BC12, member list)', () => {
  test('public read: the same 404 for drafts, unknown or malformed ids, hidden events and closed associations (BC12)', async () => {
    const claire = await claireOnly();
    const draft = await create(claire);
    const live = await published(claire);
    const hidden = await published(claire);
    await pool.query('UPDATE event SET hidden_by_moderation = true WHERE id = $1', [hidden.id]);
    const anonymous = await browser(app);
    const answers = await Promise.all([draft.id, hidden.id, '7d9f2c56-1d6e-4c43-9b55-0a1c2d3e4f5a', 'not-a-uuid',
      `{${draft.id}}`]
      .map((id) => anonymous.get(`/api/events/${id}`)));
    for (const response of answers)
      expect([response.status, response.body]).toEqual([404, { message: 'Event not found', code: 'EVENT_NOT_FOUND' }]);
    expect((await anonymous.get(`/api/events/${live.id}`)).status).toBe(200);
    expect((await claire.post('/api/associations/troupe/close', { confirm: true })).status).toBe(204);
    expect((await anonymous.get(`/api/events/${live.id}`)).status).toBe(404);
  });

  test('members list their events, filtered by status, with the last editor', async () => {
    const claire = await claireOnly();
    const draft = await create(claire, { title: 'Draft', type: 'TALK' });
    const live = await published(claire);
    const all = (await claire.get(EVENTS)).body.events;
    expect(all.map((e) => e.id).sort()).toEqual([draft.id, live.id].sort());
    expect(all.find((e) => e.id === live.id)).toEqual({ id: live.id, title: 'Concert', type: 'CONCERT', status: 'PUBLISHED', startsAt: live.startsAt,
      ended: false, updatedAt: expect.any(String), lastEditedBy: 'Claire', lastEditedByFormerMember: false });
    expect((await claire.get(`${EVENTS}?status=DRAFT`)).body.events.map((e) => e.id)).toEqual([draft.id]);
    expect((await claire.get(`${EVENTS}?status=GONE`)).body.code).toBe('INVALID_REQUEST');
    expect((await claire.get(`${EVENTS}/${draft.id}`)).body).toMatchObject({ id: draft.id, version: 1, status: 'DRAFT' });
  });
});

describe('commune search (A-B5)', () => {
  test('anyone can search the city reference; the query is validated', async () => {
    const anonymous = await browser(app);
    const found = await anonymous.get('/api/communes?q=lyon');
    expect(found.status).toBe(200);
    expect(found.body.communes[0]).toEqual({ code: '69123', name: 'Lyon', department: '69' });
    for (const query of ['', '?q=a', `?q=${'a'.repeat(61)}`]) {
      const refused = await anonymous.get(`/api/communes${query}`);
      expect([refused.status, refused.body.code, refused.body.details]).toEqual([400, 'INVALID_REQUEST', { field: 'q' }]);
    }
  });
});

describe('cross-brick effects (BC14, BC15)', () => {
  test('closure cancels upcoming published events only and blocks later writes (BC14)', async () => {
    const claire = await claireOnly();
    const upcoming = await published(claire);
    const past = await published(claire);
    await pool.query('UPDATE event SET starts_at = $2 WHERE id = $1', [past.id, new Date(clock.now - 2 * DAY)]);
    const draft = await create(claire);
    expect((await claire.post('/api/associations/troupe/close', { confirm: true })).status).toBe(204);
    expect(await row(upcoming.id)).toMatchObject({ status: 'CANCELLED', cancellation_reason: 'Association closed' });
    expect((await row(past.id)).status).toBe('PUBLISHED');
    expect((await row(draft.id)).status).toBe('DRAFT');
    expect((await activity('EVENT_CANCELLED')).map((e) => e.target_ref)).toEqual([upcoming.id]);
    expect((await claire.patch(`${EVENTS}/${draft.id}`, { baseVersion: 1, changes: { title: 'X' } })).body.code)
      .toBe('ASSOCIATION_CLOSED');
    expect((await claire.post(EVENTS, { title: 'X', type: 'TALK' })).body.code).toBe('ASSOCIATION_CLOSED');
  });

  test('export lists created and edited events; account deletion leaves NULL author fields (BC15)', async () => {
    const { claire, malik } = await twoMembers();
    const mine = await create(claire, { title: 'Mine', type: 'TALK' });
    const edited = await create(malik, { title: 'Malik draft', type: 'TALK' });
    await claire.patch(`${EVENTS}/${edited.id}`, { baseVersion: 1, changes: { title: 'Edited by Claire' } });
    await create(malik, { title: 'Not mine', type: 'TALK' });
    const exported = (await claire.get('/api/account/export')).body;
    // Same created_at under the fixed clock: the export order between the two is not specified.
    expect(exported.events).toHaveLength(2);
    expect(exported.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ association: 'troupe', id: mine.id, title: 'Mine', createdByYou: true, lastEditedByYou: true }),
      expect.objectContaining({ id: edited.id, title: 'Edited by Claire', createdByYou: false, lastEditedByYou: true }),
    ]));
    expect(JSON.stringify(exported.events)).not.toContain(await accountId('malik@example.org'));
    expect((await claire.del('/api/account', { confirm: true, password: 'a quiet walk by the river' })).status).toBe(204);
    expect(await row(mine.id)).toMatchObject({ created_by: null, last_edited_by: null, title: 'Mine' });
    expect((await row(edited.id)).last_edited_by).toBeNull();
    expect((await row(edited.id)).created_by).not.toBeNull();
    const listed = (await malik.get(EVENTS)).body.events.find((event) => event.id === edited.id);
    expect(listed).toMatchObject({ lastEditedBy: null, lastEditedByFormerMember: true });
  });
});

describe('security (BC16, BC19)', () => {
  test('PATCH refuses non-allow-listed fields, over-length text and control characters (BC16)', async () => {
    const claire = await claireOnly();
    const event = await create(claire);
    const patch = (changes) => claire.patch(`${EVENTS}/${event.id}`, { baseVersion: 1, changes });
    for (const field of ['status', 'version', 'id', 'associationId', 'createdBy', 'publishedAt'])
      expect((await patch({ [field]: 'x' })).body).toMatchObject({ code: 'UNKNOWN_FIELD', details: { field } });
    expect((await patch({ title: 'x'.repeat(121) })).body).toMatchObject({ code: 'INVALID_FIELD', details: { field: 'title' } });
    expect((await patch({ shortDescription: 'tab\u0009inside' })).status).toBe(400);
    expect((await patch({ title: 'bidi\u202Eoverride' })).body).toMatchObject({ code: 'INVALID_FIELD' });
    expect((await patch({ startsAt: 1234 })).body).toMatchObject({ code: 'INVALID_FIELD', details: { field: 'startsAt' } });
    expect((await claire.post(EVENTS, { title: 'T', type: 'TALK', status: 'PUBLISHED' })).body.code).toBe('UNKNOWN_FIELD');
    expect((await claire.patch(`${EVENTS}/${event.id}`, { baseVersion: 1, changes: {} })).body.code).toBe('INVALID_REQUEST');
    expect(await row(event.id)).toMatchObject({ version: 1, status: 'DRAFT' });
  });

  test('an event id under another association slug is the same 404 everywhere (BC19)', async () => {
    const { claire, malik } = await twoMembers();
    const event = await published(claire);
    const foreign = `/api/associations/malik-solo/events/${event.id}`;
    const responses = await Promise.all([malik.get(foreign),
      malik.patch(foreign, { baseVersion: 2, changes: { title: 'X' } }),
      malik.post(`${foreign}/publish`, { baseVersion: 2 }),
      malik.post(`${foreign}/cancel`, { baseVersion: 2, confirm: true }),
      malik.post(`${foreign}/delete`, { baseVersion: 2, confirm: true })]);
    for (const response of responses)
      expect([response.status, response.body.code]).toEqual([404, 'EVENT_NOT_FOUND']);
    expect(await row(event.id)).toMatchObject({ version: 2, status: 'PUBLISHED' });
  });
});

describe('membership under lock', () => {
  test('publication racing the publisher\'s account deletion never deadlocks (lock order account first)', async () => {
    const claire = await claireOnly();
    const event = await create(claire);
    const [published, deleted] = await Promise.all([
      claire.post(`${EVENTS}/${event.id}/publish`, { baseVersion: 1 }),
      claire.del('/api/account', { confirm: true, password: 'a quiet walk by the river' })]);
    expect(deleted.status).toBe(204);
    expect([200, 401, 403, 404, 409]).toContain(published.status);
  });

  test('a member removed after loading the association can no longer write', async () => {
    const { claire, malik } = await twoMembers();
    const event = await create(claire);
    await pool.query("DELETE FROM membership WHERE account_id = (SELECT id FROM account WHERE email = 'malik@example.org')");
    expect((await malik.patch(`${EVENTS}/${event.id}`, { baseVersion: 1, changes: { title: 'X' } })).status).toBe(404);
    expect((await row(event.id)).version).toBe(1);
  });
});

describe('activity (BC18)', () => {
  test('an edit after another entry or by another member starts a new EVENT_EDITED entry', async () => {
    const { claire, malik } = await twoMembers();
    const event = await create(claire);
    const path = `${EVENTS}/${event.id}`;
    const tick = () => { clock.now += 1000; };
    await claire.patch(path, { baseVersion: 1, changes: { title: 'One' } });
    tick();
    await malik.patch(path, { baseVersion: 2, changes: { title: 'Two' } });
    tick();
    await claire.post(`${path}/publish`, { baseVersion: 3 });
    tick();
    await claire.patch(path, { baseVersion: 4, changes: { title: 'Three' } });
    await claire.patch(path, { baseVersion: 5, changes: { title: 'Three' } }); // no change: no entry
    expect((await activity('EVENT_EDITED')).map((e) => e.detail)).toEqual([{ fields: ['title'] }, { fields: ['title'] },
      { fields: ['title'] }]);
  });

  test('one entry per lifecycle write; edits within 15 minutes coalesce field names only', async () => {
    const claire = await claireOnly();
    const event = await create(claire);
    const path = `${EVENTS}/${event.id}`;
    await claire.patch(path, { baseVersion: 1, changes: { title: 'Secret title' } });
    clock.now += 10 * 60e3;
    await claire.patch(path, { baseVersion: 2, changes: { venueLabel: 'Hidden venue', title: 'Other' } });
    expect((await activity('EVENT_EDITED')).map((e) => e.detail)).toEqual([{ fields: ['title', 'venueLabel'] }]);
    clock.now += 16 * 60e3;
    await claire.patch(path, { baseVersion: 3, changes: { longDescription: 'Text' } });
    expect((await activity('EVENT_EDITED')).map((e) => e.detail)).toEqual([{ fields: ['title', 'venueLabel'] },
      { fields: ['longDescription'] }]);
    await claire.post(`${path}/publish`, { baseVersion: 4 });
    await claire.post(`${path}/cancel`, { baseVersion: 5, confirm: true });
    const draft = await create(claire, { title: 'To delete', type: 'TALK' });
    await claire.post(`${EVENTS}/${draft.id}/delete`, { baseVersion: 1, confirm: true });
    for (const action of ['EVENT_CREATED', 'EVENT_PUBLISHED', 'EVENT_CANCELLED', 'EVENT_DELETED'])
      expect((await activity(action)).length).toBe(action === 'EVENT_CREATED' ? 2 : 1);
    expect((await activity('EVENT_DELETED'))[0]).toMatchObject({ target_ref: draft.id, detail: { title: 'To delete' } });
    const { rows } = await pool.query('SELECT detail::text FROM activity_entry WHERE detail IS NOT NULL');
    expect((await activity('EVENT_EDITED')).length).toBe(2);
    expect(rows.map((r) => r.detail).join()).not.toMatch(/Secret|Hidden|Text"/);
  });
});
