/** Append an activity entry; `targetRef` is an internal id or a slug, never an email or a token (DF4). */
export const recordActivity = (client, ctx, { associationId, actorId, action, targetRef = null }) =>
  client.query(
    'INSERT INTO activity_entry (association_id, actor_id, action, target_ref, occurred_at) VALUES ($1, $2, $3, $4, $5)',
    [associationId, actorId, action, targetRef, new Date(ctx.now())]);
