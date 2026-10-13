import { readAppConfig } from '../config/appConfig.js';
import { createApp } from '../app.js';
import { config, makeStore } from './sessionFixture.js';
import { canReadEvent } from '../utils/access.js';
import { publicEventFilter, readableEventFilter } from '../queries/eventAccess.js';
import { passwordSchema } from '../validation/password.js';
const id = '000000000000000000000001';
const other = '000000000000000000000002';
test('app instances isolate session configuration and require an explicit store', () => {
  const a = createApp(config, { store: makeStore() });
  const b = createApp({ ...config, sessionSecret: 'different-synthetic-secret-32bytes' }, { store: makeStore() });
  expect(a.locals.config.sessionSecret).not.toBe(b.locals.config.sessionSecret);
  expect(Object.isFrozen(a.locals.config)).toBe(true);
  expect(() => createApp(config)).toThrow('Session store is required');
});
test('configuration validates session key and production HTTPS', () => {
  const env = { NODE_ENV: 'test', SESSION_SECRET_TEST: config.sessionSecret, APP_URL_TEST: config.origin };
  expect(readAppConfig(env)).toEqual(config);
  expect(() => readAppConfig({})).toThrow();
  expect(() => readAppConfig({ ...env, SESSION_SECRET_TEST: 'short' })).toThrow();
  expect(() => readAppConfig({ ...env, APP_URL_TEST: 'javascript:alert(1)' })).toThrow();
  expect(() => readAppConfig({ NODE_ENV: 'production', SESSION_SECRET_PROD: config.sessionSecret, APP_URL_PROD: config.origin })).toThrow();
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
