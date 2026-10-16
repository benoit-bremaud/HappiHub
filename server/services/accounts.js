import bcrypt from 'bcryptjs';
import { withTransaction } from '../db/transaction.js';
import { canDeleteAccount } from '../domain/rules.js';
import { hashToken, isTokenShaped, newToken, TOKEN_TTL_MS } from '../domain/tokens.js';
import { closeAssociationRow, createAssociation, similarAssociationExists } from './associations.js';
import { pendingInvitationsFor } from './invitations.js';
import { queueEmail } from './outbox.js';
import { DomainError } from './errors.js';

const BCRYPT_COST = 12;
// Compared when no account matches, so both paths cost one bcrypt verification (AC2).
const DUMMY_HASH = bcrypt.hashSync('dummy password for constant-time paths', BCRYPT_COST);

const ACCOUNT_COLUMNS = 'id, email, email_verified_at, pending_email, display_name, platform_role, auth_version';
export const toAccount = (row) => ({ id: row.id, email: row.email, emailVerifiedAt: row.email_verified_at,
  pendingEmail: row.pending_email, displayName: row.display_name, platformRole: row.platform_role,
  authVersion: row.auth_version });

export const findAccount = async (db, id) => {
  const { rows: [row] } = await db.query(`SELECT ${ACCOUNT_COLUMNS} FROM account WHERE id = $1`, [id]);
  return row ? toAccount(row) : null;
};

const issueToken = async (client, ctx, accountId, purpose) => {
  const { token, hash } = newToken();
  await client.query('DELETE FROM auth_token WHERE account_id = $1 AND purpose = $2', [accountId, purpose]);
  await client.query('INSERT INTO auth_token (account_id, purpose, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
    [accountId, purpose, hash, new Date(ctx.now() + TOKEN_TTL_MS[purpose])]);
  return token;
};

/** Delete a single-use token if valid and return its account id; anything else changes nothing (AC4). */
const consumeToken = async (client, ctx, token, purpose) => {
  if (!isTokenShaped(token)) return null;
  const { rows: [row] } = await client.query(
    'DELETE FROM auth_token WHERE token_hash = $1 AND purpose = $2 AND expires_at > $3 RETURNING account_id',
    [hashToken(token), purpose, new Date(ctx.now())]);
  return row?.account_id ?? null;
};

/**
 * UC1 (decision N1): a new email gets account, association, membership and a verification
 * email in one transaction; an existing email only gets ACCOUNT_EXISTS. Both paths hash once
 * and answer identically, without a session.
 */
export const signUp = async (ctx, { email, password, associationName }) => {
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const similarAssociation = await similarAssociationExists(ctx.db, associationName);
  await withTransaction(ctx.db, async (client) => {
    const { rows: [created] } = await client.query(
      'INSERT INTO account (email, password_hash, created_at) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id',
      [email, passwordHash, new Date(ctx.now())]);
    if (!created) {
      await queueEmail(client, ctx, { recipient: email, template: 'ACCOUNT_EXISTS',
        payload: { signInLink: ctx.links.signIn(), resetLink: ctx.links.forgotPassword() } });
      return;
    }
    await createAssociation(client, ctx, created.id, associationName);
    const token = await issueToken(client, ctx, created.id, 'VERIFY');
    await queueEmail(client, ctx, { recipient: email, template: 'VERIFY', payload: { link: ctx.links.verify(token) } });
  });
  return { similarAssociation };
};

/** Credential check for sign-in; an unknown email still costs one bcrypt comparison. */
export const authenticate = async (ctx, email, password) => {
  const { rows: [row] } = await ctx.db.query(`SELECT ${ACCOUNT_COLUMNS}, password_hash FROM account WHERE email = $1`, [email]);
  const valid = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH);
  return row && valid ? toAccount(row) : null;
};

/**
 * UC2: mark the email verified, or promote a pending email after re-checking it is still free.
 * Returns whether this verified a sign-up (the caller then opens a session, N1) and the pending
 * invitations now joinable (UC11 4c).
 */
