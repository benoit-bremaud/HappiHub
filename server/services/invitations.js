import { withTransaction } from '../db/transaction.js';
import { canInvite, INVITATIONS_PER_DAY } from '../domain/rules.js';
import { hashToken, isTokenShaped, newToken, TOKEN_TTL_MS } from '../domain/tokens.js';
import { maskEmail } from '../domain/email.js';
import { recordActivity } from './activity.js';
import { queueEmail } from './outbox.js';
import { DomainError } from './errors.js';

const DAY_MS = 24 * 3600e3;
const GONE = 'This invitation is no longer valid. Ask the association for a new one.';

/** Seconds until the oldest invitation of the last 24 h leaves the window (UC10 2a). */
const lockAndCheckQuota = async (client, ctx, associationId) => {
  const { rows: [association] } = await client.query(
    'SELECT status FROM association WHERE id = $1 FOR UPDATE', [associationId]);
  if (association.status !== 'ACTIVE') throw new DomainError(409, 'This association is closed.');
  const since = new Date(ctx.now() - DAY_MS);
  const { rows } = await client.query(
    `SELECT occurred_at FROM activity_entry WHERE association_id = $1 AND action = 'INVITATION_SENT'
     AND occurred_at > $2 ORDER BY occurred_at`, [associationId, since]);
  if (!canInvite(rows.length)) {
    const oldest = rows[rows.length - INVITATIONS_PER_DAY].occurred_at.getTime();
    throw new DomainError(429, 'Daily invitation limit reached (10 per association).',
      { retryAfter: Math.max(1, Math.ceil((oldest + DAY_MS - ctx.now()) / 1000)) });
  }
};

const sendInvitation = async (client, ctx, { actor, association, invitationId, email }) => {
  const { token, hash } = newToken();
  const expiresAt = new Date(ctx.now() + TOKEN_TTL_MS.INVITATION);
  await client.query('UPDATE invitation SET token_hash = $2, expires_at = $3 WHERE id = $1', [invitationId, hash, expiresAt]);
  const link = ctx.links.invitation(token);
  await queueEmail(client, ctx, { recipient: email, template: 'INVITATION',
    payload: { link, associationName: association.name } });
  await recordActivity(client, ctx, { associationId: association.id, actorId: actor.id,
    action: 'INVITATION_SENT', targetRef: invitationId });
  return { id: invitationId, email, expiresAt, link };
};

/**
 * UC10: not an existing member, one pending invitation per email, 10 per day. The inviter is
 * verified because only verified accounts can sign in (S1-C).
 */
