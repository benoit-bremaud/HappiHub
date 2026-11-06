// Seeded persona credentials (#251 demo seed, D4). Values are never logged or reported.
import { readFileSync } from 'node:fs';
import { CREDENTIALS_FILE } from './paths.js';

/** `{ email, password }` of a seeded persona, by its email local part (for example `claire`). */
export const persona = (name) => {
  const { accounts } = JSON.parse(readFileSync(CREDENTIALS_FILE, 'utf8'));
  const account = accounts.find(({ email }) => email === `${name}@demo.example.com`);
  if (!account) throw new Error(`Persona ${name} is missing from the demo seed`);
  return account;
};
