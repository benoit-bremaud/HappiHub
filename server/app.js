import express from 'express';
import cors from 'cors';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { sessionMiddleware, sessionOperation } from './config/session.js';
import { isSessionCurrent, IDLE_MS, ABSOLUTE_MS } from './utils/sessionPolicy.js';
import { createKeyedLimiter } from './utils/keyedLimiter.js';
import { protectWrites } from './middleware/csrf.js';
import { foldEmail } from './domain/email.js';
import { apiRoutes } from './routes/api.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** Links carry tokens in the fragment, which browsers never send to a server (DF3). */
export const createLinks = (origin) => ({
  verify: (token) => `${origin}/verify-email#${token}`,
  reset: (token) => `${origin}/reset-password#${token}`,
  invitation: (token) => `${origin}/invitations#${token}`,
  signIn: () => `${origin}/signin`,
  forgotPassword: () => `${origin}/forgot-password`,
});

// Per-window in-process counters: deployment supports one API instance (quotas T2).
const ipLimiter = (windowMs, limit, extra = {}) => rateLimit({ windowMs, limit,
  standardHeaders: 'draft-8', legacyHeaders: false,
  message: { message: 'Too many requests. Try again later.' }, ...extra });

/** Construct an isolated HTTP application without reading environment variables or starting IO. */
export const createApp = (config, { store, db, now = Date.now } = {}) => {
  if (!db) throw new Error('Database pool is required');
  const app = express();
  app.locals.config = Object.freeze({ ...config });
  app.locals.now = now;
  app.locals.ctx = {
    db, now, links: createLinks(config.origin),
    limits: {
      recipient: createKeyedLimiter({ limit: 10, windowMs: HOUR }),
      currentPassword: createKeyedLimiter({ limit: 5, windowMs: 15 * MINUTE }),
      exports: createKeyedLimiter({ limit: 3, windowMs: 24 * HOUR }),
    },
  };
  app.use(cors({ origin: config.origin, methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', credentials: true }));
  if (config.trustedProxy) app.set('trust proxy', config.trustedProxy);

  const sessions = sessionMiddleware(config, store);
  app.use('/api', (req, res, next) => sessions(req, res, (error) => error ? res.status(503).json({ message: 'Session unavailable' }) : next()));
  app.use('/api', async (req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    if (req.session?.startedAt !== undefined && !isSessionCurrent(req.session, now())) {
      try { await sessionOperation(req.session, 'regenerate'); }
      catch { return res.status(503).json({ message: 'Session unavailable' }); }
    }
    if (req.session?.startedAt !== undefined) req.session.cookie.maxAge = Math.min(IDLE_MS,
      req.session.startedAt + (req.session.accountId ? ABSOLUTE_MS : IDLE_MS) - now());
    next();
  });
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', protectWrites);

  const pairKey = (req) => `${ipKeyGenerator(req.ip)}|${typeof req.body?.email === 'string' ? foldEmail(req.body.email) : ''}`;
  app.use('/api', apiRoutes({
    bootstrap: ipLimiter(15 * MINUTE, 120),
    signUp: ipLimiter(HOUR, 5),
    signInPerIp: ipLimiter(15 * MINUTE, 20, { skipSuccessfulRequests: true }),
    signInPerPair: ipLimiter(15 * MINUTE, 5, { skipSuccessfulRequests: true, keyGenerator: pairKey }),
    emails: ipLimiter(HOUR, 5),
    // Brick B: bounds create–delete loops beside the quota Q while leaving room for autosave.
    eventWrites: ipLimiter(15 * MINUTE, 600),
    publicReads: ipLimiter(15 * MINUTE, 600),
  }));

  app.get('/ready', async (_req, res) => {
    try { await db.query('SELECT 1'); return res.json({ ready: true }); }
    catch { return res.status(503).json({ ready: false }); }
  });

  app.use((err, _req, res, _next) => {
    const status = err.type === 'entity.too.large' ? 413 : err instanceof SyntaxError ? 400 : 500;
    res.status(status).json({ message: status === 500 ? 'Server error' : 'Invalid request' });
  });
  return app;
};
