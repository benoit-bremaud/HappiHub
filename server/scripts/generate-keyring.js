// Generate a fresh field keyring (spec db-encryption-at-rest § 6.1) for local development or a
// new environment. Usage: npm run keyring:generate -- <path>. Refuses to overwrite a file and
// writes it with mode 0400; the keys are never printed. Keep a copy in the password manager.
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const [path] = process.argv.slice(2);
if (!path) throw new Error('Usage: npm run keyring:generate -- <path to the new keyring file>');
const kid = `k${new Date().toISOString().slice(0, 10).replaceAll('-', '')}`;
const keyring = { active: kid, keys: { [kid]: randomBytes(32).toString('base64') }, blindIndex: randomBytes(32).toString('base64') };
writeFileSync(path, `${JSON.stringify(keyring, null, 2)}\n`, { mode: 0o400, flag: 'wx' });
console.log(`Keyring written to ${path} (active key ${kid})`);