export const verifyEmail = (ctx, token) => withTransaction(ctx.db, async (client) => {
  const accountId = await consumeToken(client, ctx, token, 'VERIFY');
  if (!accountId) throw new DomainError(410, 'This link is expired or was already used. Ask for a new one.');
  const { rows: [row] } = await client.query(`SELECT ${ACCOUNT_COLUMNS} FROM account WHERE id = $1 FOR UPDATE`, [accountId]);
  const now = new Date(ctx.now());
  let signUpVerification = false;
  if (row.pending_email) {
    const { rows: taken } = await client.query('SELECT 1 FROM account WHERE email = $1', [row.pending_email]);
    if (taken.length) {
      await client.query('UPDATE account SET pending_email = NULL WHERE id = $1', [accountId]);
      throw new DomainError(410, 'This link is expired or was already used. Ask for a new one.');
    }
    await client.query('UPDATE account SET email = pending_email, pending_email = NULL, email_verified_at = $2 WHERE id = $1',
      [accountId, now]);
  } else {
    signUpVerification = row.email_verified_at === null;
    await client.query('UPDATE account SET email_verified_at = COALESCE(email_verified_at, $2) WHERE id = $1', [accountId, now]);
  }
  const account = await findAccount(client, accountId);
  return { account, signUpVerification, invitations: await pendingInvitationsFor(client, account.email, ctx.now()) };
});

/** UC2 1a/2a: neutral resend for an unverified account email or a pending new email. */
export const resendVerification = (ctx, email) => withTransaction(ctx.db, async (client) => {
  const { rows: [row] } = await client.query(
    'SELECT id, email, pending_email FROM account WHERE (email = $1 AND email_verified_at IS NULL) OR pending_email = $1 LIMIT 1',
    [email]);
  if (!row) return;
  const token = await issueToken(client, ctx, row.id, 'VERIFY');
  await queueEmail(client, ctx, { recipient: email, template: 'VERIFY', payload: { link: ctx.links.verify(token) } });
});

/** UC3 step 2: neutral; a link is queued only when the account exists. */
export const requestPasswordReset = (ctx, email) => withTransaction(ctx.db, async (client) => {
  const { rows: [row] } = await client.query('SELECT id FROM account WHERE email = $1', [email]);
  if (!row) return;
  const token = await issueToken(client, ctx, row.id, 'RESET');
  await queueEmail(client, ctx, { recipient: email, template: 'RESET', payload: { link: ctx.links.reset(token) } });
});

/** UC3 step 4: new hash and auth_version + 1, revoking every existing session (AC5). */
export const confirmPasswordReset = async (ctx, token, password) => {
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  return withTransaction(ctx.db, async (client) => {
    const accountId = await consumeToken(client, ctx, token, 'RESET');
    if (!accountId) throw new DomainError(410, 'This link is expired or was already used. Start again.');
    const { rows: [row] } = await client.query(
      `UPDATE account SET password_hash = $2, auth_version = auth_version + 1 WHERE id = $1 RETURNING ${ACCOUNT_COLUMNS}`,
      [accountId, passwordHash]);
    return toAccount(row);
  });
};

export const checkPassword = async (db, accountId, password) => {
  const { rows: [row] } = await db.query('SELECT password_hash FROM account WHERE id = $1', [accountId]);
  return bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH);
};

/**
 * UC4. The caller has verified the current password when email or password change. A taken
 * email is stored as pending without sending it a link, so the answer discloses nothing (3a).
 */
export const updateAccount = async (ctx, account, { displayName, email, newPassword }) => {
  const passwordHash = newPassword ? await bcrypt.hash(newPassword, BCRYPT_COST) : null;
  return withTransaction(ctx.db, async (client) => {
    await client.query('SELECT id FROM account WHERE id = $1 FOR UPDATE', [account.id]);
    if (displayName !== undefined)
      await client.query('UPDATE account SET display_name = $2 WHERE id = $1', [account.id, displayName || null]);
    if (email !== undefined && email !== account.email) {
      await client.query('UPDATE account SET pending_email = $2 WHERE id = $1', [account.id, email]);
      const { rows: taken } = await client.query('SELECT 1 FROM account WHERE email = $1', [email]);
      const token = await issueToken(client, ctx, account.id, 'VERIFY');
      if (!taken.length)
        await queueEmail(client, ctx, { recipient: email, template: 'VERIFY', payload: { link: ctx.links.verify(token) } });
      await queueEmail(client, ctx, { recipient: account.email, template: 'EMAIL_CHANGE_NOTICE', payload: {} });
    }
    if (passwordHash)
      await client.query('UPDATE account SET password_hash = $2, auth_version = auth_version + 1 WHERE id = $1',
        [account.id, passwordHash]);
    return findAccount(client, account.id);
  });
};

