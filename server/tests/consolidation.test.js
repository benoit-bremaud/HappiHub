import { readAppConfig } from '../config/appConfig.js';
import { createApp } from '../app.js';
import { generateToken } from '../utils/jwt.js';
import { canReadEvent } from '../utils/access.js';
import { publicEventFilter, readableEventFilter } from '../queries/eventAccess.js';
import { passwordSchema } from '../validation/password.js';
import jwt from 'jsonwebtoken';
const id = '000000000000000000000001';
const other = '000000000000000000000002';
const config = { jwtSecret: 'synthetic-config-key', jwtExpiration: '5m', origin: 'http://localhost:3000', port: 5000 };
test('app instances isolate signing configuration', () => {
  const a = createApp(config); const b = createApp({ ...config, jwtSecret: 'different-synthetic-key' });
  const token = generateToken({ _id: id, role: 'user' }, a.locals.config);
  expect(jwt.verify(token, a.locals.config.jwtSecret)._id).toBe(id);
  expect(() => jwt.verify(token, b.locals.config.jwtSecret)).toThrow();
  expect(Object.isFrozen(a.locals.config)).toBe(true);
});
test('configuration resolves supplied environment without global state', () => {
  const env = { NODE_ENV: 'test', JWT_SECRET_TEST: config.jwtSecret, JWT_EXPIRATION_TEST: '5m', APP_URL_TEST: config.origin };
  expect(readAppConfig(env)).toEqual(config);
  expect(() => readAppConfig({})).toThrow();
  expect(() => readAppConfig({ ...env, JWT_EXPIRATION_TEST: 'invalid' })).toThrow();
  expect(() => readAppConfig({ ...env, APP_URL_TEST: 'javascript:alert(1)' })).toThrow();
});
// Evaluate the adapter's narrow query shape to detect drift from the domain truth table.
const matches = (event, filter) => filter.$or ? filter.$or.some((entry) => matches(event, entry)) : Object.entries(filter).every(([key, value]) => event[key] === value);
test.each(['pending', 'approved', 'rejected'].flatMap(status => [false,true].flatMap(isPrivate => [id,other].map(creator => ({status,isPrivate,creator})))))('query visibility equals domain visibility: %p', event => {
  expect(matches(event, readableEventFilter(id))).toBe(canReadEvent(event,{_id:id}));
  expect(matches(event, publicEventFilter())).toBe(canReadEvent(event));
});
test('password byte boundary handles multibyte input', () => {
  expect(passwordSchema.validate('é'.repeat(36)).error).toBeUndefined();
  expect(passwordSchema.validate('é'.repeat(37)).error).toBeDefined();
});
