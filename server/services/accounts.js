import bcrypt from 'bcryptjs';
import { withTransaction } from '../db/transaction.js';
import { canDeleteAccount } from '../domain/rules.js';
import { hashToken, isTokenShaped, newToken, TOKEN_TTL_MS } from '../domain/tokens.js';
import { closeAssociationRow, createAssociation, similarAssociationExists } from './associations.js';
import { exportEvents } from './events.js';
import { pendingInvitationsFor } from './invitations.js';
import { queueEmail } from './outbox.js';
import { DomainError } from './errors.js';
import { FIELD } from '../domain/fieldCipher.js';

const BCRYPT_COST = 12;
// Compared when no account matches, so both paths cost one bcrypt verification (AC2).
const DUMMY_HASH = bcrypt.hashSync('dummy password for constant-time paths', BCRYPT_COST);

const ACCOUNT_COLUMNS = 'id, email_enc, email_verified_at, pending_email_enc, display_name_enc, platform_role, auth_version';
/** Account row to the domain shape, decrypting its personal columns at the SQL boundary (§ 8). */
export const toAccount = (cipher, row) => ({ id: row.id, email: cipher.decrypt(FIELD.accountEmail, row.email_enc),
  emailVerifiedAt: row.email_verified_at, pendingEmail: cipher.decrypt(FIELD.accountPendingEmail, row.pending_email_enc),
  displayName: cipher.decrypt(FIELD.accountDisplayName, row.display_name_enc), platformRole: row.platform_role,
  authVersion: row.auth_version });

export const findAccount = async (db, cipher, id) => {
  const { rows: [row] } = await db.query(`SELECT ${ACCOUNT_COLUMNS} FROM account WHERE id = $1`, [id]);
  return row ? toAccount(cipher, row) : null;
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
 * email in one transaction; an invitee (UC11 3a) gets no association. An existing email only
 * gets ACCOUNT_EXISTS. Both paths hash once and answer identically, without a session.
 */
export const signUp = async (ctx, { email, password, associationName }) => {
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const similarAssociation = associationName !== undefined && await similarAssociationExists(ctx.db, associationName);
  await withTransaction(ctx.db, async (client) => {
    const { rows: [created] } = await client.query(
      `INSERT INTO account (email_enc, email_bidx, password_hash, created_at) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email_bidx) DO NOTHING RETURNING id`,
      [ctx.cipher.encrypt(FIELD.accountEmail, email), ctx.cipher.blindIndex(email), passwordHash, new Date(ctx.now())]);
    if (!created) {
      await queueEmail(client, ctx, { recipient: email, template: 'ACCOUNT_EXISTS',
        payload: { signInLink: ctx.links.signIn(), resetLink: ctx.links.forgotPassword() } });
      return;
    }
    if (associationName !== undefined) await createAssociation(client, ctx, created.id, associationName);
    const token = await issueToken(client, ctx, created.id, 'VERIFY');
    await queueEmail(client, ctx, { recipient: email, template: 'VERIFY', payload: { link: ctx.links.verify(token) } });
  });
  return { similarAssociation };
};

/**
 * Credential check for sign-in; an unknown email still costs one bcrypt comparison. An
 * unverified email cannot sign in (S1-C), so a pre-registered address never yields a session.
 */
export const authenticate = async (ctx, email, password) => {
  const { rows: [row] } = await ctx.db.query(`SELECT ${ACCOUNT_COLUMNS}, password_hash FROM account WHERE email_bidx = $1`,
    [ctx.cipher.blindIndex(email)]);
  const valid = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH);
  return row && valid && row.email_verified_at ? toAccount(ctx.cipher, row) : null;
};

/**
 * UC2: mark the email verified, or promote a pending email after re-checking it is still free.
 * No session is opened here (S1-C); pending invitations are offered after sign-in (UC11 4c).
 */
