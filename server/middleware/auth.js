import { findAccount } from '../services/accounts.js';
import { findMembership } from '../services/associations.js';
import { isSessionCurrent } from '../utils/sessionPolicy.js';
import { clearSessionCookie, sessionOperation } from '../config/session.js';

/** Resolve the current account from PostgreSQL; a changed auth_version revokes the session (ADR-0001). */
export const authenticateSession = async (req, res, next) => {
  if (!req.session?.accountId || !isSessionCurrent(req.session, req.app.locals.now()))
    return res.status(401).json({ message: 'Authentication required' });
  try {
    const account = await findAccount(req.app.locals.ctx.db, req.session.accountId);
    if (!account || account.authVersion !== req.session.authVersion) {
      await sessionOperation(req.session, 'destroy'); clearSessionCookie(req, res);
      return res.status(401).json({ message: 'Authentication required' });
    }
    req.account = account;
    return next();
  } catch { return res.status(503).json({ message: 'Authentication unavailable' }); }
};

/** Re-check membership on every association-scoped request (06, M1/T6): removal applies at once. */
export const requireMembership = async (req, res, next) => {
  try {
    const association = await findMembership(req.app.locals.ctx.db, req.account.id, req.params.slug);
    if (!association) return res.status(404).json({ message: 'Association not found' });
    req.association = association;
    return next();
  } catch { return res.status(503).json({ message: 'Service unavailable' }); }
};
