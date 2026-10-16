// Operator step (spec § 3, L2): apply or revert schema migrations explicitly, never at API boot.
// Usage: node jobs/migrate.js up | down [count]. Reads DATABASE_URL_<DEV|TEST|PROD>[_FILE].
import { readFileSync } from 'node:fs';
import dotenvFlow from 'dotenv-flow';
import { runner } from 'node-pg-migrate';

dotenvFlow.config({ silent: true });
const suffix = process.env.NODE_ENV === 'production' ? 'PROD' : process.env.NODE_ENV === 'test' ? 'TEST' : 'DEV';
const file = process.env[`DATABASE_URL_${suffix}_FILE`];
const databaseUrl = file ? readFileSync(file, 'utf8').trim() : process.env[`DATABASE_URL_${suffix}`];
if (!databaseUrl) throw new Error(`DATABASE_URL_${suffix} is not configured`);
const [direction = 'up', count] = process.argv.slice(2);
if (!['up', 'down'].includes(direction)) throw new Error('Direction must be up or down');

await runner({
  databaseUrl, dir: new URL('../migrations', import.meta.url).pathname, migrationsTable: 'pgmigrations',
  direction, count: count === undefined ? (direction === 'up' ? Infinity : 1) : Number(count),
  useGlob: false, log: () => {},
});
