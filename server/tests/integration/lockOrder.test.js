import { deleteAccount, updateAccount } from '../../services/accounts.js';
import { accountId, buildApp, createPool, migrate, resetData, signUpVerified } from './harness.js';

let pool, app;
beforeAll(() => { migrate(); pool = createPool(); });
beforeEach(async () => { await resetData(pool); ({ app } = buildApp(pool)); });
afterAll(() => pool.end());

const waitForLockWait = async () => {
  for (let i = 0; i < 200; i += 1) {
    const { rows } = await pool.query(
      "SELECT 1 FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND datname = current_database() AND pid <> pg_backend_pid()");
    if (rows.length) return;
    await new Promise((resolve) => { setTimeout(resolve, 10); });
  }
  throw new Error('no session ever waited on a lock');
};

/**
 * Holds one token row of the account, as `verifyEmail` and `confirmPasswordReset` do after
 * consuming their token (L1, L2), starts `work`, then takes the account lock. With opposite
 * orders this is the 40P01 cycle; with the #378 order `work` waits on the token and both finish.
 */
const raceTokenHolder = async (id, work) => {
  await pool.query("INSERT INTO auth_token (account_id, purpose, token_hash, expires_at) VALUES ($1, 'RESET', 'h', now() + interval '1 hour')", [id]);
  const tx = await pool.connect();
  try {
    await tx.query('BEGIN');
    await tx.query('SELECT 1 FROM auth_token WHERE account_id = $1 FOR UPDATE', [id]);
    const pending = work();
    await waitForLockWait();
    await tx.query('SELECT 1 FROM account WHERE id = $1 FOR UPDATE', [id]);
    await tx.query('COMMIT');
    return await pending;
  } finally { tx.release(); }
};

describe('account and token lock order (#378)', () => {
  test('AC378-1: an email change racing a token consumer completes without a deadlock', async () => {
    await signUpVerified(app, pool, 'me@example.org');
    const id = await accountId(pool, 'me@example.org');
    const updated = await raceTokenHolder(id,
      () => updateAccount(app.locals.ctx, { id, email: 'me@example.org' }, { email: 'new@example.org' }));
    expect(updated.pendingEmail).toBe('new@example.org');
  });

  test('AC378-2: an account deletion racing a token consumer completes without a deadlock', async () => {
    await signUpVerified(app, pool, 'gone@example.org');
    const id = await accountId(pool, 'gone@example.org');
    expect(await raceTokenHolder(id, () => deleteAccount(app.locals.ctx, id))).toBe(true);
    expect((await pool.query('SELECT 1 FROM account WHERE id = $1', [id])).rows).toHaveLength(0);
  });
});
