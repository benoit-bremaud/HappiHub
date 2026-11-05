import { deleteAccount, lockAccountTokens, requestPasswordReset, updateAccount } from '../../services/accounts.js';
import { testCipher } from '../testCipher.js';

const TOKENS_LOCK = 'SELECT 1 FROM auth_token WHERE account_id = $1 ORDER BY id FOR UPDATE';

/** Fake pg pool (the database boundary): records every statement; account lookups find id 7. */
const fakeDb = () => {
  const sql = [];
  const client = {
    query: async (text) => {
      sql.push(text);
      return { rows: text.startsWith('SELECT id FROM account WHERE email_bidx') ? [{ id: 7 }] : [] };
    },
    release: () => {},
  };
  return { sql, db: { connect: async () => client } };
};
const ctx = (db) => ({ db, cipher: testCipher, now: () => 0,
  links: { verify: (token) => `/verify-email#${token}`, reset: (token) => `/reset-password#${token}` },
  limits: { recipient: { take: () => true } } });
const accountLock = (sql) => sql.findIndex((text) => /^SELECT id(, .*)? FROM account WHERE id = \$1 FOR UPDATE$/.test(text));
const tokenWrite = (sql) => sql.findIndex((text) => text.startsWith('DELETE FROM auth_token'));

describe('account and token lock order (#378)', () => {
  test('AC378-3: lockAccountTokens locks every token of the account in id order', async () => {
    const { sql, db } = fakeDb();
    await lockAccountTokens(await db.connect(), 7);
    expect(sql).toEqual([TOKENS_LOCK]);
  });

  test.each([
    ['updateAccount', (db) => updateAccount(ctx(db), { id: 7, email: 'a@example.org' }, { displayName: 'A' })],
    ['deleteAccount', (db) => deleteAccount(ctx(db), 7)],
  ])('AC378-3: %s locks the tokens before the account', async (_name, run) => {
    const { sql, db } = fakeDb();
    await run(db);
    expect(sql.indexOf(TOKENS_LOCK)).toBeGreaterThan(-1);
    expect(accountLock(sql)).toBeGreaterThan(sql.indexOf(TOKENS_LOCK));
  });

  test('AC378-3: requestPasswordReset locks the tokens in id order before replacing its token', async () => {
    const { sql, db } = fakeDb();
    await requestPasswordReset(ctx(db), 'a@example.org');
    expect(sql.indexOf(TOKENS_LOCK)).toBeGreaterThan(-1);
    expect(tokenWrite(sql)).toBeGreaterThan(sql.indexOf(TOKENS_LOCK));
  });
});
