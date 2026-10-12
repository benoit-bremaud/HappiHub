import { timingSafeEqual } from 'node:crypto';
/** Enforce same-origin browser writes including anonymous login and registration. */
export const trustedOrigin = (req) => {
  const origin = req.get('Origin');
  if (origin) return origin === req.app.locals.config.origin;
  try { return new URL(req.get('Referer')).origin === req.app.locals.config.origin; }
  catch { return false; }
};
export const protectWrites = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const expected = req.session?.csrfToken;
  const actual = req.get('X-CSRF-Token');
  if (!trustedOrigin(req) || typeof expected !== 'string' || typeof actual !== 'string' ||
      !/^[a-f0-9]{64}$/.test(expected) || !/^[a-f0-9]{64}$/.test(actual) || expected.length !== actual.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) {
    return res.status(403).json({ message: 'Session changed or request origin rejected. Refresh before retrying.' });
  }
  if (!req.is('application/json')) return res.status(415).json({ message: 'JSON request required' });
  return next();
};
