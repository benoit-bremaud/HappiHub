// Operator entry point of the demo seed (#251): npm run seed:demo -- --confirm [--reset] [--rotate-passwords].
// The guard runs before any configuration is read or connection opened (spec § 2, D5).
import dotenvFlow from 'dotenv-flow';
import pg from 'pg';
import { readAppConfig } from '../config/appConfig.js';
import { databasePoolConfig } from '../config/databaseUrl.js';
import { readFieldKeyring } from '../config/fieldKeyring.js';
import { createFieldCipher } from '../domain/fieldCipher.js';
import { createLinks } from '../app.js';
import { demoTargetRefusals } from '../seed/demoGuard.js';
import { createKeyedLimiter } from '../utils/keyedLimiter.js';
import { seedDemo } from './seedDemo.js';

dotenvFlow.config({ silent: true });
const args = process.argv.slice(2);
const refusals = demoTargetRefusals(process.env, args);
if (refusals.length) {
  console.error(`Demo seed refused: ${refusals.join('; ')}.`);
  process.exit(1);
}
const config = readAppConfig(process.env);
const cipher = createFieldCipher(readFieldKeyring(process.env));
const pool = new pg.Pool(databasePoolConfig(config.databaseUrl, config));
const services = { db: pool, cipher, links: createLinks(config.origin),
  limits: { recipient: createKeyedLimiter({ limit: 10, windowMs: 3600e3 }) } };
try {
  const tally = await seedDemo(services, { clock: { now: Date.now() },
    credentialsFile: new URL('../.demo-credentials.local.json', import.meta.url).pathname,
    migrationsDir: new URL('../migrations', import.meta.url).pathname,
    reset: args.includes('--reset'), rotatePasswords: args.includes('--rotate-passwords'), log: console.warn });
  console.log(`Demo seed done: ${tally.created} created, ${tally.updated} updated, ${tally.unchanged} unchanged.`);
  console.log('Passwords are in server/.demo-credentials.local.json (mode 0600, ignored by git).');
} finally {
  await pool.end();
}
