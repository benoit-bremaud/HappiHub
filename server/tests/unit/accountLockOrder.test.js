import { deleteAccount, updateAccount } from '../../services/accounts.js';
import { testCipher } from '../testCipher.js';

const TOKENS_LOCK = 'SELECT 1 FROM auth_token WHERE account_id = $1 ORDER BY id FOR UPDATE';

/** Fake pg pool (the database boundary): records every statement, answers with no rows. */
const fakeDb = () => {
  const sql = [];
  const client = { query: async (text) => { sql.push(text); return { rows: [] }; }, release: () => {} };
  return { sql, db: { connect: async () => client } };
};
const ctx = (db) => ({ db, cipher: testCipher, now: () => 0, links: { verify: (token) => `/verify-email#${token}` } });
const accountLock = (sql) => sql.findIndex((text) => /^SELECT id(, .*)? FROM account WHERE id = \$1 FOR UPDATE$/.test(text));

describe('account and token lock order (#378)', () => {
  test('AC378-3: updateAccount locks the tokens before the account', async () => {
    const { sql, db } = fakeDb();
    await updateAccount(ctx(db), { id: 7, email: 'a@example.org' }, { displayName: 'A' }).catch(() => {});
    expect(sql.indexOf(TOKENS_LOCK)).toBeGreaterThan(-1);
    expect(accountLock(sql)).toBeGreaterThan(sql.indexOf(TOKENS_LOCK));
  });

  test('AC378-3: deleteAccount locks the tokens before the account', async () => {
    const { sql, db } = fakeDb();
    expect(await deleteAccount(ctx(db), 7)).toBe(false);
    expect(sql.indexOf(TOKENS_LOCK)).toBeGreaterThan(-1);
    expect(accountLock(sql)).toBeGreaterThan(sql.indexOf(TOKENS_LOCK));
  });
});
