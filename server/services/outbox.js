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
    'INSERT INTO outbox_message (recipient, template, payload, created_at) VALUES ($1, $2, $3, $4)',
    [recipient, template, payload, new Date(ctx.now())]);
  return true;
};

/**
 * Deliver due rows through the transport port. A sent row is deleted (DF1); after
 * MAX_ATTEMPTS failures the row keeps no payload (it holds the token link) and is purged by F25.
 */
export const deliverOutbox = async (pool, transport, { now = Date.now, batch = 20 } = {}) => {
  const client = await pool.connect();
  let delivered = 0;
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT id, recipient, template, payload, attempts FROM outbox_message
       WHERE failed_at IS NULL ORDER BY created_at LIMIT $1 FOR UPDATE SKIP LOCKED`, [batch]);
    for (const row of rows) {
      try {
        await transport.send(row);
        await client.query('DELETE FROM outbox_message WHERE id = $1', [row.id]);
        delivered += 1;
      } catch {
        const final = row.attempts + 1 >= MAX_ATTEMPTS;
        await client.query(
          `UPDATE outbox_message SET attempts = attempts + 1,
             failed_at = CASE WHEN $2 THEN $3::timestamptz ELSE NULL END,
             payload = CASE WHEN $2 THEN NULL ELSE payload END
           WHERE id = $1`, [row.id, final, new Date(now())]);
      }
    }
    await client.query('COMMIT');
    return delivered;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Development transport: prints the email and its link on the local console (spec § 6).
 * It is refused in production so no deployment can silently "send" through a log.
 */
export const createLogTransport = ({ production, write = console.log }) => {
  if (production) throw new Error('The log email transport is refused in production');
  return { send: async (message) => write(`[outbox] ${message.template} to ${message.recipient}: ${JSON.stringify(message.payload)}`) };
};
