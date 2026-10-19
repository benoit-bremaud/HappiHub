/**
 * Append an activity entry; `targetRef` is an internal id or a slug, never an email or a token (DF4).
 * `detail` (A-B1) is `{fields: [names]}` or `{title}`: field names, never field values (J4 D4).
 */
export const recordActivity = (client, ctx, { associationId, actorId, action, targetRef = null, detail = null }) =>
  client.query(
    'INSERT INTO activity_entry (association_id, actor_id, action, target_ref, occurred_at, detail) VALUES ($1, $2, $3, $4, $5, $6)',
    [associationId, actorId, action, targetRef, new Date(ctx.now()), detail]);
