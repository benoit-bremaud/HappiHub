import { withTransaction } from '../db/transaction.js';
import { newToken, TOKEN_TTL_MS } from '../domain/tokens.js';
import { deleteAccountRow } from '../services/accounts.js';
import { runEventMaintenance } from '../services/events.js';
import { queueEmail } from '../services/outbox.js';

const DAY_MS = 24 * 3600e3;

/**
 * Hourly maintenance for brick D tables (AC19): F20 expired invitations, F24/DF2 reminder at
 * day 23 and deletion at day 30 of never-verified accounts (UC6 effects), F25 outbox failures
 * older than 30 days, expired auth tokens, F19 activity entries older than 12 months, and
 * closed associations after their 30-day notice (UC8), then the brick B event tasks (archive,
 * draft cleanup notice and deletion). Returns counts for the operator log.
 */
export const runMaintenance = async (ctx) => {
  const now = ctx.now();
  const at = (offsetMs) => new Date(now - offsetMs);
  const counts = {};
  counts.invitationsExpired = (await ctx.db.query('DELETE FROM invitation WHERE expires_at <= $1', [at(0)])).rowCount;
  counts.tokensPurged = (await ctx.db.query('DELETE FROM auth_token WHERE expires_at <= $1', [at(0)])).rowCount;

  const { rows: toRemind } = await ctx.db.query(
    `SELECT id, email_enc FROM account WHERE email_verified_at IS NULL AND verification_reminder_at IS NULL
     AND created_at <= $1 AND created_at > $2`, [at(23 * DAY_MS), at(30 * DAY_MS)]);
  for (const account of toRemind) {
    await withTransaction(ctx.db, async (client) => {
      const { token, hash } = newToken();
      await client.query("DELETE FROM auth_token WHERE account_id = $1 AND purpose = 'VERIFY'", [account.id]);
      await client.query("INSERT INTO auth_token (account_id, purpose, token_hash, expires_at) VALUES ($1, 'VERIFY', $2, $3)",
        [account.id, hash, new Date(now + TOKEN_TTL_MS.VERIFY)]);
      await queueEmail(client, ctx, { recipient: ctx.cipher.decrypt('account.email_enc', account.email_enc), template: 'VERIFY_REMINDER',
        payload: { link: ctx.links.verify(token) } });
      await client.query('UPDATE account SET verification_reminder_at = $2 WHERE id = $1', [account.id, new Date(now)]);
    });
  }
  counts.remindersQueued = toRemind.length;

  const { rows: expired } = await ctx.db.query(
    'SELECT id FROM account WHERE email_verified_at IS NULL AND created_at <= $1', [at(30 * DAY_MS)]);
  for (const account of expired) await withTransaction(ctx.db, (client) => deleteAccountRow(client, ctx, account.id));
  counts.unverifiedAccountsDeleted = expired.length;

  counts.outboxFailuresPurged = (await ctx.db.query(
    'DELETE FROM outbox_message WHERE failed_at <= $1', [at(30 * DAY_MS)])).rowCount;
  counts.activityPurged = (await ctx.db.query(
    "DELETE FROM activity_entry WHERE occurred_at <= $1::timestamptz - interval '12 months'", [at(0)])).rowCount;
  counts.closedAssociationsPurged = (await ctx.db.query(
    "DELETE FROM association WHERE status = 'CLOSED' AND closed_at <= $1", [at(30 * DAY_MS)])).rowCount;
  return { ...counts, ...(await runEventMaintenance(ctx)) };
};
