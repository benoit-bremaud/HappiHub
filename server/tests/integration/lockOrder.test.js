import { randomUUID } from 'node:crypto';
import { deleteAccount, lockAccountTokens, updateAccount } from '../../services/accounts.js';
import { runMaintenance } from '../../jobs/maintenance.js';
import { accountId, browser, buildApp, createPool, migrate, resetData, signUpVerified } from './harness.js';

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

const insertToken = (id, purpose, expiresIn = '1 hour', tokenId = randomUUID()) => pool.query(
  `INSERT INTO auth_token (id, account_id, purpose, token_hash, expires_at)
   VALUES ($4, $1, $2, gen_random_uuid()::text, now() + $3::interval)`, [id, purpose, expiresIn, tokenId]);

/** Runs `steps(tx, pending)` inside a held transaction; on failure rolls back and settles `work`. */
const holding = async (work, steps) => {
  const tx = await pool.connect();
  let pending;
  try {
    await tx.query('BEGIN');
    return await steps(tx, () => { pending = work(); pending.catch(() => {}); return pending; });
  } catch (error) {
    await tx.query('ROLLBACK').catch(() => {});
    await pending?.catch(() => {});
    throw error;
  } finally { tx.release(); }
};

/**
 * Holds the account's VERIFY token row, as `verifyEmail` does after consuming it (L1), starts
 * `work`, then takes the account lock. With opposite orders this is the 40P01 cycle of the
 * sequence diagram; with the #378 order `work` waits on the token and both finish.
 */
const raceTokenHolder = async (id, work) => {
  await insertToken(id, 'VERIFY');
  return holding(work, async (tx, start) => {
    await tx.query("SELECT 1 FROM auth_token WHERE account_id = $1 AND purpose = 'VERIFY' FOR UPDATE", [id]);
    const pending = start();
    await waitForLockWait();
    await tx.query('SELECT 1 FROM account WHERE id = $1 FOR UPDATE', [id]);
    await tx.query('COMMIT');
    return pending;
  });
};

/**
 * AC378-5: two tokens of one account; a third session holds the lower id so both contenders
 * queue, then `lockAccountTokens` (id order) races `other`, which locks the same rows its own way.
 */
const raceTwoTokens = async (id, purpose, expiresIn, other) => {
  // The higher id is inserted first, so physical order is the reverse of id order: the worst case.
  const ids = [randomUUID(), randomUUID()].sort();
  await insertToken(id, purpose, expiresIn, ids[1]);
  await insertToken(id, purpose, expiresIn, ids[0]);
  return holding(async () => {
    const locker = await pool.connect();
    try {
      await locker.query('BEGIN');
      await lockAccountTokens(locker, id);
      await locker.query('COMMIT');
    } finally { locker.release(); }
  }, async (tx, start) => {
    await tx.query('SELECT 1 FROM auth_token WHERE id = $1 FOR UPDATE', [ids[0]]);
    const locked = start();
    await waitForLockWait();
    const competing = other();
    await new Promise((resolve) => { setTimeout(resolve, 50); });
    await tx.query('COMMIT');
    return Promise.all([locked, competing]);
  });
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

  test('AC378-5: the expired-token purge skips held rows instead of deadlocking', async () => {
    await signUpVerified(app, pool, 'two@example.org');
    const id = await accountId(pool, 'two@example.org');
    const [, { tokensPurged }] = await raceTwoTokens(id, 'RESET', '-1 hour', () => runMaintenance(app.locals.ctx));
    expect(tokensPurged).toBeLessThanOrEqual(2);
  });

  test('AC378-5: a reset request racing lockAccountTokens on two RESET rows does not deadlock', async () => {
    await signUpVerified(app, pool, 'reset@example.org');
    const id = await accountId(pool, 'reset@example.org');
    const reset = await browser(app);
    const [, answer] = await raceTwoTokens(id, 'RESET', '1 hour',
      () => reset.post('/api/password-reset', { email: 'reset@example.org' }).then((r) => r));
    expect(answer.status).toBe(202);
  });
});
