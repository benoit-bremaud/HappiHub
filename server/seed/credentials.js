import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

/** Random passphrase: 24 base64url characters, inside the 15–64 character policy (A2). */
export const generatePassword = () => randomBytes(18).toString('base64url');

// The file is `server/.demo-credentials.local.json`, ignored by git (D2); never logged or committed.

/** Passwords by email from a previous run, or an empty map when the file is absent. */
export const readCredentials = (file) => {
  if (!existsSync(file)) return new Map();
  const { accounts = [] } = JSON.parse(readFileSync(file, 'utf8'));
  return new Map(accounts.map(({ email, password }) => [email, password]));
};

/** Write `{ accounts: [{ key, email, password }] }` with mode 0600, also when the file existed. */
export const writeCredentials = (file, accounts) => {
  writeFileSync(file, `${JSON.stringify({ accounts }, null, 2)}\n`, { mode: 0o600 });
  chmodSync(file, 0o600);
};
