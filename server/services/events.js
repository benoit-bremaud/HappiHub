import { withTransaction } from '../db/transaction.js';
import { findCommune } from '../domain/communes.js';
import {
  assertTransition, COALESCE_MS, DAY_MS, DRAFT_NOTICE_GRACE_MS, eventError, hasEnded, mergeEdit, newDraft,
  publicationFailures, quotaError, quotaRetryAfter,
} from '../domain/event.js';
import { recordActivity } from './activity.js';
import { queueEmail } from './outbox.js';
import { FIELD } from '../domain/fieldCipher.js';

// Brick B persistence and transactions (spec § 5). Lock order everywhere: association row,
// then event row, so UC8 closure (which locks the association first) never deadlocks an edit.

const EVENT_COLUMNS = `e.id, e.association_id, e.type, e.title, e.short_description, e.long_description, e.starts_at,
  e.ends_at, e.venue_label, e.venue_address, e.venue_normalized_city, e.price_kind, e.price_amount_cents, e.poster_style,
  e.status, e.cancellation_reason, e.published_at, e.schedule_changed_at, e.version, e.created_at, e.updated_at,
  editor.display_name_enc AS last_edited_by_name_enc, e.last_edited_by IS NULL AS last_editor_deleted`;
const EVENT_SOURCE = 'event e LEFT JOIN account editor ON editor.id = e.last_edited_by';

const iso = (value) => (value ? value.toISOString() : null);

/** Row to the domain shape used by the rules in domain/event.js. */
const toEvent = (cipher, row) => ({
  id: row.id, status: row.status, version: row.version,
  title: row.title, type: row.type, shortDescription: row.short_description, longDescription: row.long_description,
  startsAt: iso(row.starts_at), endsAt: iso(row.ends_at), venueLabel: row.venue_label, venueAddress: row.venue_address,
  venueCity: row.venue_normalized_city, priceKind: row.price_kind, priceAmountCents: row.price_amount_cents,
  posterStyle: row.poster_style, cancellationReason: row.cancellation_reason, publishedAt: iso(row.published_at),
  scheduleChangedAt: iso(row.schedule_changed_at), createdAt: iso(row.created_at), updatedAt: iso(row.updated_at),
  // A deleted account nulls last_edited_by; a member without a display name only has no name.
  lastEditedBy: cipher.decrypt(FIELD.accountDisplayName, row.last_edited_by_name_enc),
  lastEditedByFormerMember: row.last_editor_deleted === true,
});

/** Content shared by the member and public views; the city is shown with its name (V). */
const contentView = (event, now) => ({
  id: event.id, status: event.status, title: event.title, type: event.type,
  shortDescription: event.shortDescription, longDescription: event.longDescription,
  startsAt: event.startsAt, endsAt: event.endsAt, ended: hasEnded(event, now),
  venueLabel: event.venueLabel, venueAddress: event.venueAddress,
  venueCity: event.venueCity && { code: event.venueCity, name: findCommune(event.venueCity)?.name ?? null },
  priceKind: event.priceKind, priceAmountCents: event.priceAmountCents, posterStyle: event.posterStyle,
  cancellationReason: event.cancellationReason, publishedAt: event.publishedAt, scheduleChangedAt: event.scheduleChangedAt,
});

/** Editor view: content plus the version and editing metadata (members only). */
const memberView = (event, now) => ({ ...contentView(event, now), version: event.version,
  lastEditedBy: event.lastEditedBy, lastEditedByFormerMember: event.lastEditedByFormerMember, createdAt: event.createdAt, updatedAt: event.updatedAt });

/** Parameters of the 12 editable columns, in the order of the INSERT and UPDATE texts. */
const contentParams = (event) => [event.type, event.title, event.shortDescription, event.longDescription, event.startsAt,
  event.endsAt, event.venueLabel, event.venueAddress, event.venueCity, event.priceKind, event.priceAmountCents,
  event.posterStyle];

