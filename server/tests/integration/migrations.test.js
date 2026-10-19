import { createPool, migrate, resetData } from './harness.js';

// AC16 / BC17: from empty to latest, down to empty, up again.
test('migrations apply up, down to zero and up again', async () => {
  const pool = createPool();
  const tables = async () => (await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name <> 'pgmigrations' ORDER BY 1")).rows
    .map((row) => row.table_name);
  try {
    migrate('up');
    expect(await tables()).toEqual(['account', 'activity_entry', 'association', 'auth_token', 'event', 'invitation',
      'membership', 'outbox_message', 'session']);
    migrate('down');
    expect(await tables()).not.toContain('event');
    migrate('down', ['Infinity']);
    expect(await tables()).toEqual([]);
    migrate('up');
    expect(await tables()).toHaveLength(9);
  } finally { await pool.end(); }
});

// BC17: every event CHECK rejects an invalid row inserted directly, and the outbox template list
// accepts DRAFT_CLEANUP_NOTICE only.
describe('event constraints (BC17)', () => {
  let pool, associationId;
  beforeAll(async () => {
    migrate();
    pool = createPool();
    await resetData(pool);
    ({ rows: [{ id: associationId }] } = await pool.query("INSERT INTO association (name, slug) VALUES ('A', 'a') RETURNING id"));
  });
  afterAll(() => pool.end());

  const insert = (columns) => {
    const values = { association_id: associationId, type: 'TALK', title: 'T', ...columns };
    const names = Object.keys(values);
    // Test-only text built from fixed column names above, never from input.
    return pool.query(`INSERT INTO event (${names.join(', ')}) VALUES (${names.map((_, i) => `$${i + 1}`).join(', ')})`,
      Object.values(values));
  };
  const published = { status: 'PUBLISHED', published_at: new Date(), short_description: 'S',
    starts_at: new Date('2026-11-01T18:00Z'), venue_label: 'V', venue_normalized_city: '69123' };

  test('a minimal draft and a complete published event are accepted', async () => {
    await expect(insert({})).resolves.toBeDefined();
    await expect(insert(published)).resolves.toBeDefined();
  });

  test.each([
    ['unknown type', { type: 'PARTY' }],
    ['empty title', { title: '' }],
    ['long title', { title: 'x'.repeat(121) }],
    ['long short description', { short_description: 'x'.repeat(281) }],
    ['long description', { long_description: 'x'.repeat(10001) }],
    ['long venue label', { venue_label: 'x'.repeat(201) }],
    ['malformed city code', { venue_normalized_city: 'Lyon' }],
    ['end before start', { starts_at: new Date('2026-11-02Z'), ends_at: new Date('2026-11-01Z') }],
    ['end without start', { ends_at: new Date('2026-11-01Z') }],
    ['amount without AMOUNT', { price_amount_cents: 500 }],
    ['AMOUNT without amount', { price_kind: 'AMOUNT' }],
    ['zero amount', { price_kind: 'AMOUNT', price_amount_cents: 0 }],
    ['unknown poster style', { poster_style: 'neon' }],
    ['unknown status', { status: 'HIDDEN' }],
    ['reason on a draft', { cancellation_reason: 'No' }],
    ['draft with published_at', { published_at: new Date() }],
    ['published without published_at', { ...published, published_at: null }],
    ['published without city', { ...published, venue_normalized_city: null }],
    ['version 0', { version: 0 }],
  ])('rejects %s', async (_label, columns) => {
    await expect(insert(columns)).rejects.toMatchObject({ code: '23514' });
  });

  test('the outbox accepts the new template and still rejects unknown ones', async () => {
    await expect(pool.query("INSERT INTO outbox_message (recipient, template) VALUES ('a@b.c', 'DRAFT_CLEANUP_NOTICE')"))
      .resolves.toBeDefined();
    await expect(pool.query("INSERT INTO outbox_message (recipient, template) VALUES ('a@b.c', 'SPAM')"))
      .rejects.toMatchObject({ code: '23514' });
  });
});
