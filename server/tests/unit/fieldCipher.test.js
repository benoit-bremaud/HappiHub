import { createFieldCipher, FieldCipherError } from '../../domain/fieldCipher.js';
import { readFieldKeyring } from '../../config/fieldKeyring.js';
import { databasePoolConfig } from '../../config/databaseUrl.js';
import { testKeyring } from '../testCipher.js';

// Spec db-encryption-at-rest § 11 (unit): envelope, AAD, key ids, blind index, keyring, TLS rule.
const COLUMN = 'account.email_enc';
const keyring = testKeyring(['k1', 'k2'], 'k1');
const cipher = createFieldCipher(keyring);

/** Flip one byte of the decoded payload at `index` (negative counts from the end). */
const tamper = (envelope, index) => {
  const [version, kid, body] = envelope.split('.');
  const bytes = Buffer.from(body, 'base64url');
  bytes[index < 0 ? bytes.length + index : index] ^= 1;
  return `${version}.${kid}.${bytes.toString('base64url')}`;
};

describe('fieldCipher envelope (§ 4, AC6)', () => {
  test('round trip with the hh1.<kid>.<b64url> format and a fresh IV per value', () => {
    const a = cipher.encrypt(COLUMN, 'claire@example.org');
    const b = cipher.encrypt(COLUMN, 'claire@example.org');
    expect(a).toMatch(/^hh1\.k1\.[A-Za-z0-9_-]+$/);
    expect(a).not.toBe(b);
    expect(cipher.decrypt(COLUMN, a)).toBe('claire@example.org');
  });

  test('null, undefined and empty values stay null', () => {
    expect(cipher.encrypt(COLUMN, null)).toBeNull();
    expect(cipher.encrypt(COLUMN, undefined)).toBeNull();
    expect(cipher.encrypt(COLUMN, '')).toBeNull();
    expect(cipher.decrypt(COLUMN, null)).toBeNull();
    expect(cipher.needsRotation(null)).toBe(false);
  });

  test.each([['IV', 0], ['ciphertext', 12], ['tag', -1]])('a tampered %s fails closed', (_part, index) => {
    expect(() => cipher.decrypt(COLUMN, tamper(cipher.encrypt(COLUMN, 'a@b.fr'), index))).toThrow(FieldCipherError);
  });

  test('a non-string value is refused instead of being stored as its text form', () => {
    expect(() => cipher.encrypt(COLUMN, { email: 'a@b.fr' })).toThrow('Field value must be a string');
    expect(() => cipher.encrypt(COLUMN, 42)).toThrow(FieldCipherError);
  });

  test('an envelope moved to another column fails (AAD)', () => {
    expect(() => cipher.decrypt('invitation.email_enc', cipher.encrypt(COLUMN, 'a@b.fr'))).toThrow(FieldCipherError);
  });

  test.each(['plain@text.fr', 'hh2.k1.AAAA', 'hh1.K1.AAAA', 'hh1.k1.AAAA', 'hh1.k1', 'hh1.k1.a+b/'])(
    'a malformed envelope %s fails closed', (envelope) => {
      expect(() => cipher.decrypt(COLUMN, envelope)).toThrow(FieldCipherError);
    });

  test('an unknown key id fails closed', () => {
    const other = createFieldCipher(testKeyring(['k9']));
    expect(() => cipher.decrypt(COLUMN, other.encrypt(COLUMN, 'a@b.fr'))).toThrow(FieldCipherError);
  });

  test('an invalid or unknown column name is refused, so a typo fails on the first write', () => {
    expect(() => cipher.encrypt('email', 'a@b.fr')).toThrow(FieldCipherError);
    expect(() => cipher.encrypt('account.emial_enc', 'a@b.fr')).toThrow('Field column is invalid');
    expect(() => cipher.decrypt('Account.Email', null)).toThrow(FieldCipherError);
  });

  test('errors carry neither the envelope nor the plaintext (AC3)', () => {
    const envelope = tamper(cipher.encrypt(COLUMN, 'secret@example.org'), -1);
    try { cipher.decrypt(COLUMN, envelope); throw new Error('expected a failure'); }
    catch (error) {
      expect(error).toBeInstanceOf(FieldCipherError);
      expect(`${error.message} ${error.stack}`).not.toContain('secret@example.org');
      expect(`${error.message} ${error.stack}`).not.toContain(envelope.split('.')[2]);
    }
  });
});

describe('key rotation (§ 6.2)', () => {
  const rotated = createFieldCipher({ ...keyring, active: 'k2' });

  test('a retiring key still decrypts while writes use the active key', () => {
    const old = cipher.encrypt(COLUMN, 'a@b.fr');
    expect(rotated.decrypt(COLUMN, old)).toBe('a@b.fr');
    expect(rotated.encrypt(COLUMN, 'a@b.fr')).toMatch(/^hh1\.k2\./);
  });

  test('needsRotation is true only for envelopes of another key', () => {
    expect(rotated.needsRotation(cipher.encrypt(COLUMN, 'a@b.fr'))).toBe(true);
    expect(rotated.needsRotation(rotated.encrypt(COLUMN, 'a@b.fr'))).toBe(false);
  });
});