const notFound = () => eventError(404, 'EVENT_NOT_FOUND', 'Event not found');

const assertActive = (locked) => {
  if (locked?.status !== 'ACTIVE') throw eventError(409, 'ASSOCIATION_CLOSED', 'This association is closed.');
};

/**
 * Open a member write (06, T6; G4). Lock order account → association → membership, the same
 * as account deletion (UC6), so the two cannot deadlock: the actor's account under a shared
 * lock, the association status re-read under lock (exclusive for creation, which counts the
 * quota), then the membership, so a member removed while the request was in flight cannot
 * write. Returns the locked account (`email_verified_at` for the publication guard).
 */
const lockMemberWrite = async (client, accountId, association, { exclusive = false } = {}) => {
  const { rows: [account] } = await client.query(
    'SELECT email_verified_at FROM account WHERE id = $1 FOR SHARE', [accountId]);
  if (!account) throw notFound();
  assertActive(exclusive
    ? (await client.query('SELECT status FROM association WHERE id = $1 FOR UPDATE', [association.id])).rows[0]
    : (await client.query('SELECT status FROM association WHERE id = $1 FOR SHARE', [association.id])).rows[0]);
  const { rows: [membership] } = await client.query(
    'SELECT 1 FROM membership WHERE account_id = $1 AND association_id = $2 FOR SHARE', [accountId, association.id]);
  if (!membership) throw notFound();
  return account;
};

/** An event of this association, locked for the transaction; another association's id is 404 (BC19). */
const lockEvent = async (client, cipher, association, id) => {
  const { rows: [row] } = await client.query(
    `SELECT ${EVENT_COLUMNS} FROM ${EVENT_SOURCE} WHERE e.id = $1 AND e.association_id = $2 FOR UPDATE OF e`,
    [id, association.id]);
  if (!row) throw notFound();
  return toEvent(cipher, row);
};

const findEvent = async (db, cipher, association, id) => {
  const { rows: [row] } = await db.query(
    `SELECT ${EVENT_COLUMNS} FROM ${EVENT_SOURCE} WHERE e.id = $1 AND e.association_id = $2`, [id, association.id]);
  if (!row) throw notFound();
  return toEvent(cipher, row);
};

/** Member view of the event as written by this transaction. */
const viewAfterWrite = async (client, ctx, association, id) => memberView(await findEvent(client, ctx.cipher, association, id), ctx.now());

/**
 * UC15: first save creates the draft, within 20 creations per association per 24 h (Q).
 * Returns the member view. @throws 429 EVENT_QUOTA (Retry-After), 409 ASSOCIATION_CLOSED, field 400s.
 */
export const createEvent = async (ctx, accountId, association, body) => {
  const draft = newDraft(body);
  return withTransaction(ctx.db, async (client) => {
    await lockMemberWrite(client, accountId, association, { exclusive: true });
    const now = ctx.now();
    const { rows: [window] } = await client.query(
      'SELECT count(*)::int AS count, min(created_at) AS oldest FROM event WHERE association_id = $1 AND created_at > $2',
      [association.id, new Date(now - DAY_MS)]);
    const retryAfter = quotaRetryAfter({ count: window.count, oldest: window.oldest?.getTime() }, now);
    if (retryAfter) throw quotaError(retryAfter);
    const { rows: [created] } = await client.query(
      `INSERT INTO event (association_id, type, title, short_description, long_description, starts_at, ends_at,
         venue_label, venue_address, venue_normalized_city, price_kind, price_amount_cents, poster_style,
         created_by, last_edited_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14, $15, $15) RETURNING id`,
      [association.id, ...contentParams(draft), accountId, new Date(now)]);
    await recordActivity(client, ctx, { associationId: association.id, actorId: accountId,
      action: 'EVENT_CREATED', targetRef: created.id });
    return viewAfterWrite(client, ctx, association, created.id);
  });
};

