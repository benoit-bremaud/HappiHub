import { createPool, migrate } from './harness.js';

// AC16: from empty to latest, down to empty, up again.
test('migrations apply up, down to zero and up again', async () => {
  const pool = createPool();
  const tables = async () => (await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name <> 'pgmigrations' ORDER BY 1")).rows
    .map((row) => row.table_name);
  try {
    migrate('up');
    expect(await tables()).toEqual(['account', 'activity_entry', 'association', 'auth_token', 'invitation',
      'membership', 'outbox_message', 'session']);
    migrate('down', ['Infinity']);
    expect(await tables()).toEqual([]);
    migrate('up');
    expect(await tables()).toHaveLength(8);
  } finally { await pool.end(); }
});
