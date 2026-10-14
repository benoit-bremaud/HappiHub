import session from 'express-session';
import MongoStore from 'connect-mongo';

/** Reuse the application's Mongo client. Store.close also closes that shared client. */
export const createSessionStore = (client, dbName) => MongoStore.create({
  client, dbName, collectionName: 'sessions',
  // Expose store-controlled lastModified on reads without rewriting/upserting read sessions.
   autoRemove: 'native', touchAfter: 1,
});
/** Inject a durable store in production, or an explicitly isolated test store. */
export const sessionMiddleware = (config, store) => {
  if (!store) throw new Error('Session store is required');
  return session({ secret: config.sessionSecret, store, name: config.cookieName,
    resave: false, saveUninitialized: false, rolling: true,
    cookie: { httpOnly: true, secure: config.production, sameSite: 'lax', path: '/' },
  });
};
export const clearSessionCookie = (req, res) => res.clearCookie(req.app.locals.config.cookieName,
  { httpOnly: true, secure: req.app.locals.config.production, sameSite: 'lax', path: '/' });
export const sessionOperation = (session, method) => new Promise((resolve, reject) =>
  session[method]((error) => error ? reject(error) : resolve()));