/** Member list (UC16 step 1), optionally filtered by status, most recently edited first. */
export const listEvents = async (ctx, association, status) => {
  const { rows } = await ctx.db.query(
    `SELECT ${EVENT_COLUMNS} FROM ${EVENT_SOURCE}
     WHERE e.association_id = $1 AND ($2::text IS NULL OR e.status = $2) ORDER BY e.updated_at DESC, e.id`,
    [association.id, status ?? null]);
  const now = ctx.now();
  return rows.map((row) => toEvent(ctx.cipher, row)).map((event) => ({ id: event.id, title: event.title, type: event.type, status: event.status,
    startsAt: event.startsAt, ended: hasEnded(event, now), updatedAt: event.updatedAt, lastEditedBy: event.lastEditedBy,
    lastEditedByFormerMember: event.lastEditedByFormerMember }));
};

/** Editor read; an event of another association is 404 EVENT_NOT_FOUND (BC19). */
export const readEvent = async (ctx, association, id) => memberView(await findEvent(ctx.db, ctx.cipher, association, id), ctx.now());

/**
 * EVENT_EDITED coalescing (§ 5 M step 6): the actor's latest edit entry on this event within
 * 15 minutes absorbs the new field names instead of adding a row, unless a later entry exists on
 * the event (publish, another editor), which starts a new one so the log keeps its order. Entries
 * at the same instant do not count as later: ids are random, so they carry no order.
 */
const recordEdit = async (client, ctx, association, accountId, eventId, fields) => {
  if (!fields.length) return;
  const now = ctx.now();
  const { rowCount } = await client.query(
    `UPDATE activity_entry SET occurred_at = $5, detail = jsonb_build_object('fields',
       (SELECT jsonb_agg(DISTINCT name ORDER BY name) FROM jsonb_array_elements_text(detail -> 'fields' || $4::jsonb) AS name))
     WHERE id = (SELECT id FROM activity_entry WHERE association_id = $1 AND target_ref = $3 AND actor_id = $2
         AND action = 'EVENT_EDITED' AND occurred_at > $6 ORDER BY occurred_at DESC LIMIT 1)
       AND NOT EXISTS (SELECT 1 FROM activity_entry later WHERE later.association_id = $1 AND later.target_ref = $3
         AND later.occurred_at > activity_entry.occurred_at)`,
    [association.id, accountId, eventId, JSON.stringify(fields), new Date(now), new Date(now - COALESCE_MS)]);
  if (!rowCount) await recordActivity(client, ctx, { associationId: association.id, actorId: accountId,
    action: 'EVENT_EDITED', targetRef: eventId, detail: { fields: [...fields].sort((a, b) => a.localeCompare(b)) } });
};

/**
 * UC16/UC17: merge M under the event row lock; any edit cancels a pending cleanup notice (S2).
 * Returns the member view. @throws the mergeEdit refusals, 409 ASSOCIATION_CLOSED, 404.
 */
export const editEvent = (ctx, accountId, association, id, request) =>
  withTransaction(ctx.db, async (client) => {
    await lockMemberWrite(client, accountId, association);
    const event = await lockEvent(client, ctx.cipher, association, id);
    const { merged, fields, scheduleChanged } = mergeEdit(event, request);
    const now = new Date(ctx.now());
    await client.query(
      `UPDATE event SET type = $2, title = $3, short_description = $4, long_description = $5, starts_at = $6,
         ends_at = $7, venue_label = $8, venue_address = $9, venue_normalized_city = $10, price_kind = $11,
         price_amount_cents = $12, poster_style = $13, version = version + 1, last_edited_by = $14, updated_at = $15,
         cleanup_notice_at = NULL, schedule_changed_at = CASE WHEN $16 THEN $15 ELSE schedule_changed_at END
       WHERE id = $1`, [id, ...contentParams(merged), accountId, now, scheduleChanged]);
    await recordEdit(client, ctx, association, accountId, id, fields);
    return viewAfterWrite(client, ctx, association, id);
  });