describe('blind index (§ 5, D5)', () => {
  test('folds the address before hashing and returns the full 32 bytes', () => {
    const index = cipher.blindIndex(' A@B.fr ');
    expect(index).toEqual(cipher.blindIndex('a@b.fr'));
    expect(index).toHaveLength(32);
    expect(cipher.blindIndex('c@b.fr')).not.toEqual(index);
    expect(cipher.blindIndex(null)).toBeNull();
  });

  test('depends on the dedicated key, not on the encryption keys', () => {
    const sameKeys = createFieldCipher({ ...keyring, blindIndex: testKeyring().blindIndex });
    expect(sameKeys.blindIndex('a@b.fr')).not.toEqual(cipher.blindIndex('a@b.fr'));
  });
});

describe('keyring validation (§ 6.1, AC4)', () => {
  const short = Buffer.alloc(16).toString('base64');
  test.each([
    ['a missing keyring', undefined],
    ['missing keys', { active: 'k1', blindIndex: keyring.blindIndex }],
    ['an inactive active id', { ...keyring, active: 'k3' }],
    ['a short key', { ...keyring, keys: { k1: short } }],
    ['a non-base64 key', { ...keyring, keys: { k1: '!'.repeat(44) } }],
    ['an invalid key id', { ...keyring, active: 'K1', keys: { K1: keyring.keys.k1 } }],
    ['a short blind-index key', { ...keyring, blindIndex: short }],
    ['a blind-index key reused as an encryption key', { ...keyring, blindIndex: keyring.keys.k2 }],
  ])('refuses %s', (_label, value) => {
    expect(() => createFieldCipher(value)).toThrow(new FieldCipherError('Field keyring is invalid'));
  });
});

describe('keyring loader (§ 6.1)', () => {
  test('reads the file named for the runtime mode', () => {
    const readFile = jest.fn(() => JSON.stringify(keyring));
    expect(readFieldKeyring({ NODE_ENV: 'production', FIELD_KEYRING_FILE_PROD: '/run/keyring.json' }, readFile)).toEqual(keyring);
    expect(readFile).toHaveBeenCalledWith('/run/keyring.json', 'utf8');
  });

  test('refuses a missing variable, an unreadable file or invalid JSON without echoing the content', () => {
    expect(() => readFieldKeyring({ NODE_ENV: 'production' })).toThrow('FIELD_KEYRING_FILE_PROD is not configured');
    const env = { FIELD_KEYRING_FILE_DEV: '/nowhere' };
    expect(() => readFieldKeyring(env, () => { throw new Error('ENOENT'); })).toThrow('FIELD_KEYRING_FILE_DEV does not point');
    let failure;
    try { readFieldKeyring(env, () => '{"active": "secret-value"'); } catch (error) { failure = error; }
    expect(failure.message).toBe('FIELD_KEYRING_FILE_DEV does not point to a readable JSON keyring');
    expect(`${failure.message} ${failure.stack}`).not.toContain('secret-value');
  });
});

describe('database transport rule (§ 7, D7)', () => {
  const production = { production: true };
  test.each([
    'postgres://u:p@127.0.0.1:5432/db', 'postgres://u:p@localhost/db', 'postgres://u:p@[::1]:5432/db',
    'postgres://u:p@localhost/db?host=/var/run/postgresql', 'postgres:///db?host=/run/pg', 'postgres:///db',
    'postgres://u:p@db.example.net/db?sslmode=verify-full',
  ])('accepts %s in production', (url) => {
    expect(databasePoolConfig(url, production)).toEqual({ connectionString: url });
  });

  test.each([
    'postgres://u:p@db.example.net/db', 'postgres://u:p@db.example.net/db?sslmode=require',
    'postgres://u:p@10.0.0.5/db?sslmode=verify-ca', 'postgres://u:p@db.example.net/db?host=db2.example.net',
  ])('refuses %s in production', (url) => {
    expect(() => databasePoolConfig(url, production)).toThrow('A remote database requires sslmode=verify-full in production');
  });

  test.each([
    'postgres://u:p@db.example.net/db?sslmode=verify-full&sslmode=disable',
    'postgres://u:p@localhost/db?host=/run/pg&host=db.example.net',
  ])('refuses the repeated parameter in %s (the driver keeps the last copy)', (url) => {
    expect(() => databasePoolConfig(url, production)).toThrow('Database URL configuration is invalid');
  });

  test('refuses an unparsable URL in production and allows any URL outside production', () => {
    expect(() => databasePoolConfig('not a url', production)).toThrow('Database URL configuration is invalid');
    expect(databasePoolConfig('postgres://u:p@db.example.net/db', { production: false }))
      .toEqual({ connectionString: 'postgres://u:p@db.example.net/db' });
  });

  test('never returns an explicit ssl option that would override sslmode', () => {
    expect(databasePoolConfig('postgres://u:p@db.example.net/db?sslmode=verify-full', production)).not.toHaveProperty('ssl');
  });
});