export const verifyEmail = (ctx, token) => withTransaction(ctx.db, async (client) => {
  const accountId = await consumeToken(client, ctx, token, 'VERIFY');
  if (!accountId) throw new DomainError(410, 'This link is expired or was already used. Ask for a new one.');
  const { rows: [row] } = await client.query(
    'SELECT pending_email_enc, pending_email_bidx FROM account WHERE id = $1 FOR UPDATE', [accountId]);
  const now = new Date(ctx.now());
  if (row.pending_email_bidx) {
    const { rows: taken } = await client.query('SELECT 1 FROM account WHERE email_bidx = $1', [row.pending_email_bidx]);
    if (taken.length) {
      await client.query('UPDATE account SET pending_email_enc = NULL, pending_email_bidx = NULL WHERE id = $1', [accountId]);
      throw new DomainError(410, 'This link is expired or was already used. Ask for a new one.');
    }
    // The column-bound AAD forbids copying the envelope: decrypt, then encrypt for account.email_enc.
    const email = ctx.cipher.decrypt(FIELD.accountPendingEmail, row.pending_email_enc);
    await client.query(
      `UPDATE account SET email_enc = $3, email_bidx = pending_email_bidx, pending_email_enc = NULL,
         pending_email_bidx = NULL, email_verified_at = $2 WHERE id = $1`,
      [accountId, now, ctx.cipher.encrypt(FIELD.accountEmail, email)]);
  } else {
    await client.query('UPDATE account SET email_verified_at = COALESCE(email_verified_at, $2) WHERE id = $1', [accountId, now]);
  }
  return findAccount(client, ctx.cipher, accountId);
});

/** UC2 1a/2a: neutral resend for an unverified account email or a pending new email. */
export const resendVerification = (ctx, email) => withTransaction(ctx.db, async (client) => {
  const { rows: [row] } = await client.query(
    'SELECT id FROM account WHERE (email_bidx = $1 AND email_verified_at IS NULL) OR pending_email_bidx = $1 LIMIT 1',
    [ctx.cipher.blindIndex(email)]);
  if (!row) return;
  const token = await issueToken(client, ctx, row.id, 'VERIFY');
  await queueEmail(client, ctx, { recipient: email, template: 'VERIFY', payload: { link: ctx.links.verify(token) } });
});

/** UC3 step 2: neutral; a link is queued only when the account exists. */
export const requestPasswordReset = (ctx, email) => withTransaction(ctx.db, async (client) => {
  const { rows: [row] } = await client.query('SELECT id FROM account WHERE email_bidx = $1', [ctx.cipher.blindIndex(email)]);
  if (!row) return;
  const token = await issueToken(client, ctx, row.id, 'RESET');
  await queueEmail(client, ctx, { recipient: email, template: 'RESET', payload: { link: ctx.links.reset(token) } });
});

/**
 * UC3 step 4: new hash and auth_version + 1, revoking every existing session (AC5). The link
 * proves control of the address, so it also verifies the email (S1-C: this is how a victim of a
 * pre-registration takes the account back).
 */
export const confirmPasswordReset = async (ctx, token, password) => {
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  return withTransaction(ctx.db, async (client) => {
    const accountId = await consumeToken(client, ctx, token, 'RESET');
    if (!accountId) throw new DomainError(410, 'This link is expired or was already used. Start again.');
    const { rows: [row] } = await client.query(
      `UPDATE account SET password_hash = $2, auth_version = auth_version + 1,
         email_verified_at = COALESCE(email_verified_at, $3) WHERE id = $1 RETURNING ${ACCOUNT_COLUMNS}`,
      [accountId, passwordHash, new Date(ctx.now())]);
    return toAccount(ctx.cipher, row);
  });
};

