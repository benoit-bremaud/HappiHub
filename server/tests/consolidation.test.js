import { readAppConfig } from '../config/appConfig.js';
import { createApp } from '../app.js';
import { config, makeStore, stubDb } from './sessionFixture.js';
test('app instances isolate session configuration and require an explicit store and pool', () => {
  const a = createApp(config, { store: makeStore(), db: stubDb() });
  const b = createApp({ ...config, sessionSecret: 'different-synthetic-secret-32bytes' }, { store: makeStore(), db: stubDb() });
  expect(a.locals.config.sessionSecret).not.toBe(b.locals.config.sessionSecret);
  expect(Object.isFrozen(a.locals.config)).toBe(true);
  expect(() => createApp(config, { db: stubDb() })).toThrow('Session store is required');
  expect(() => createApp(config, { store: makeStore() })).toThrow('Database pool is required');
});
test('configuration validates session key, database URL and production HTTPS', () => {
  const env = { NODE_ENV: 'test', SESSION_SECRET_TEST: config.sessionSecret, APP_URL_TEST: config.origin,
    DATABASE_URL_TEST: config.databaseUrl };
  expect(readAppConfig(env)).toEqual(config);
  expect(() => readAppConfig({})).toThrow();
  expect(() => readAppConfig({ ...env, SESSION_SECRET_TEST: 'short' })).toThrow();
  expect(() => readAppConfig({ ...env, APP_URL_TEST: 'javascript:alert(1)' })).toThrow();
  expect(() => readAppConfig({ ...env, DATABASE_URL_TEST: 'mongodb://localhost' })).toThrow('Database URL');
  expect(() => readAppConfig({ ...env, PORT_TEST: '70000' })).toThrow('Port');
  expect(() => readAppConfig({ ...env, TRUSTED_PROXY: 'any' })).toThrow('Trusted proxy');
  expect(() => readAppConfig({ NODE_ENV: 'production', SESSION_SECRET_PROD: config.sessionSecret, APP_URL_PROD: config.origin,
    DATABASE_URL_PROD: config.databaseUrl })).toThrow();
});
