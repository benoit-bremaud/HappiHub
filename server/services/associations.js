import { withTransaction } from '../db/transaction.js';
import { nextFreeSlug, slugify } from '../domain/slug.js';
import { canCreateAssociation, canLoseMember } from '../domain/rules.js';
import { recordActivity } from './activity.js';
import { cancelUpcomingEvents } from './events.js';
import { queueEmail } from './outbox.js';
import { DomainError } from './errors.js';

/** A similar name exists when the base slug, or a suffixed variant, is taken (UC1 4b). */
export const similarAssociationExists = async (db, name) => {
  const { rows } = await db.query(
    "SELECT 1 FROM association WHERE slug = $1 OR slug ~ ('^' || $1 || '-[0-9]+$') LIMIT 1", [slugify(name)]);
  return rows.length > 0;
};

/** Create an association with its first member on a locked account row (UC1, ≤ 5 in total). */
export const createAssociation = async (client, ctx, accountId, name) => {
  const { rows: [account] } = await client.query(
    'SELECT associations_created FROM account WHERE id = $1 FOR UPDATE', [accountId]);
  if (!canCreateAssociation(account.associations_created))
    throw new DomainError(409, 'This account has already created the maximum of 5 associations.');
  const base = slugify(name);
  // Serialize slug allocation for the same base so concurrent sign-ups get distinct suffixes.
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [base]);
  const { rows: taken } = await client.query(
    "SELECT slug FROM association WHERE slug = $1 OR slug ~ ('^' || $1 || '-[0-9]+$')", [base]);
  const slug = nextFreeSlug(base, taken.map((row) => row.slug));
  const now = new Date(ctx.now());
  const { rows: [association] } = await client.query(
    'INSERT INTO association (name, slug, created_by, created_at) VALUES ($1, $2, $3, $4) RETURNING id, name, slug',
    [name, slug, accountId, now]);
  await client.query('INSERT INTO membership (account_id, association_id, joined_at) VALUES ($1, $2, $3)',
    [accountId, association.id, now]);
  await client.query('UPDATE account SET associations_created = associations_created + 1 WHERE id = $1', [accountId]);
  await recordActivity(client, ctx, { associationId: association.id, actorId: accountId,
    action: 'ASSOCIATION_CREATED', targetRef: slug });
  return association;
};

export const createAdditionalAssociation = (ctx, accountId, name) =>
  withTransaction(ctx.db, (client) => createAssociation(client, ctx, accountId, name));

/**
 * Apply UC8 on a locked association: status CLOSED, pending invitations dropped, upcoming
 * published events cancelled (brick B, C1: drafts stay until the purge), logged.
 * The API key revocation hook is added by brick C.
 */
export const closeAssociationRow = async (client, ctx, association, actorId) => {
  await client.query("UPDATE association SET status = 'CLOSED', closed_at = $2 WHERE id = $1",
    [association.id, new Date(ctx.now())]);
  await client.query('DELETE FROM invitation WHERE association_id = $1', [association.id]);
  await cancelUpcomingEvents(client, ctx, association.id, actorId);
  await recordActivity(client, ctx, { associationId: association.id, actorId,
    action: 'ASSOCIATION_CLOSED', targetRef: association.slug });
};

/** Re-check membership in the database on every association-scoped request (06, M1/T6). */
export const findMembership = async (db, accountId, slug) => {
  const { rows: [association] } = await db.query(
    `SELECT a.id, a.name, a.slug, a.city, a.presentation, a.website_url, a.contact_email_enc, a.status, a.closed_at
     FROM association a JOIN membership m ON m.association_id = a.id
     WHERE a.slug = $1 AND m.account_id = $2`, [slug, accountId]);
  return association ?? null;
};

export const associationView = async ({ db, cipher }, association) => {
  const { rows: members } = await db.query(
    `SELECT a.id, a.display_name_enc, a.email_enc, m.joined_at FROM membership m JOIN account a ON a.id = m.account_id
     WHERE m.association_id = $1 ORDER BY m.joined_at`, [association.id]);
  return {
    name: association.name, slug: association.slug, city: association.city,
    presentation: association.presentation, websiteUrl: association.website_url,
    contactEmail: cipher.decrypt('association.contact_email_enc', association.contact_email_enc),
    status: association.status, closedAt: association.closed_at,
    members: members.map((m) => ({ accountId: m.id, displayName: cipher.decrypt('account.display_name_enc', m.display_name_enc),
      email: cipher.decrypt('account.email_enc', m.email_enc), joinedAt: m.joined_at })),
  };
};

