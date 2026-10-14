import request from 'supertest';
import { createApp } from '../app.js';
import { User } from '../models/userModel.js';
import { config, origin, makeStore, seedSession, fixtureCookie, csrf } from './sessionFixture.js';
import { IDLE_MS, ABSOLUTE_MS, isSessionCurrent } from '../utils/sessionPolicy.js';
let app, store;
const owner = '000000000000000000000001';
const post = (path) => request(app).post(path).set('Origin', origin)
  .set('Cookie', fixtureCookie()).set('X-CSRF-Token', csrf);
beforeEach(async () => {
  store = makeStore(); await seedSession(store, owner); app = createApp(config, { store });
  jest.spyOn(User, 'findById').mockReturnValue({ select: async () => ({ _id: owner, role: 'user', authVersion: 0 }) });
});
afterEach(() => jest.restoreAllMocks());
test('public reads do not create sessions, bootstrap creates protected anonymous state', async () => {
  const publicRead = await request(app).get('/test'); expect(publicRead.headers['set-cookie']).toBeUndefined();
  const response = await request(app).get('/api/users/session').set('Origin', origin);
  expect(response.status).toBe(200); expect(response.body.user).toBeNull();
  expect(response.body.csrfToken).toMatch(/^[a-f0-9]{64}$/);
  expect(response.headers['set-cookie'][0]).toMatch(/HttpOnly/);
  expect(response.headers['set-cookie'][0]).toMatch(/SameSite=Lax/);
  expect(response.headers['cache-control']).toBe('no-store');
});
test.each(['/api/users/login', '/api/users/signup', '/api/users/logout', '/api/events', '/api/comments/add'])('writes need CSRF: %s', async path => {
  expect((await request(app).post(path).set('Origin', origin).send({})).status).toBe(403);
});
test.each(['wrong', 'é'.repeat(64), 'b'.repeat(64)])('wrong tokens fail safely: %s', async value => {
  expect((await post('/api/users/logout').set('X-CSRF-Token', value).send({})).status).toBe(403);
});
test('foreign origin cannot login even with a valid session token', async () => {
  expect((await post('/api/users/login').set('Origin', 'https://foreign.example').send({})).status).toBe(403);
});
test('missing origin/referrer fails and exact referrer fallback succeeds', async () => {
  expect((await request(app).post('/api/users/logout').set('Cookie', fixtureCookie()).set('X-CSRF-Token', csrf).send({})).status).toBe(403);
  expect((await request(app).post('/api/users/logout').set('Referer', origin + '/logout').set('Cookie', fixtureCookie()).set('X-CSRF-Token', csrf).send({})).status).toBe(204);
});
test('writes reject form content even with valid CSRF', async () => {
  expect((await post('/api/users/logout').type('form').send('a=b')).status).toBe(415);
});
test('logout revokes the stored identifier and clears its cookie', async () => {
  const response = await post('/api/users/logout').send({});
  expect(response.status).toBe(204); expect(response.headers['set-cookie'][0]).toMatch(/Expires=Thu, 01 Jan 1970/);
  expect((await request(app).get('/api/users/profile').set('Cookie', fixtureCookie())).status).toBe(401);
});
test('login rotates identifier and token without returning a bearer token', async () => {
  jest.spyOn(User, 'findOne').mockReturnValue({ select: async () => ({ _id: owner, authVersion: 0, isValidPassword: async () => true }) });
  const response = await post('/api/users/login').send({ email: 'owner@example.com', password: 'synthetic-password' });
  expect(response.status).toBe(200); expect(response.body.token).toBeUndefined();
  expect(response.body.csrfToken).not.toBe(csrf); expect(response.headers['set-cookie'][0]).not.toContain(fixtureCookie());
  expect((await request(app).get('/api/users/profile').set('Cookie', fixtureCookie())).status).toBe(401);
});
test('current role/version is authoritative and lookup errors fail closed', async () => {
  User.findById.mockReturnValueOnce({ select: async () => ({ _id: owner, role: 'admin', authVersion: 1 }) });
  expect((await request(app).get('/api/users/profile').set('Cookie', fixtureCookie())).status).toBe(401);
  await seedSession(store, owner);
  User.findById.mockReturnValueOnce({ select: async () => { throw new Error('private detail'); } });
  const response = await request(app).get('/api/users/profile').set('Cookie', fixtureCookie());
  expect(response.status).toBe(503); expect(JSON.stringify(response.body)).not.toContain('private');
});
test('storage read/write/destroy failures do not confirm success', async () => {
  jest.spyOn(store, 'get').mockImplementation((_id, callback) => callback(new Error('storage private detail')));
  expect((await request(app).get('/api/users/profile').set('Cookie', fixtureCookie())).status).toBe(503);
  store.get.mockRestore();
  jest.spyOn(store, 'destroy').mockImplementation((_id, callback) => callback(new Error('storage error')));
  expect((await post('/api/users/logout').send({})).status).toBe(503);
  store.destroy.mockRestore();
  jest.spyOn(store, 'set').mockImplementation((_id, _session, callback) => callback(new Error('storage error')));
  expect((await request(app).get('/api/users/session').set('Origin', origin)).status).toBe(503);
});
test('cookie idle expiry and absolute lifetime are enforced before physical deletion', async () => {
  const now = Date.now();
  const session = { startedAt: now, lastActivity: now, userId: owner, cookie: { expires: new Date(now + IDLE_MS) } };
  expect(isSessionCurrent(session, now + IDLE_MS - 1)).toBe(true);
  expect(isSessionCurrent(session, now + IDLE_MS)).toBe(false);
  expect(isSessionCurrent({ ...session, lastModified: new Date(now + ABSOLUTE_MS - 1) }, now + ABSOLUTE_MS)).toBe(false);
  app = createApp(config, { store, now: () => now + ABSOLUTE_MS });
  expect((await request(app).get('/api/users/profile').set('Cookie', fixtureCookie())).status).toBe(401);
});
test('secure cookies require verified transport and cannot trust spoofed headers', async () => {
  const secureConfig = { ...config, production: true, cookieName: '__Host-happihub.sid', origin: 'https://happihub.example' };
  app = createApp(secureConfig, { store });
  const blocked = await request(app).get('/api/users/session').set('Origin', secureConfig.origin).set('X-Forwarded-Proto', 'https');
  expect(blocked.headers['set-cookie']).toBeUndefined();
  app = createApp({ ...secureConfig, trustedProxy: '127.0.0.1' }, { store: makeStore() });
  const accepted = await request(app).get('/api/users/session').set('Origin', secureConfig.origin).set('X-Forwarded-Proto', 'https');
  expect(accepted.headers['set-cookie'][0]).toMatch(/__Host-happihub.sid=/);
  expect(accepted.headers['set-cookie'][0]).toMatch(/Secure/);
  expect(accepted.headers['set-cookie'][0]).not.toMatch(/Domain=/);
});
test('bootstrap rate limiting returns 429 with retry-after', async () => {
  let response;
  for (let i = 0; i < 121; i++) response = await request(app).get('/api/users/session').set('Origin', origin);
  expect(response.status).toBe(429); expect(response.headers['retry-after']).toBeDefined();
});

test('failed login persistence never delivers an authenticated cookie', async () => {
  jest.spyOn(User, 'findOne').mockReturnValue({ select: async () => ({ _id: owner, isValidPassword: async () => true }) });
  jest.spyOn(store, 'set').mockImplementation((_id, _value, callback) => callback(new Error('storage failure')));
  const response = await post('/api/users/login').send({ email: 'owner@example.com', password: 'synthetic-password' });
  expect(response.status).toBe(503); expect(response.body.user).toBeUndefined();
  expect(response.headers['set-cookie'].every(cookie => cookie.includes('Expires=Thu, 01 Jan 1970'))).toBe(true);
});
test('login attempts are limited before repeated password verification', async () => {
  const find = jest.spyOn(User, 'findOne').mockReturnValue({ select: async () => null });
  let response;
  for (let i = 0; i < 21; i++) response = await post('/api/users/login').send({ email: 'owner@example.com', password: 'synthetic-password' });
  expect(response.status).toBe(429); expect(response.headers['retry-after']).toBeDefined();
  expect(find).toHaveBeenCalledTimes(20);
});
