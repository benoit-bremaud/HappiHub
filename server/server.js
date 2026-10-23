import { readFileSync } from 'node:fs';
import dotenvFlow from 'dotenv-flow';
import pg from 'pg';
dotenvFlow.config();
// Resolve mounted secrets at the startup boundary, never in domain logic.
for (const key of ['SESSION_SECRET_PROD', 'DATABASE_URL_PROD']) {
  if (process.env[`${key}_FILE`]) process.env[key] = readFileSync(process.env[`${key}_FILE`], 'utf8').trim();
}
const { createApp } = await import('./app.js');
const { readAppConfig } = await import('./config/appConfig.js');
const { databasePoolConfig } = await import('./config/databaseUrl.js');
const { readFieldKeyring } = await import('./config/fieldKeyring.js');
const { createFieldCipher } = await import('./domain/fieldCipher.js');
const { createSessionStore } = await import('./config/session.js');
const { createLogTransport, deliverOutbox } = await import('./services/outbox.js');
const { runMaintenance } = await import('./jobs/maintenance.js');

const config = readAppConfig(process.env);
// Boot is refused without a valid keyring or a protected database transport (AC4).
const cipher = createFieldCipher(readFieldKeyring(process.env));
// The schema is applied beforehand by the operator step `npm run migrate`, never at boot.
const pool = new pg.Pool(databasePoolConfig(config.databaseUrl, config));
pool.on('error', () => console.error('Database connection error'));
const store = createSessionStore(pool, () => console.error('Session storage unavailable'));
// Only the development log transport exists until T11a selects a provider; it refuses production.
const transport = createLogTransport({ production: config.production });
const app = createApp(config, { store, db: pool, cipher });
app.listen(config.port);

const { ctx } = app.locals;
const every = (ms, task, label) => setInterval(() => task().catch(() => console.error(`${label} failed`)), ms).unref();
every(10 * 1000, () => deliverOutbox(pool, transport, { cipher }), 'Outbox delivery');
every(60 * 60 * 1000, () => runMaintenance(ctx), 'Maintenance');