/**
 * UC18: guard G1–G4 with the email and the membership re-read under lock. Returns the member view.
 * @throws 422 PUBLICATION_REFUSED (`details.failures`), the assertTransition 409s, 404.
 */
export const publishEvent = (ctx, accountId, association, id, baseVersion) =>
  withTransaction(ctx.db, async (client) => {
    const account = await lockMemberWrite(client, accountId, association);
    const event = await lockEvent(client, ctx.cipher, association, id);
    const now = ctx.now();
    assertTransition(event, 'publish', baseVersion, now);
    const failures = publicationFailures(event, { emailVerified: Boolean(account.email_verified_at), now });
    if (failures.length) throw eventError(422, 'PUBLICATION_REFUSED', 'The event cannot be published yet.', { failures });
    await client.query(
      `UPDATE event SET status = 'PUBLISHED', published_at = $2, version = version + 1, last_edited_by = $3,
         updated_at = $2, cleanup_notice_at = NULL WHERE id = $1`, [id, new Date(now), accountId]);
    await recordActivity(client, ctx, { associationId: association.id, actorId: accountId,
      action: 'EVENT_PUBLISHED', targetRef: id });
    return viewAfterWrite(client, ctx, association, id);
  });

/** UC19: final; only an upcoming published event. Returns the member view. */
export const cancelEvent = (ctx, accountId, association, id, { baseVersion, reason }) =>
  withTransaction(ctx.db, async (client) => {
    await lockMemberWrite(client, accountId, association);
    const event = await lockEvent(client, ctx.cipher, association, id);
    const now = ctx.now();
    assertTransition(event, 'cancel', baseVersion, now);
    await client.query(
      `UPDATE event SET status = 'CANCELLED', cancellation_reason = $2, version = version + 1, last_edited_by = $3,
         updated_at = $4 WHERE id = $1`, [id, reason, accountId, new Date(now)]);
    await recordActivity(client, ctx, { associationId: association.id, actorId: accountId,
      action: 'EVENT_CANCELLED', targetRef: id });
    return viewAfterWrite(client, ctx, association, id);
  });

/** UC20: drafts only; the title is kept in the activity detail once the row is gone. */
export const deleteEvent = (ctx, accountId, association, id, baseVersion) =>
  withTransaction(ctx.db, async (client) => {
    await lockMemberWrite(client, accountId, association);
    const event = await lockEvent(client, ctx.cipher, association, id);
    assertTransition(event, 'delete', baseVersion, ctx.now());
    await client.query('DELETE FROM event WHERE id = $1', [id]);
    await recordActivity(client, ctx, { associationId: association.id, actorId: accountId,
      action: 'EVENT_DELETED', targetRef: id, detail: { title: event.title } });
  });

/**
 * Public read (§ 5): published, cancelled or archived, not hidden, association ACTIVE; anything
 * else is the same 404 (BC12, T8). No account ids, version or cleanup fields (AGENTS.md).
 */
export const readPublicEvent = async (ctx, id) => {
  const { rows: [row] } = await ctx.db.query(
    `SELECT ${EVENT_COLUMNS}, a.name AS association_name, a.slug AS association_slug
     FROM ${EVENT_SOURCE} JOIN association a ON a.id = e.association_id
     WHERE e.id = $1 AND e.status IN ('PUBLISHED', 'CANCELLED', 'ARCHIVED') AND NOT e.hidden_by_moderation
       AND a.status = 'ACTIVE'`, [id]);
  if (!row) throw notFound();
  return { ...contentView(toEvent(ctx.cipher, row), ctx.now()),
    association: { name: row.association_name, slug: row.association_slug } };
};

/**
 * UC8 hook (C1): in the closing transaction (association row already locked), upcoming published
 * events become CANCELLED. Returns the number cancelled.
 */