/** Associations where the account is the only member: closed with the account (UC6 2a). */
export const soleMemberAssociations = async (db, accountId) => {
  const { rows } = await db.query(
    `SELECT a.name, a.slug FROM association a JOIN membership m ON m.association_id = a.id
     WHERE m.account_id = $1 AND a.status = 'ACTIVE'
       AND (SELECT count(*) FROM membership o WHERE o.association_id = a.id) = 1 ORDER BY a.name`, [accountId]);
  return rows;
};

export const accountMemberships = async (db, accountId) => {
  const { rows } = await db.query(
    `SELECT a.name, a.slug, a.status, m.joined_at FROM membership m JOIN association a ON a.id = m.association_id
     WHERE m.account_id = $1 ORDER BY a.name`, [accountId]);
  return rows.map((row) => ({ name: row.name, slug: row.slug, status: row.status, joinedAt: row.joined_at }));
};

/** UC5: only the requester's own data (AC7). Events, participation and comments join with their bricks. */
export const exportAccount = async (ctx, accountId) => {
  const account = await findAccount(ctx.db, accountId);
  const { rows: invitations } = await ctx.db.query(
    `SELECT a.slug AS association, i.email, i.expires_at FROM invitation i JOIN association a ON a.id = i.association_id
     WHERE i.invited_by = $1 ORDER BY i.expires_at`, [accountId]);
  const { rows: activity } = await ctx.db.query(
    `SELECT a.slug AS association, e.action, e.target_ref, e.occurred_at FROM activity_entry e
     JOIN association a ON a.id = e.association_id WHERE e.actor_id = $1 ORDER BY e.occurred_at`, [accountId]);
  return {
    account: { email: account.email, emailVerifiedAt: account.emailVerifiedAt, pendingEmail: account.pendingEmail,
      displayName: account.displayName },
    memberships: await accountMemberships(ctx.db, accountId),
    invitationsSent: invitations.map((i) => ({ association: i.association, email: i.email, expiresAt: i.expires_at })),
    activity: activity.map((e) => ({ association: e.association, action: e.action, targetRef: e.target_ref, occurredAt: e.occurred_at })),
  };
};

/**
 * Account deletion effects (F26), shared by UC6 and the day-30 expiry (DF2): close associations
 * where it is the last member, delete invitations and unsent emails to its address, then the
 * account (memberships and tokens cascade; activity keeps actor_id NULL).
 */
export const deleteAccountRow = async (client, ctx, accountId) => {
  const { rows: [row] } = await client.query(
    'SELECT id, email, pending_email, platform_role FROM account WHERE id = $1 FOR UPDATE', [accountId]);
  if (!row) return false;
  const { rows: [{ count }] } = await client.query(
    "SELECT count(*)::int AS count FROM account WHERE platform_role = 'SUPER_ADMIN' AND id <> $1", [accountId]);
  if (!canDeleteAccount(row.platform_role, count))
    throw new DomainError(409, 'The last super administrator cannot be deleted. Bootstrap another one first.');
  const { rows: associations } = await client.query(
    `SELECT a.id, a.slug, a.status FROM association a JOIN membership m ON m.association_id = a.id
     WHERE m.account_id = $1 ORDER BY a.id FOR UPDATE OF a`, [accountId]);
  for (const association of associations) {
    const { rows: [{ members }] } = await client.query(
      'SELECT count(*)::int AS members FROM membership WHERE association_id = $1', [association.id]);
    if (members === 1 && association.status === 'ACTIVE') await closeAssociationRow(client, ctx, association, accountId);
  }
  const addresses = [row.email, row.pending_email].filter(Boolean);
  await client.query('DELETE FROM invitation WHERE email = ANY($1)', [addresses]);
  await client.query('DELETE FROM outbox_message WHERE recipient = ANY($1)', [addresses]);
  await client.query('DELETE FROM account WHERE id = $1', [accountId]);
  return true;
};

export const deleteAccount = (ctx, accountId) =>
  withTransaction(ctx.db, (client) => deleteAccountRow(client, ctx, accountId));