const PROFILE_COLUMNS = { name: 'name', city: 'city', presentation: 'presentation',
  websiteUrl: 'website_url', contactEmail: 'contact_email_enc' };

/** UC7: text fields only (logo with the image brick); the slug never changes on rename. */
export const updateProfile = (ctx, accountId, association, changes) => withTransaction(ctx.db, async (client) => {
  const { rows: [locked] } = await client.query(
    'SELECT status FROM association WHERE id = $1 FOR UPDATE', [association.id]);
  if (locked.status !== 'ACTIVE') throw new DomainError(409, 'This association is closed.');
  const values = Object.keys(PROFILE_COLUMNS).map((key) => {
    const value = key in changes ? changes[key] : null;
    return key === 'contactEmail' ? ctx.cipher.encrypt('association.contact_email_enc', value) : value;
  });
  const present = Object.keys(PROFILE_COLUMNS).map((key) => key in changes);
  // Fixed query text: each column is updated only when its "present" flag is true.
  await client.query(
    `UPDATE association SET
       name = CASE WHEN $2 THEN $7 ELSE name END,
       city = CASE WHEN $3 THEN $8 ELSE city END,
       presentation = CASE WHEN $4 THEN $9 ELSE presentation END,
       website_url = CASE WHEN $5 THEN $10 ELSE website_url END,
       contact_email_enc = CASE WHEN $6 THEN $11 ELSE contact_email_enc END
     WHERE id = $1`, [association.id, ...present, ...values]);
  await recordActivity(client, ctx, { associationId: association.id, actorId: accountId,
    action: 'ASSOCIATION_UPDATED', targetRef: association.slug });
});

/** UC8: only the last member may close; afterwards the slug stays reserved by the CLOSED row. */
export const closeAssociation = (ctx, accountId, association) => withTransaction(ctx.db, async (client) => {
  const { rows: [locked] } = await client.query(
    'SELECT id, slug, status FROM association WHERE id = $1 FOR UPDATE', [association.id]);
  if (locked.status !== 'ACTIVE') throw new DomainError(409, 'This association is already closed.');
  const { rows: [{ count }] } = await client.query(
    'SELECT count(*)::int AS count FROM membership WHERE association_id = $1', [association.id]);
  if (count > 1) throw new DomainError(409, 'Other members remain. They must leave or be removed first.');
  await closeAssociationRow(client, ctx, locked, accountId);
});

/** UC12: end a membership on a locked association; never leaves it without a member. */
export const endMembership = (ctx, actor, association, targetId) => withTransaction(ctx.db, async (client) => {
  await client.query('SELECT id FROM association WHERE id = $1 FOR UPDATE', [association.id]);
  const { rows: members } = await client.query(
    'SELECT m.account_id, a.email_enc FROM membership m JOIN account a ON a.id = m.account_id WHERE m.association_id = $1',
    [association.id]);
  if (!members.some((m) => m.account_id === actor.id)) throw new DomainError(403, 'Access denied');
  const target = members.find((m) => m.account_id === targetId);
  if (!target) throw new DomainError(404, 'Member not found');
  if (!canLoseMember(members.length))
    throw new DomainError(409, 'The last member cannot leave. Close the association or delete your account instead.');
  await client.query('DELETE FROM membership WHERE association_id = $1 AND account_id = $2', [association.id, targetId]);
  const leaving = targetId === actor.id;
  await recordActivity(client, ctx, { associationId: association.id, actorId: actor.id,
    action: leaving ? 'MEMBER_LEFT' : 'MEMBER_REMOVED', targetRef: targetId });
  // No dispute link until UC13 ships with the administration brick (S1).
  if (!leaving) await queueEmail(client, ctx, { recipient: ctx.cipher.decrypt('account.email_enc', target.email_enc), template: 'MEMBER_REMOVED',
    payload: { associationName: association.name } });
});