export const cancelUpcomingEvents = async (client, ctx, associationId, actorId) => {
  const now = ctx.now();
  const { rows } = await client.query(
    `UPDATE event SET status = 'CANCELLED', cancellation_reason = 'Association closed', version = version + 1,
       updated_at = $2 WHERE association_id = $1 AND status = 'PUBLISHED'
       AND (ends_at >= $2 OR (ends_at IS NULL AND starts_at >= $3)) RETURNING id`,
    [associationId, new Date(now), new Date(now - DAY_MS)]);
  await Promise.all(rows.map(({ id }) =>
    recordActivity(client, ctx, { associationId, actorId, action: 'EVENT_CANCELLED', targetRef: id })));
  return rows.length;
};

/** UC5: events the account created or last edited, with their association slug only. */
export const exportEvents = async (db, accountId) => {
  const { rows } = await db.query(
    `SELECT a.slug, e.id, e.title, e.type, e.status, e.starts_at, e.created_at, e.updated_at,
       e.created_by = $1 AS created, e.last_edited_by = $1 AS last_edited
     FROM event e JOIN association a ON a.id = e.association_id
     WHERE e.created_by = $1 OR e.last_edited_by = $1 ORDER BY e.created_at, e.id`, [accountId]);
  return rows.map((row) => ({ association: row.slug, id: row.id, title: row.title, type: row.type, status: row.status,
    startsAt: iso(row.starts_at), createdAt: iso(row.created_at), updatedAt: iso(row.updated_at),
    createdByYou: row.created, lastEditedByYou: row.last_edited }));
};

/**
 * Maintenance tasks (02d, S2), each idempotent: archive ended events (A1); notify the members
 * of drafts untouched for 12 months (at most 500 per run, the next run takes the rest); delete
 * those drafts 14 days after the notice.
 */
export const runEventMaintenance = async (ctx) => {
  const now = ctx.now();
  const archived = (await ctx.db.query(
    `UPDATE event SET status = 'ARCHIVED', version = version + 1, updated_at = $1
     WHERE status IN ('PUBLISHED', 'CANCELLED') AND (ends_at < $1 OR (ends_at IS NULL AND starts_at < $2))`,
    [new Date(now), new Date(now - DAY_MS)])).rowCount;

  const { rows: stale } = await ctx.db.query(
    `SELECT id FROM event WHERE status = 'DRAFT' AND cleanup_notice_at IS NULL
     AND updated_at < $1::timestamptz - interval '12 months' ORDER BY updated_at LIMIT 500`, [new Date(now)]);
  let noticed = 0;
  for (const { id } of stale) {
    noticed += await withTransaction(ctx.db, async (client) => {
      // Re-check under lock: an edit since the scan keeps the draft.
      const { rows: [draft] } = await client.query(
        `UPDATE event e SET cleanup_notice_at = $2 FROM association a
         WHERE e.id = $1 AND a.id = e.association_id AND e.status = 'DRAFT' AND e.cleanup_notice_at IS NULL
           AND e.updated_at < $2::timestamptz - interval '12 months'
         RETURNING e.association_id, e.title, a.name AS association_name`, [id, new Date(now)]);
      if (!draft) return 0;
      const { rows: members } = await client.query(
        'SELECT a.email_enc FROM membership m JOIN account a ON a.id = m.account_id WHERE m.association_id = $1',
        [draft.association_id]);
      await Promise.all(members.map(({ email_enc: emailEnc }) => queueEmail(client, ctx,
        { recipient: ctx.cipher.decrypt(FIELD.accountEmail, emailEnc),
        template: 'DRAFT_CLEANUP_NOTICE', payload: { associationName: draft.association_name, eventTitle: draft.title } })));
      return 1;
    });
  }

  const draftsDeleted = (await ctx.db.query(
    "DELETE FROM event WHERE status = 'DRAFT' AND cleanup_notice_at <= $1", [new Date(now - DRAFT_NOTICE_GRACE_MS)])).rowCount;
  return { eventsArchived: archived, draftNoticesSent: noticed, draftsDeleted };
};
