import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import { commentRoutes } from './routes/commentRoutes.js';
import cors from 'cors';
import { eventRoutes } from './routes/eventRoutes.js';
import express from 'express';
import { userRoutes } from './routes/userRoutes.js';


/** Construct an isolated HTTP application without reading environment variables or starting IO. */
export const createApp = (config) => {
  const app = express();
  app.locals.config = Object.freeze({ ...config });
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cors({ origin: config.origin, methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', credentials: true }));

  // Middleware to parse the request body as JSON
  app.use(express.json());

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
    const status = err.type === 'entity.too.large' ? 413 : err instanceof SyntaxError ? 400 : 500;
    res.status(status).json({ message: status === 500 ? 'Server error' : 'Invalid request' });
  });
  return app;
};
