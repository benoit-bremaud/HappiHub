import { randomBytes } from 'node:crypto';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { IDLE_MS } from '../utils/sessionPolicy.js';

/** PostgreSQL store on the shared pool; the table comes from the migration, never created at boot. */
export const createSessionStore = (pool, onError) => new (connectPgSimple(session))({
  pool, tableName: 'session', createTableIfMissing: false, errorLog: onError,
});
/** Inject a durable store in production, or an explicitly isolated test store. */
export const sessionMiddleware = (config, store) => {
  if (!store) throw new Error('Session store is required');
  return session({ secret: config.sessionSecret, store, name: config.cookieName,
    resave: false, saveUninitialized: false, rolling: true,
    cookie: { httpOnly: true, secure: config.production, sameSite: 'lax', path: '/' },
  });
};
/** Expire the browser cookie with the same attributes it was issued with. */
export const clearSessionCookie = (req, res) => res.clearCookie(req.app.locals.config.cookieName,
  { httpOnly: true, secure: req.app.locals.config.production, sameSite: 'lax', path: '/' });
/** Promise wrapper for express-session's callback methods (save, regenerate, destroy). */
export const sessionOperation = (session, method) => new Promise((resolve, reject) =>
  session[method]((error) => error ? reject(error) : resolve()));

/** Regenerate the identifier and bind it to the account (sign-in, N1 verification, reset). */
export const openAccountSession = async (req, account) => {
  await sessionOperation(req.session, 'regenerate');
  Object.assign(req.session, { accountId: account.id, authVersion: account.authVersion,
    startedAt: req.app.locals.now(), csrfToken: randomBytes(32).toString('hex') });
  req.session.cookie.maxAge = IDLE_MS;
  await sessionOperation(req.session, 'save');
};
