import { foldEmail, maskEmail, emailSchema } from '../../domain/email.js';
import { nextFreeSlug, slugify } from '../../domain/slug.js';
import { hashToken, isTokenShaped, newToken } from '../../domain/tokens.js';
import { isAcceptablePassword, newPasswordSchema } from '../../domain/password.js';
import { canCreateAssociation, canDeleteAccount, canInvite, canLoseMember } from '../../domain/rules.js';
import { createKeyedLimiter } from '../../utils/keyedLimiter.js';
import { createLogTransport } from '../../services/outbox.js';

describe('password policy A2', () => {
  test.each([
    ['a quiet walk by the river', true],
    ['fourteen chars', false],
    ['x'.repeat(64), true],
    ['x'.repeat(65), false],
    ['é'.repeat(36), true], // 36 characters, 72 bytes
    ['é'.repeat(37), false], // 74 bytes: bcrypt would truncate
    ['passwordpassword', false], // local blocklist
    ['PasswordPassword', false], // blocklist ignores case
  ])('%s → %s', (value, accepted) => {
    expect(isAcceptablePassword(value)).toBe(accepted);
    expect(newPasswordSchema.validate(value).error === undefined).toBe(accepted);
  });
  test('non-strings are refused', () => expect(isAcceptablePassword(undefined)).toBe(false));
});

describe('slugs', () => {
  test.each([
    ['Les Tréteaux', 'les-treteaux'],
    ['  Théâtre -- du Soleil!! ', 'theatre-du-soleil'],
    ['日本', 'association'],
    ['x'.repeat(80), 'x'.repeat(60)],
  ])('%s → %s', (name, slug) => expect(slugify(name)).toBe(slug));
  test('suffixes on collision', () => {
    expect(nextFreeSlug('troupe', [])).toBe('troupe');
    expect(nextFreeSlug('troupe', ['troupe'])).toBe('troupe-2');
    expect(nextFreeSlug('troupe', ['troupe', 'troupe-2', 'troupe-3'])).toBe('troupe-4');
  });
});

describe('emails', () => {
  test('fold and mask', () => {
    expect(foldEmail(' Malik@GMail.com ')).toBe('malik@gmail.com');
    expect(maskEmail('malik@gmail.com')).toBe('m•••@gmail.com');
    expect(emailSchema.validate('Claire@Example.org').value).toBe('claire@example.org');
    expect(emailSchema.validate('not an email').error).toBeDefined();
  });
});

describe('tokens', () => {
  test('32 random bytes in base64url, only the SHA-256 is stored', () => {
    const { token, hash } = newToken();
    expect(isTokenShaped(token)).toBe(true);
    expect(hash).toBe(hashToken(token));
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(newToken().token).not.toBe(token);
    expect(isTokenShaped('short')).toBe(false);
    expect(isTokenShaped(42)).toBe(false);
  });
});

describe('domain guards', () => {
  test('≤ 5 associations, last member, 10 invitations a day, last super admin', () => {
    expect(canCreateAssociation(4)).toBe(true);
    expect(canCreateAssociation(5)).toBe(false);
    expect(canLoseMember(2)).toBe(true);
    expect(canLoseMember(1)).toBe(false);
    expect(canInvite(9)).toBe(true);
    expect(canInvite(10)).toBe(false);
    expect(canDeleteAccount('NONE', 0)).toBe(true);
    expect(canDeleteAccount('SUPER_ADMIN', 0)).toBe(false);
    expect(canDeleteAccount('SUPER_ADMIN', 1)).toBe(true);
  });
});

describe('keyed limiter', () => {
  test('counts per key and resets after the window', () => {
    const limiter = createKeyedLimiter({ limit: 2, windowMs: 1000 });
    expect(limiter.take('a', 0)).toBe(true);
    expect(limiter.take('a', 0)).toBe(true);
    expect(limiter.take('a', 10)).toBe(false);
    expect(limiter.retryAfter('a', 10)).toBe(1);
    expect(limiter.take('b', 10)).toBe(true);
    expect(limiter.retryAfter('a', 1000)).toBe(0);
  });

  test('AC329-2: release frees a reserved attempt, never below 0, no-op after reset', () => {
    const limiter = createKeyedLimiter({ limit: 1, windowMs: 1000 });
    expect(limiter.take('a', 0)).toBe(true);
    limiter.release('a', 0);
    limiter.release('a', 0);
    expect(limiter.take('a', 0)).toBe(true);
    expect(limiter.take('a', 0)).toBe(false);
    limiter.release('a', 1000);
    expect(limiter.take('a', 1000)).toBe(true);
    expect(limiter.take('a', 1000)).toBe(false);
  });
});

describe('log transport', () => {
  test('is refused in production and writes the message in development', async () => {
    expect(() => createLogTransport({ production: true })).toThrow();
    const write = jest.fn();
    await createLogTransport({ production: false, write }).send({ template: 'VERIFY', recipient: 'a@b.c', payload: { link: 'x' } });
    expect(write).toHaveBeenCalledWith('[outbox] VERIFY to a@b.c: {"link":"x"}');
  });
});
