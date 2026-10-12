import { sessionMiddleware, sessionOperation } from './config/session.js';
import { isSessionCurrent, IDLE_MS, ABSOLUTE_MS } from './utils/sessionPolicy.js';
import { protectWrites } from './middleware/csrf.js';
import { rateLimit } from 'express-rate-limit';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import { commentRoutes } from './routes/commentRoutes.js';
import cors from 'cors';
import { eventRoutes } from './routes/eventRoutes.js';
import express from 'express';
import { userRoutes } from './routes/userRoutes.js';


/** Construct an isolated HTTP application without reading environment variables or starting IO. */
export const createApp = (config, { store, now = Date.now } = {}) => {
  const app = express();
  app.locals.config = Object.freeze({ ...config });
  app.locals.now = now;
  app.use(cors({ origin: config.origin, methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', credentials: true }));

  if (config.trustedProxy) app.set('trust proxy', config.trustedProxy);
  const sessions = sessionMiddleware(config, store);
  app.use('/api', (req, res, next) => sessions(req, res, (error) => error ? res.status(503).json({ message: 'Session unavailable' }) : next()));
  app.use('/api', async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (req.session?.startedAt !== undefined && !isSessionCurrent(req.session, now())) {
      try { await sessionOperation(req.session, 'regenerate'); }
      catch { return res.status(503).json({ message: 'Session unavailable' }); }
    }
    if (req.session?.startedAt !== undefined) req.session.cookie.maxAge = Math.min(IDLE_MS,
      req.session.startedAt + (req.session.userId ? ABSOLUTE_MS : IDLE_MS) - now());
    next();
  });
  // Per-window in-process counters: deployment supports one API instance.
  const limiter = (limit) => rateLimit({ windowMs: 15 * 60 * 1000, limit,
    standardHeaders: 'draft-8', legacyHeaders: false,
    message: { message: 'Too many requests. Try again later.' } });
  app.use('/api/users/session', limiter(120));
  app.use('/api/users/login', limiter(20));
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

  // Middleware to parse the request body as JSON
  app.use(express.json());

  app.use('/api', protectWrites);

  // Define the routes
  app.get('/ready', (_req, res) => res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({ ready: mongoose.connection.readyState === 1 }));

  app.use('/api/users', userRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/comments', commentRoutes);

  // Define a test route
  app.get('/test', (req, res) => {
    res.send('Hello HappiHub Server!');
  });

  app.use((err, _req, res, _next) => {
    const status = err.type === 'entity.too.large' ? 413 : err instanceof SyntaxError ? 400 : err.message === 'Session unavailable' ? 503 : 500;
    res.status(status).json({ message: status === 500 ? 'Server error' : 'Invalid request' });
  });
  return app;
};
