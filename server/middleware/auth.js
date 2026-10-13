import { User } from '../models/userModel.js';
import { isSessionCurrent, ABSOLUTE_MS, IDLE_MS } from '../utils/sessionPolicy.js';
import { clearSessionCookie, sessionOperation } from '../config/session.js';

/** Resolve current account authority; cached roles and legacy bearer tokens are never trusted. */
export const authenticateSession = async (req, res, next) => {
  if (!req.session?.userId || !isSessionCurrent(req.session, req.app.locals.now()))
    return res.status(401).json({ message: 'Authentication required' });
  try {
    const user = await User.findById(req.session.userId).select('_id role authVersion');
    if (!user || (user.authVersion || 0) !== req.session.authVersion) {
      await sessionOperation(req.session, 'destroy'); clearSessionCookie(req, res);
      return res.status(401).json({ message: 'Authentication required' });
    }
    req.session.cookie.maxAge = Math.min(IDLE_MS, req.session.startedAt + ABSOLUTE_MS - req.app.locals.now());
    req.user = { _id: String(user._id), role: user.role };
    return next();
  } catch { return res.status(503).json({ message: 'Authentication unavailable' }); }
};
/** An expired visit may still read public events, but receives no owner authority. */
export const optionalAuthentication = (req, res, next) => {
  if (!req.session?.userId || !isSessionCurrent(req.session, req.app.locals.now())) return next();
  return authenticateSession(req, res, next);
};
export const isAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
  return next();
};
