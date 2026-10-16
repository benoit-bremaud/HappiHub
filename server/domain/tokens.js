import { createHash, randomBytes } from 'node:crypto';

export const TOKEN_TTL_MS = Object.freeze({ VERIFY: 24 * 3600e3, RESET: 3600e3, INVITATION: 7 * 24 * 3600e3 });

/** 32 random bytes in base64url; only the SHA-256 hash is stored (spec § 5, DF3). */
export const newToken = () => {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token) };
};
export const hashToken = (token) => createHash('sha256').update(token).digest('hex');

/** Tokens travel in request bodies only; anything else is treated as unknown. */
export const isTokenShaped = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
