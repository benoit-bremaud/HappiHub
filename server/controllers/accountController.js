import { randomBytes } from 'node:crypto';
import Joi from 'joi';
import { emailSchema } from '../domain/email.js';
import { existingPasswordSchema, newPasswordSchema, PASSWORD_HINT } from '../domain/password.js';
import { clearSessionCookie, openAccountSession, sessionOperation } from '../config/session.js';
import { trustedOrigin } from '../middleware/csrf.js';
import { IDLE_MS } from '../utils/sessionPolicy.js';
import {
  accountMemberships, authenticate, checkPassword, confirmPasswordReset, deleteAccount, exportAccount, findAccount,
  requestPasswordReset, resendVerification, signUp, soleMemberAssociations, updateAccount, verifyEmail,
} from '../services/accounts.js';
import { createAdditionalAssociation } from '../services/associations.js';
import { DomainError } from '../services/errors.js';
import { guardLimit, handle, validate } from './handle.js';

const CHECK_INBOX = 'Check your inbox to continue.';
const associationName = Joi.string().trim().min(2).max(100);

const accountView = async (db, account) => ({
  id: account.id, email: account.email, emailVerified: Boolean(account.emailVerifiedAt),
  pendingEmail: account.pendingEmail, displayName: account.displayName,
  associations: await accountMemberships(db, account.id),
});

/** Bootstrap a CSRF-protected visit without issuing a browser-readable credential. */
export const getSession = async (req, res) => {
  if (!trustedOrigin(req)) return res.status(403).json({ message: 'Request origin rejected' });
  try {
    const { db } = req.app.locals.ctx;
    if (req.session.accountId) {
      const account = await findAccount(db, req.session.accountId);
      if (account && account.authVersion === req.session.authVersion)
        return res.json({ account: await accountView(db, account), csrfToken: req.session.csrfToken });
      await sessionOperation(req.session, 'regenerate');
    }
    if (!req.session.csrfToken) {
      Object.assign(req.session, { startedAt: req.app.locals.now(), csrfToken: randomBytes(32).toString('hex') });
      req.session.cookie.maxAge = IDLE_MS;
      await sessionOperation(req.session, 'save');
    }
    return res.json({ account: null, csrfToken: req.session.csrfToken });
  } catch { return res.status(503).json({ message: 'Session unavailable' }); }
};

const signInSchema = Joi.object({ email: emailSchema.required(), password: existingPasswordSchema.required() });
/** Neutral 401 for unknown email or wrong password; failures are rate-limited per IP and per (email, IP). */
export const signIn = async (req, res) => {
  const { error, value } = signInSchema.validate(req.body ?? {});
  if (error) return res.status(400).json({ message: 'Invalid request' });
  try {
    const account = await authenticate(req.app.locals.ctx, value.email, value.password);
    if (!account) return res.status(401).json({ message: 'Invalid email or password' });
    await openAccountSession(req, account);
    return res.json({ account: await accountView(req.app.locals.ctx.db, account), csrfToken: req.session.csrfToken });
  } catch {
    req.session = null; clearSessionCookie(req, res);
    return res.status(503).json({ message: 'Unable to sign in' });
  }
};

export const signOut = async (req, res) => {
  try { await sessionOperation(req.session, 'destroy'); clearSessionCookie(req, res); return res.status(204).end(); }
  catch { return res.status(503).json({ message: 'Unable to revoke session' }); }
};

const signUpSchema = Joi.object({ email: emailSchema.required(), password: newPasswordSchema.required(),
  associationName });
/**
 * UC1 (N1): the same 202 and no cookie whether or not the email has an account. Without an
 * association name it is the invitee sign-up of UC11 3a (amendment A-D1).
 */
export const signUpHandler = handle(async (req, res) => {
  const { error, value } = signUpSchema.validate(req.body ?? {});
  if (error) {
    const field = error.details[0].path.join('.');
    return res.status(400).json({ message: 'Invalid request', field, ...(field === 'password' && { hint: PASSWORD_HINT }) });
  }
  const { similarAssociation } = await signUp(req.app.locals.ctx, value);
  return res.status(202).json({ message: CHECK_INBOX, similarAssociation });
});

/** UC1 1b: a signed-in account creates another association (≤ 5 in total). */
export const createAssociationHandler = handle(async (req, res) => {
  const { name } = validate(Joi.object({ name: associationName.required() }), req.body);
  const association = await createAdditionalAssociation(req.app.locals.ctx, req.account.id, name);
  return res.status(201).json({ name: association.name, slug: association.slug });
});

