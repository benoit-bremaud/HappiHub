import { resendVerification } from '../../services/accounts.js';
import { testCipher } from '../testCipher.js';

/** Fake pg pool (the database boundary): answers the lookup, then the locked recheck, as given. */
const fakeDb = ({ lookup, recheck }) => {
  const sql = [];
  const client = {
    query: async (text) => {
      sql.push(text);
      if (text.startsWith('SELECT id FROM account WHERE (')) return { rows: lookup };
      if (text.startsWith('SELECT id FROM account WHERE id')) return { rows: recheck };
      return { rows: [] };
    },
    release: () => {},
  };
  return { sql, db: { connect: async () => client } };
};
const ctx = (db) => ({ db, cipher: testCipher, now: () => 0, links: { verify: (token) => `/verify-email#${token}` } });
const writes = (sql) => sql.filter((text) => /^(INSERT|DELETE)/.test(text));

describe('resendVerification recheck under lock (#341)', () => {
  test('AC341-2: an account gone at the locked recheck gets no token and no email', async () => {
    const { sql, db } = fakeDb({ lookup: [{ id: 7 }], recheck: [] });
    await resendVerification(ctx(db), 'gone@example.org');
    expect(sql).toContain('SELECT 1 FROM auth_token WHERE account_id = $1 FOR UPDATE');
    expect(writes(sql)).toEqual([]);
  });

  test('locks the tokens before the account (#328 R2 order)', async () => {
    const { sql, db } = fakeDb({ lookup: [{ id: 7 }], recheck: [] });
    await resendVerification(ctx(db), 'gone@example.org');
    const tokens = sql.indexOf('SELECT 1 FROM auth_token WHERE account_id = $1 FOR UPDATE');
    const account = sql.findIndex((text) => text.startsWith('SELECT id FROM account WHERE id'));
    expect(tokens).toBeGreaterThan(-1);
    expect(account).toBeGreaterThan(tokens);
  });
});
