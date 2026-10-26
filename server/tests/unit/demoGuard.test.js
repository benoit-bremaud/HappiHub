import { demoTargetRefusals } from '../../seed/demoGuard.js';

// AC3: each guard condition of test-environment spec § 2 refuses the run on its own.
const allowed = { DATABASE_URL_DEV: 'postgres://happihub:change-me@127.0.0.1:5432/happihub_demo',
  FIELD_KEYRING_FILE_DEV: '.keys/field-keyring.dev.json' };
const confirm = ['--confirm'];

describe('demo seed target guard (D5, AC3)', () => {
  test('allows a local _demo database in the DEV tier with --confirm', () => {
    expect(demoTargetRefusals(allowed, confirm)).toEqual([]);
    expect(demoTargetRefusals({ ...allowed, NODE_ENV: 'development' }, confirm)).toEqual([]);
    expect(demoTargetRefusals({ ...allowed, DATABASE_URL_PROD: '' }, confirm)).toEqual([]);
  });

  test.each(['localhost', '[::1]', 'db', 'postgres'])('accepts the local host %s', (host) => {
    expect(demoTargetRefusals({ ...allowed, DATABASE_URL_DEV: `postgres://u:p@${host}:5432/x_demo` }, confirm)).toEqual([]);
  });

  test.each([
    ['production', { NODE_ENV: 'production' }, 'NODE_ENV must be unset or development'],
    ['test', { NODE_ENV: 'test' }, 'NODE_ENV must be unset or development'],
    ['a missing URL', { DATABASE_URL_DEV: undefined }, 'DATABASE_URL_DEV is missing or invalid'],
    ['a database without _demo', { DATABASE_URL_DEV: 'postgres://u:p@127.0.0.1/happihub_local' },
      'the DEV database name must end in _demo'],
    ['a remote host', { DATABASE_URL_DEV: 'postgres://u:p@db.example.com/happihub_demo' },
      'the DEV database host must be local'],
    ['a public IP', { DATABASE_URL_DEV: 'postgres://u:p@203.0.113.5/happihub_demo' }, 'the DEV database host must be local'],
    ['a production URL', { DATABASE_URL_PROD: 'postgres://u:p@127.0.0.1/happihub' }, 'DATABASE_URL_PROD must not be set'],
    ['a shared keyring', { FIELD_KEYRING_FILE_PROD: '.keys/field-keyring.dev.json' },
      'the DEV keyring must differ from the PROD keyring'],
  ])('refuses %s', (_, override, reason) => {
    expect(demoTargetRefusals({ ...allowed, ...override }, confirm)).toEqual([reason]);
  });

  test('refuses without --confirm', () => {
    expect(demoTargetRefusals(allowed, ['--reset'])).toEqual(['--confirm is required']);
  });

  test('accepts a distinct production keyring path', () => {
    expect(demoTargetRefusals({ ...allowed, FIELD_KEYRING_FILE_PROD: '/etc/happihub/keyring.json' }, confirm)).toEqual([]);
  });
});
