import request from 'supertest';
import { createApp } from '../app.js';
import { User } from '../models/userModel.js';
import { config, origin, makeStore, seedSession, browserWrite } from './sessionFixture.js';

let app;
beforeEach(async () => {
  const store = makeStore();
  await seedSession(store);
  // Supertest's loopback socket stands in for the explicitly trusted Nginx peer.
  app = createApp({ ...config, trustedProxy: '127.0.0.1' }, { store });
});
afterEach(() => jest.restoreAllMocks());

test('trusted canonical IPv4 and IPv6 addresses determine the client identity', async () => {
  app.get('/fixture/client-ip', (req, res) => res.json({ ip: req.ip }));
  for (const ip of ['192.0.2.10', '192.0.2.20', '2001:db8:1::10']) {
    const response = await request(app).get('/fixture/client-ip').set('X-Forwarded-For', ip);
    expect(response.body.ip).toBe(ip);
  }
});

test('an untrusted direct peer cannot choose identity or scheme through headers', async () => {
  app = createApp({ ...config, trustedProxy: '192.0.2.254' }, { store: makeStore() });
  app.get('/fixture/client-ip', (req, res) => res.json({ ip: req.ip, secure: req.secure }));
  const response = await request(app).get('/fixture/client-ip')
    .set('X-Forwarded-For', '192.0.2.10').set('X-Forwarded-Proto', 'https');
  expect(response.body.ip).toMatch(/^(::ffff:)?127\.0\.0\.1$/);
  expect(response.body.secure).toBe(false);
});

test.each([
  ['IPv4', '192.0.2.10', '192.0.2.20'],
  ['IPv6 subnets', '2001:db8:1::10', '2001:db8:2::20'],
])('login limits remain independent for different %s clients', async (_family, first, second) => {
  const lookup = jest.spyOn(User, 'findOne').mockReturnValue({ select: async () => null });
  const login = (ip) => browserWrite(request(app).post('/api/users/login'))
    .set('X-Forwarded-For', ip)
    .send({ email: 'synthetic@example.com', password: 'synthetic-password' });
  for (let i = 0; i < 20; i++) expect((await login(first)).status).toBe(401);
  const blocked = await login(first);
  expect(blocked.status).toBe(429);
  expect(blocked.headers['retry-after']).toBeDefined();
  expect((await login(second)).status).toBe(401);
  expect(lookup).toHaveBeenCalledTimes(21);
});

test('bootstrap quota exhaustion does not block another canonical client address', async () => {
  const bootstrap = (ip) => request(app).get('/api/users/session')
    .set('Origin', origin).set('X-Forwarded-For', ip);
  for (let i = 0; i < 120; i++) expect((await bootstrap('192.0.2.10')).status).toBe(200);
  expect((await bootstrap('192.0.2.10')).status).toBe(429);
  expect((await bootstrap('192.0.2.20')).status).toBe(200);
});