export const createInvitation = (ctx, actor, association, email) => withTransaction(ctx.db, async (client) => {
  await lockAndCheckQuota(client, ctx, association.id);
  const emailBidx = ctx.cipher.blindIndex(email);
  const { rows: member } = await client.query(
    'SELECT 1 FROM membership m JOIN account a ON a.id = m.account_id WHERE m.association_id = $1 AND a.email_bidx = $2',
    [association.id, emailBidx]);
  if (member.length) throw new DomainError(409, 'This person is already a member.');
  // An expired row not yet removed by the hourly job is replaced (spec § 4).
  await client.query("DELETE FROM invitation WHERE association_id = $1 AND email_bidx = $2 AND expires_at <= $3",
    [association.id, emailBidx, new Date(ctx.now())]);
  const { rows: pending } = await client.query(
    "SELECT id FROM invitation WHERE association_id = $1 AND email_bidx = $2 AND status = 'PENDING'", [association.id, emailBidx]);
  if (pending.length) throw new DomainError(409, 'A pending invitation exists for this email. Resend it instead.',
    { invitationId: pending[0].id });
  // Placeholder hash replaced at once by sendInvitation, inside the same transaction.
  const { rows: [created] } = await client.query(
    `INSERT INTO invitation (association_id, email_enc, email_bidx, token_hash, expires_at, invited_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [association.id, ctx.cipher.encrypt('invitation.email_enc', email), emailBidx, newToken().hash, new Date(ctx.now()), actor.id]);
  return sendInvitation(client, ctx, { actor, association, invitationId: created.id, email });
});

/** UC10: a new token replaces the old one (the previous link stops) and counts in the daily quota. */
export const resendInvitation = (ctx, actor, association, invitationId) => withTransaction(ctx.db, async (client) => {
  await lockAndCheckQuota(client, ctx, association.id);
  const { rows: [invitation] } = await client.query(
    "SELECT id, email_enc FROM invitation WHERE id = $1 AND association_id = $2 AND status = 'PENDING' FOR UPDATE",
    [invitationId, association.id]);
  if (!invitation) throw new DomainError(404, 'Invitation not found');
  return sendInvitation(client, ctx, { actor, association, invitationId: invitation.id,
    email: ctx.cipher.decrypt('invitation.email_enc', invitation.email_enc) });
});

export const listInvitations = async (ctx, association) => {
  const { rows } = await ctx.db.query(
    `SELECT id, email_enc, expires_at FROM invitation WHERE association_id = $1 AND status = 'PENDING' AND expires_at > $2
     ORDER BY expires_at`, [association.id, new Date(ctx.now())]);
  return rows.map((row) => ({ id: row.id, email: ctx.cipher.decrypt('invitation.email_enc', row.email_enc),
    expiresAt: row.expires_at }));
};

/** UC10 3a: revoking deletes the row, so the link stops at once (DF4). */
export const revokeInvitation = (ctx, actor, association, invitationId) => withTransaction(ctx.db, async (client) => {
  const { rowCount } = await client.query('DELETE FROM invitation WHERE id = $1 AND association_id = $2',
    [invitationId, association.id]);
  if (!rowCount) throw new DomainError(404, 'Invitation not found');
  await recordActivity(client, ctx, { associationId: association.id, actorId: actor.id,
    action: 'INVITATION_REVOKED', targetRef: invitationId });
});

const VALID_INVITATION = `SELECT i.id, i.email_enc, i.association_id, a.name, a.slug FROM invitation i
  JOIN association a ON a.id = i.association_id
  WHERE i.status = 'PENDING' AND i.expires_at > $2 AND a.status = 'ACTIVE'`;

/** Read-only lookup for the invitation page; every invalid case is the same 410 (UC11 2a). */
export const lookupInvitation = async (ctx, token) => {
  if (!isTokenShaped(token)) throw new DomainError(410, GONE);
  const { rows: [invitation] } = await ctx.db.query(`${VALID_INVITATION} AND i.token_hash = $1`,
    [hashToken(token), new Date(ctx.now())]);
  if (!invitation) throw new DomainError(410, GONE);
  return { associationName: invitation.name, associationSlug: invitation.slug,
    email: ctx.cipher.decrypt('invitation.email_enc', invitation.email_enc) };
};

/** Pending, unexpired invitations for a verified address, offered after UC2 (UC11 4c). */
export const pendingInvitationsFor = async (db, cipher, email, now) => {
  const { rows } = await db.query(`${VALID_INVITATION} AND i.email_bidx = $1 ORDER BY a.name`,
    [cipher.blindIndex(email), new Date(now)]);
  return rows.map((row) => ({ id: row.id, associationName: row.name, associationSlug: row.slug }));
};

/**
 * UC11 per 02b: the invitation row is locked, so two parallel accepts admit once. Only the
 * invited email joins; a signed-in account is always verified (S1-C). `invitationId` is the "Join" choice of UC11 4c, valid only for
 * the same signed-in, verified address.
 */
export const acceptInvitation = (ctx, account, { token, invitationId }) => withTransaction(ctx.db, async (client) => {
  let invitation;
  if (token !== undefined) {
    if (!isTokenShaped(token)) throw new DomainError(410, GONE);
    ({ rows: [invitation] } = await client.query(`${VALID_INVITATION} AND i.token_hash = $1 FOR UPDATE OF i`,
      [hashToken(token), new Date(ctx.now())]));
  } else {
    ({ rows: [invitation] } = await client.query(`${VALID_INVITATION} AND i.id = $1 FOR UPDATE OF i`,
      [invitationId, new Date(ctx.now())]));
  }
  if (!invitation) throw new DomainError(410, GONE);
  // Both sides are folded before storage (foldEmail), so decrypted values compare directly.
  const invitedEmail = ctx.cipher.decrypt('invitation.email_enc', invitation.email_enc);
  if (invitedEmail !== account.email)
    throw new DomainError(403, `This invitation is for ${maskEmail(invitedEmail)}. Ask the association to invite your address.`,
      { hint: maskEmail(invitedEmail) });
  await client.query(
    'INSERT INTO membership (account_id, association_id, joined_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
    [account.id, invitation.association_id, new Date(ctx.now())]);
  await client.query('DELETE FROM invitation WHERE id = $1', [invitation.id]);
  await recordActivity(client, ctx, { associationId: invitation.association_id, actorId: account.id,
    action: 'MEMBER_JOINED', targetRef: account.id });
  return { status: 'JOINED', associationSlug: invitation.slug };
});