/** Resolves to true when the password matches; never throws on a mismatch. */
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
      await client.query('UPDATE account SET display_name_enc = $2 WHERE id = $1',
        [account.id, ctx.cipher.encrypt(FIELD.accountDisplayName, displayName || null)]);
    if (email !== undefined && email !== account.email) {
      const emailBidx = ctx.cipher.blindIndex(email);
      await client.query('UPDATE account SET pending_email_enc = $2, pending_email_bidx = $3 WHERE id = $1',
        [account.id, ctx.cipher.encrypt(FIELD.accountPendingEmail, email), emailBidx]);
      const { rows: taken } = await client.query('SELECT 1 FROM account WHERE email_bidx = $1', [emailBidx]);
      const token = await issueToken(client, ctx, account.id, 'VERIFY');
      if (!taken.length)
        await queueEmail(client, ctx, { recipient: email, template: 'VERIFY', payload: { link: ctx.links.verify(token) } });
      await queueEmail(client, ctx, { recipient: account.email, template: 'EMAIL_CHANGE_NOTICE', payload: {} });
    }
    if (passwordHash)
      await client.query('UPDATE account SET password_hash = $2, auth_version = auth_version + 1 WHERE id = $1',
        [account.id, passwordHash]);
    return findAccount(client, ctx.cipher, account.id);
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

/** Associations of the account as `{ name, slug, status, joinedAt }`, for the account view and the export. */
export const accountMemberships = async (db, accountId) => {
  const { rows } = await db.query(
    `SELECT a.name, a.slug, a.status, m.joined_at FROM membership m JOIN association a ON a.id = m.association_id
     WHERE m.account_id = $1 ORDER BY a.name`, [accountId]);
  return rows.map((row) => ({ name: row.name, slug: row.slug, status: row.status, joinedAt: row.joined_at }));
};

/** UC5: only the requester's own data (AC7). Participation and comments join with their brick. */
export const exportAccount = async (ctx, accountId) => {
  const account = await findAccount(ctx.db, ctx.cipher, accountId);
  const { rows: invitations } = await ctx.db.query(
    `SELECT a.slug AS association, i.email_enc, i.expires_at FROM invitation i JOIN association a ON a.id = i.association_id
     WHERE i.invited_by = $1 ORDER BY i.expires_at`, [accountId]);
  const { rows: activity } = await ctx.db.query(
    `SELECT a.slug AS association, e.action, e.target_ref, e.detail, e.occurred_at FROM activity_entry e
     JOIN association a ON a.id = e.association_id WHERE e.actor_id = $1 ORDER BY e.occurred_at`, [accountId]);
  return {
    account: { email: account.email, emailVerifiedAt: account.emailVerifiedAt, pendingEmail: account.pendingEmail,
      displayName: account.displayName },
    memberships: await accountMemberships(ctx.db, accountId),
    invitationsSent: invitations.map((i) => ({ association: i.association,
      email: ctx.cipher.decrypt(FIELD.invitationEmail, i.email_enc), expiresAt: i.expires_at })),
    activity: activity.map((e) => ({ association: e.association, action: e.action, targetRef: e.target_ref,
      detail: e.detail, occurredAt: e.occurred_at })),
    events: await exportEvents(ctx.db, accountId),
  };
};

/**
 * Account deletion effects (F26), shared by UC6 and the day-30 expiry (DF2): close associations
 * where it is the last member, delete invitations and unsent emails to its address, then the
 * account (memberships and tokens cascade; activity keeps actor_id NULL).
 */
export const deleteAccountRow = async (client, ctx, accountId) => {
  const { rows: [row] } = await client.query(
    'SELECT id, email_bidx, pending_email_bidx, platform_role FROM account WHERE id = $1 FOR UPDATE', [accountId]);
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
  // Blind indexes find every row holding the person's addresses without decrypting (AC7).
  const addresses = [row.email_bidx, row.pending_email_bidx].filter(Boolean);
  await client.query('DELETE FROM invitation WHERE email_bidx = ANY($1::bytea[])', [addresses]);
  await client.query('DELETE FROM outbox_message WHERE recipient_bidx = ANY($1::bytea[])', [addresses]);
  await client.query('DELETE FROM account WHERE id = $1', [accountId]);
  return true;
};

export const deleteAccount = (ctx, accountId) =>
  withTransaction(ctx.db, (client) => deleteAccountRow(client, ctx, accountId));