const tokenSchema = Joi.object({ token: Joi.string().max(100).required() });
/** UC2: a sign-up verification opens a regenerated session and lands in UC15 (N1). */
export const verifyEmailHandler = handle(async (req, res) => {
  const { token } = validate(tokenSchema, req.body);
  const { account, signUpVerification, invitations } = await verifyEmail(req.app.locals.ctx, token);
  const signedIn = signUpVerification || req.session.accountId === account.id;
  if (signUpVerification) await openAccountSession(req, account);
  return res.json({ signedIn, signUpVerification, invitations,
    ...(signUpVerification && { csrfToken: req.session.csrfToken }) });
});

const emailBody = Joi.object({ email: emailSchema.required() });
export const resendVerificationHandler = handle(async (req, res) => {
  const { email } = validate(emailBody, req.body);
  await resendVerification(req.app.locals.ctx, email);
  return res.status(202).json({ message: CHECK_INBOX });
});

export const requestResetHandler = handle(async (req, res) => {
  const { email } = validate(emailBody, req.body);
  await requestPasswordReset(req.app.locals.ctx, email);
  return res.status(202).json({ message: CHECK_INBOX });
});

/** UC3: every other session is revoked by auth_version; this request gets a new session. */
export const confirmResetHandler = handle(async (req, res) => {
  const { error, value } = Joi.object({ token: Joi.string().max(100).required(), password: newPasswordSchema.required() })
    .validate(req.body ?? {});
  if (error) return res.status(400).json({ message: 'Invalid request', hint: PASSWORD_HINT });
  const account = await confirmPasswordReset(req.app.locals.ctx, value.token, value.password);
  await openAccountSession(req, account);
  return res.json({ csrfToken: req.session.csrfToken });
});

export const getAccount = handle(async (req, res) => res.json({
  ...(await accountView(req.app.locals.ctx.db, req.account)),
  soleMemberOf: await soleMemberAssociations(req.app.locals.ctx.db, req.account.id),
}));

/** Current password checked under the per-account limit (UC4 2a, UC6 2b). */
const requireCurrentPassword = async (req, password) => {
  const { ctx } = req.app.locals;
  guardLimit(ctx.limits.currentPassword, req.account.id, ctx.now());
  if (password === undefined || !(await checkPassword(ctx.db, req.account.id, password))) {
    ctx.limits.currentPassword.hit(req.account.id, ctx.now());
    throw new DomainError(403, 'The current password is incorrect.');
  }
};

const updateSchema = Joi.object({
  displayName: Joi.string().trim().max(100).allow(''),
  email: emailSchema,
  newPassword: newPasswordSchema,
  currentPassword: existingPasswordSchema,
}).min(1);
/** UC4: email and password changes need the current password; a new password keeps this session only. */
export const updateAccountHandler = handle(async (req, res) => {
  const { error, value } = updateSchema.validate(req.body ?? {});
  if (error) return res.status(400).json({ message: 'Invalid request', field: error.details[0].path.join('.'), hint: PASSWORD_HINT });
  if (value.email !== undefined || value.newPassword !== undefined) await requireCurrentPassword(req, value.currentPassword);
  const account = await updateAccount(req.app.locals.ctx, req.account, value);
  if (value.newPassword) {
    req.session.authVersion = account.authVersion;
    await sessionOperation(req.session, 'save');
  }
  return res.json(await accountView(req.app.locals.ctx.db, account));
});

/** UC5: a JSON download, limited to 3 per day per account. */
export const exportHandler = handle(async (req, res) => {
  const { ctx } = req.app.locals;
  if (!ctx.limits.exports.take(req.account.id, ctx.now()))
    guardLimit(ctx.limits.exports, req.account.id, ctx.now());
  res.set('Content-Disposition', 'attachment; filename="happihub-export.json"');
  return res.json(await exportAccount(ctx, req.account.id));
});

/** UC6: password and explicit confirmation; sessions die with the account row (auth check fails). */
export const deleteAccountHandler = handle(async (req, res) => {
  const { password } = validate(Joi.object({ password: existingPasswordSchema.required(), confirm: Joi.valid(true).required() }), req.body);
  await requireCurrentPassword(req, password);
  await deleteAccount(req.app.locals.ctx, req.account.id);
  await sessionOperation(req.session, 'destroy');
  clearSessionCookie(req, res);
  return res.status(204).end();
});
