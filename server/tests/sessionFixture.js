import { testCipher } from './testCipher.js';
import session from 'express-session';
import signature from 'cookie-signature';
export const origin = 'http://localhost:3000';
export const config = { sessionSecret: 'synthetic-test-session-secret-32bytes', production: false,
  cookieName: 'happihub.sid', origin, port: 5000, trustedProxy: false, databaseUrl: 'postgres://localhost/happihub_test' };
export const makeStore = () => new session.MemoryStore();
export const owner = '7d9f2c56-1d6e-4c43-9b55-0a1c2d3e4f5a';
/** Database boundary stub: `rows` answers every query (unit tests never reach PostgreSQL). */
export const stubDb = (rows = []) => ({ query: jest.fn(async () => ({ rows, rowCount: rows.length })) });
export const accountRow = (overrides = {}) => ({ id: owner,
  email_enc: testCipher.encrypt('account.email_enc', 'owner@example.com'), email_verified_at: new Date(),
  pending_email_enc: null, display_name_enc: null, platform_role: 'NONE', auth_version: 0, ...overrides });
export const csrf = 'a'.repeat(64);
export const fixtureCookie = (id = 'fixture') => `happihub.sid=${encodeURIComponent('s:' + signature.sign(id, config.sessionSecret))}`;
export const seedSession = (store, accountId) => new Promise((resolve, reject) => store.set('fixture', {
  cookie: { expires: new Date(Date.now() + 1800000), originalMaxAge: 1800000, httpOnly: true, path: '/' },
  accountId, authVersion: 0, startedAt: Date.now(), csrfToken: csrf,
}, error => error ? reject(error) : resolve()));
export const browserWrite = (query) => query.set('Origin', origin).set('Cookie', fixtureCookie()).set('X-CSRF-Token', csrf);
