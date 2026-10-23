import { withTransaction } from '../db/transaction.js';

const MAX_ATTEMPTS = 5;
// Templates limited per recipient (quota "Verification / reset emails", 10 per hour).
const CAPPED_TEMPLATES = new Set(['VERIFY', 'RESET', 'ACCOUNT_EXISTS']);

/**
 * Queue one email in the caller's transaction (DF1). Capped templates over the per-recipient
 * limit are dropped silently so the caller's neutral answer is unchanged (AC17).
 */
export const queueEmail = async (client, ctx, { recipient, template, payload }) => {
  if (CAPPED_TEMPLATES.has(template) && !ctx.limits.recipient.take(recipient, ctx.now())) return false;
  await client.query(
    'INSERT INTO outbox_message (recipient_enc, recipient_bidx, template, payload_enc, created_at) VALUES ($1, $2, $3, $4, $5)',
    [ctx.cipher.encrypt('outbox_message.recipient_enc', recipient), ctx.cipher.blindIndex(recipient), template,
      payload === undefined || payload === null ? null : ctx.cipher.encrypt('outbox_message.payload_enc', JSON.stringify(payload)),
      new Date(ctx.now())]);
  return true;
};

/**
 * Deliver due rows through the transport port. A sent row is deleted (DF1); after
 * MAX_ATTEMPTS failures the row keeps no payload (it holds the token link) and is purged by F25.
 * The transport receives the decrypted message; the database only holds envelopes (§ 8).
 */
export const deliverOutbox = (pool, transport, { cipher, now = Date.now, batch = 20 }) =>
  withTransaction(pool, async (client) => {
    let delivered = 0;
    const { rows } = await client.query(
      `SELECT id, recipient_enc, template, payload_enc, attempts FROM outbox_message
       WHERE failed_at IS NULL ORDER BY created_at LIMIT $1 FOR UPDATE SKIP LOCKED`, [batch]);
    for (const row of rows) {
      try {
        const payload = cipher.decrypt('outbox_message.payload_enc', row.payload_enc);
        await transport.send({ id: row.id, template: row.template,
          recipient: cipher.decrypt('outbox_message.recipient_enc', row.recipient_enc),
          payload: payload === null ? null : JSON.parse(payload) });
        await client.query('DELETE FROM outbox_message WHERE id = $1', [row.id]);
        delivered += 1;
      } catch {
        const final = row.attempts + 1 >= MAX_ATTEMPTS;
        await client.query(
          `UPDATE outbox_message SET attempts = attempts + 1,
             failed_at = CASE WHEN $2 THEN $3::timestamptz ELSE NULL END,
             payload_enc = CASE WHEN $2 THEN NULL ELSE payload_enc END
           WHERE id = $1`, [row.id, final, new Date(now())]);
      }
    }
    return delivered;
  });

/**
 * Development transport: prints the email and its link on the local console (spec § 6).
 * It is refused in production so no deployment can silently "send" through a log.
 */
export const createLogTransport = ({ production, write = console.log }) => {
  if (production) throw new Error('The log email transport is refused in production');
  return { send: async (message) => write(`[outbox] ${message.template} to ${message.recipient}: ${JSON.stringify(message.payload)}`) };
};
