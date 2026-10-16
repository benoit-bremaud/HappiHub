import request from 'supertest';
import { createApp } from '../app.js';
import { accountRow, config, origin, makeStore, owner, seedSession, fixtureCookie, csrf, stubDb } from './sessionFixture.js';
import { ABSOLUTE_MS, IDLE_MS, isSessionCurrent } from '../utils/sessionPolicy.js';
let app, store, db;
const post = (path) => request(app).post(path).set('Origin', origin)
  .set('Cookie', fixtureCookie()).set('X-CSRF-Token', csrf);
beforeEach(async () => {
  store = makeStore(); await seedSession(store, owner); db = stubDb([accountRow()]);
  app = createApp(config, { store, db });
});
afterEach(() => jest.restoreAllMocks());
test('public reads do not create sessions, bootstrap creates protected anonymous state', async () => {
  const publicRead = await request(app).get('/ready'); expect(publicRead.headers['set-cookie']).toBeUndefined();
  app = createApp(config, { store: makeStore(), db });
  const response = await request(app).get('/api/session').set('Origin', origin);
  expect(response.status).toBe(200); expect(response.body.account).toBeNull();
  expect(response.body.csrfToken).toMatch(/^[a-f0-9]{64}$/);
  expect(response.headers['set-cookie'][0]).toMatch(/HttpOnly/);
  expect(response.headers['set-cookie'][0]).toMatch(/SameSite=Lax/);
  expect(response.headers['cache-control']).toBe('no-store');
  expect(response.headers['referrer-policy']).toBe('no-referrer');
});
test.each(['/api/session', '/api/signup', '/api/password-reset', '/api/invitations/accept'])('writes need CSRF: %s', async path => {
  expect((await request(app).post(path).set('Origin', origin).send({})).status).toBe(403);
});
test.each(['wrong', 'é'.repeat(64), 'b'.repeat(64)])('wrong tokens fail safely: %s', async value => {
  expect((await request(app).delete('/api/session').set('Origin', origin).set('Cookie', fixtureCookie()).set('X-CSRF-Token', value)).status).toBe(403);
});
test('foreign origin cannot sign in even with a valid session token', async () => {
  expect((await post('/api/session').set('Origin', 'https://foreign.example').send({})).status).toBe(403);
});
test('missing origin/referrer fails and exact referrer fallback succeeds', async () => {
  const del = () => request(app).delete('/api/session').set('Cookie', fixtureCookie()).set('X-CSRF-Token', csrf);
  expect((await del()).status).toBe(403);
  expect((await del().set('Referer', origin + '/account')).status).toBe(204);
});
test('writes reject form content even with valid CSRF', async () => {
  expect((await post('/api/session').type('form').send('a=b')).status).toBe(415);
});
test('sign-out revokes the stored identifier and clears its cookie', async () => {
  const response = await request(app).delete('/api/session').set('Origin', origin).set('Cookie', fixtureCookie()).set('X-CSRF-Token', csrf);
  expect(response.status).toBe(204); expect(response.headers['set-cookie'][0]).toMatch(/Expires=Thu, 01 Jan 1970/);
  expect((await request(app).get('/api/account').set('Cookie', fixtureCookie())).status).toBe(401);
});
test('current auth version is authoritative and lookup errors fail closed', async () => {
  db.query.mockResolvedValueOnce({ rows: [accountRow({ auth_version: 1 })] });
  expect((await request(app).get('/api/account').set('Cookie', fixtureCookie())).status).toBe(401);
  await seedSession(store, owner);
  db.query.mockRejectedValueOnce(new Error('private detail'));
  const response = await request(app).get('/api/account').set('Cookie', fixtureCookie());
  expect(response.status).toBe(503); expect(JSON.stringify(response.body)).not.toContain('private');
});
test('storage read/write/destroy failures do not confirm success', async () => {
  jest.spyOn(store, 'get').mockImplementation((_id, callback) => callback(new Error('storage private detail')));
  expect((await request(app).get('/api/account').set('Cookie', fixtureCookie())).status).toBe(503);
  store.get.mockRestore();
  jest.spyOn(store, 'destroy').mockImplementation((_id, callback) => callback(new Error('storage error')));
  expect((await request(app).delete('/api/session').set('Origin', origin).set('Cookie', fixtureCookie()).set('X-CSRF-Token', csrf)).status).toBe(503);
  store.destroy.mockRestore();
  jest.spyOn(store, 'set').mockImplementation((_id, _session, callback) => callback(new Error('storage error')));
  app = createApp(config, { store, db });
  expect((await request(app).get('/api/session').set('Origin', origin)).status).toBe(503);
});
test('the absolute lifetime is enforced in code; idle expiry belongs to the store', async () => {
  const now = Date.now();
  const session = { startedAt: now, accountId: owner };
  expect(isSessionCurrent(session, now + ABSOLUTE_MS - 1)).toBe(true);
  expect(isSessionCurrent(session, now + ABSOLUTE_MS)).toBe(false);
  expect(isSessionCurrent({ startedAt: now }, now + IDLE_MS)).toBe(false);
  expect(isSessionCurrent({}, now)).toBe(false);
  app = createApp(config, { store, db, now: () => now + ABSOLUTE_MS });
  expect((await request(app).get('/api/account').set('Cookie', fixtureCookie())).status).toBe(401);
});
test('secure cookies require verified transport and cannot trust spoofed headers', async () => {
  const secureConfig = { ...config, production: true, cookieName: '__Host-happihub.sid', origin: 'https://happihub.example' };
  app = createApp(secureConfig, { store, db });
  const blocked = await request(app).get('/api/session').set('Origin', secureConfig.origin).set('X-Forwarded-Proto', 'https');
  expect(blocked.headers['set-cookie']).toBeUndefined();
  app = createApp({ ...secureConfig, trustedProxy: '127.0.0.1' }, { store: makeStore(), db });
  const accepted = await request(app).get('/api/session').set('Origin', secureConfig.origin).set('X-Forwarded-Proto', 'https');
  expect(accepted.headers['set-cookie'][0]).toMatch(/__Host-happihub.sid=/);
  expect(accepted.headers['set-cookie'][0]).toMatch(/Secure/);
  expect(accepted.headers['set-cookie'][0]).not.toMatch(/Domain=/);
});
test('bootstrap rate limiting returns 429 with retry-after', async () => {
  let response;
  for (let i = 0; i < 121; i++) response = await request(app).get('/api/session').set('Origin', origin);
  expect(response.status).toBe(429); expect(response.headers['retry-after']).toBeDefined();
});
test('failed sign-in persistence never delivers an authenticated cookie', async () => {
  const bcrypt = (await import('bcryptjs')).default;
  db.query.mockResolvedValue({ rows: [{ ...accountRow(), password_hash: bcrypt.hashSync('synthetic-password', 4) }] });
  jest.spyOn(store, 'set').mockImplementation((_id, _value, callback) => callback(new Error('storage failure')));
  const response = await post('/api/session').send({ email: 'owner@example.com', password: 'synthetic-password' });
  expect(response.status).toBe(503); expect(response.body.account).toBeUndefined();
  expect(response.headers['set-cookie'].every(cookie => cookie.includes('Expires=Thu, 01 Jan 1970'))).toBe(true);
});
test('sign-in failures are limited per IP before repeated password verification', async () => {
  db.query.mockResolvedValue({ rows: [] });
  let response;
  for (let i = 0; i < 21; i++) response = await post('/api/session').send({ email: `owner${i}@example.com`, password: 'synthetic-password' });
  expect(response.status).toBe(429); expect(response.headers['retry-after']).toBeDefined();
  expect(db.query).toHaveBeenCalledTimes(20);
});
test('readiness reflects the database', async () => {
  expect((await request(app).get('/ready')).status).toBe(200);
  db.query.mockRejectedValueOnce(new Error('down'));
  expect((await request(app).get('/ready')).status).toBe(503);
});
