import session from 'express-session';
import signature from 'cookie-signature';
export const origin = 'http://localhost:3000';
export const config = { sessionSecret: 'synthetic-test-session-secret-32bytes', production: false,
  cookieName: 'happihub.sid', origin, port: 5000, trustedProxy: false };
export const makeStore = () => new session.MemoryStore();
export const csrf = 'a'.repeat(64);
export const fixtureCookie = (id = 'fixture') => `happihub.sid=${encodeURIComponent('s:' + signature.sign(id, config.sessionSecret))}`;
export const seedSession = (store, userId) => new Promise((resolve, reject) => store.set('fixture', {
  cookie: { expires: new Date(Date.now() + 1800000), originalMaxAge: 1800000, httpOnly: true, path: '/' },
  userId, authVersion: 0, startedAt: Date.now(), lastActivity: Date.now(), csrfToken: csrf,
}, error => error ? reject(error) : resolve()));
export const browserWrite = (query) => query.set('Origin', origin).set('Cookie', fixtureCookie()).set('X-CSRF-Token', csrf);
