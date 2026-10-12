import jwt from 'jsonwebtoken';
import { User } from '../models/userModel.js';

/** Verify the current account as well as the token, so stale roles are not trusted. */
export const authenticateToken = async (req, res, next) => {
  const match = /^Bearer ([^\s]+)$/.exec(req.get('Authorization') || '');
  if (!match) return res.status(401).json({ message: 'Authentication required' });
  const secret = req.app.locals.config.jwtSecret;
  if (!secret) return res.status(503).json({ message: 'Authentication unavailable' });
  let verified;
  try {
    verified = jwt.verify(match[1], secret, { algorithms: ['HS256'] });
    if (!verified || typeof verified !== 'object' || !/^[a-f0-9]{24}$/i.test(verified._id || '') || !Number.isInteger(verified.exp)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  try {
    const user = await User.findById(verified._id).select('_id role');
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    req.user = { _id: String(user._id), role: user.role };
    return next();
  } catch {
    return res.status(503).json({ message: 'Authentication unavailable' });
  }
};

/** Anonymous reads are allowed, but a supplied invalid credential still fails closed. */
export const optionalAuthentication = (req, res, next) =>
  req.get('Authorization') ? authenticateToken(req, res, next) : next();

export const isAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
  return next();
};
