import { browser, buildApp, createPool, migrate, resetData, signUpVerified } from './harness.js';

// Public agenda acceptance criteria AC1–AC7 (docs/architecture/specs/public-agenda.md § 2)
// against the Express app and a disposable PostgreSQL. Events are inserted directly: the
// lifecycle that produces each state is covered by events.test.js.

const HOUR = 3600e3;
const DAY = 24 * HOUR;
let pool, app, clock, troupe;
beforeAll(() => { migrate(); pool = createPool(); });
beforeEach(async () => {
  await resetData(pool);
  ({ app, clock } = buildApp(pool));
  await signUpVerified(app, pool, 'claire@example.org', 'Troupe');
  ({ rows: [{ id: troupe }] } = await pool.query("SELECT id FROM association WHERE slug = 'troupe'"));
});
afterAll(() => pool.end());

const at = (offset) => new Date(clock.now + offset);

/** Inserts one event of the troupe; defaults to a published concert in Lyon next week. */
const insert = async (fields = {}) => {
  const event = { title: 'Concert', type: 'CONCERT', status: 'PUBLISHED', starts_at: at(7 * DAY), ends_at: null,
    city: '69123', hidden: false, association: troupe, ...fields };
  const { rows: [{ id }] } = await pool.query(
    `INSERT INTO event (association_id, type, title, short_description, status, starts_at, ends_at, venue_label,
       venue_address, venue_normalized_city, published_at, hidden_by_moderation, created_by, last_edited_by)
     VALUES ($1, $2, $3, 'Short', $4, $5, $6, 'Hall', '1 rue Secrète', $7,
       CASE WHEN $4 = 'DRAFT' THEN NULL ELSE $5::timestamptz END, $8,
       (SELECT account_id FROM membership WHERE association_id = $1 LIMIT 1),
       (SELECT account_id FROM membership WHERE association_id = $1 LIMIT 1)) RETURNING id`,
    [event.association, event.type, event.title, event.status, event.starts_at, event.ends_at, event.city, event.hidden]);
  return id;
};

const agenda = async (query = '') => (await browser(app)).get(`/api/events${query}`);

describe('UC21 public agenda', () => {
  test('a visitor without a session gets the first page (AC1)', async () => {
    await insert();
    const response = await agenda();
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ page: 1, pageSize: 20, hasMore: false });
    expect(response.body.items).toHaveLength(1);
  });

  test('lists upcoming and ongoing published or cancelled events only (AC2)', async () => {
    const upcoming = await insert({ title: 'Upcoming' });
    const ongoing = await insert({ title: 'Ongoing', starts_at: at(-HOUR), ends_at: at(HOUR) });
    const noEndToday = await insert({ title: 'No end, started 3 h ago', starts_at: at(-3 * HOUR) });
    const cancelled = await insert({ title: 'Cancelled', status: 'CANCELLED' });
    await insert({ title: 'Draft', status: 'DRAFT' });
    await insert({ title: 'Archived', status: 'ARCHIVED', starts_at: at(-3 * DAY), ends_at: at(-2 * DAY) });
    await insert({ title: 'Ended', starts_at: at(-3 * HOUR), ends_at: at(-HOUR) });
    await insert({ title: 'No end, started 2 days ago', starts_at: at(-2 * DAY) });
    await insert({ title: 'Hidden', hidden: true });
    await signUpVerified(app, pool, 'x@example.org', 'Closed troupe');
    const { rows: [{ id: closed }] } = await pool.query('SELECT id FROM association WHERE id <> $1', [troupe]);
    await insert({ title: 'Closed association', association: closed });
    await pool.query("UPDATE association SET status = 'CLOSED', closed_at = now() WHERE id = $1", [closed]);

    const ids = (await agenda()).body.items.map((item) => item.id).sort();
    expect(ids).toEqual([upcoming, ongoing, noEndToday, cancelled].sort());
  });

  test('orders by start then id, pages by 20 with hasMore (AC3, AC4)', async () => {
    const ids = [];
    for (let n = 0; n < 21; n += 1) ids.push(await insert({ title: `E${n}`, starts_at: at(DAY + (n % 2) * HOUR) }));
    const first = await agenda();
    const second = await agenda('?page=2');
    expect(first.body).toMatchObject({ page: 1, hasMore: true });
    expect(first.body.items).toHaveLength(20);
    expect(second.body).toMatchObject({ page: 2, hasMore: false });
    const listed = [...first.body.items, ...second.body.items];
    const expected = listed.slice().sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id));
    expect(listed.map((item) => item.id)).toEqual(expected.map((item) => item.id));
    expect(new Set(listed.map((item) => item.id)).size).toBe(21);
  });

  test('filters by type and city with AND (AC5)', async () => {
    const lyonConcert = await insert();
    await insert({ type: 'THEATRE' });
    await insert({ city: '75056' });
    expect((await agenda('?type=CONCERT&city=69123')).body.items.map((item) => item.id)).toEqual([lyonConcert]);
  });

  test.each(['?page=0', '?page=51', '?page=x', '?type=SPORT', '?city=Lyon', '?owner=1'])(
    'rejects %s with 400 INVALID_REQUEST (AC4)', async (query) => {
      const response = await agenda(query);
      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_REQUEST');
    });

  test('items expose the card allow-list only (AC6)', async () => {
    await insert();
    const [item] = (await agenda()).body.items;
    expect(Object.keys(item).sort()).toEqual(['association', 'endsAt', 'id', 'priceAmountCents', 'priceKind',
      'posterStyle', 'shortDescription', 'startsAt', 'status', 'title', 'type', 'venueCity', 'venueLabel'].sort());
    expect(item.association).toEqual({ name: 'Troupe', slug: 'troupe' });
    expect(item.venueCity).toEqual({ code: '69123', name: 'Lyon' });
  });
});

describe('UC21a agenda cities', () => {
  test('lists cities having agenda events, sorted by name (AC7)', async () => {
    await insert({ city: '75056' });
    await insert({ city: '69123' });
    await insert({ city: '69123' });
    await insert({ city: '13055', status: 'DRAFT' });
    const response = await (await browser(app)).get('/api/events/cities');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ code: '69123', name: 'Lyon' }, { code: '75056', name: 'Paris' }]);
  });
});
