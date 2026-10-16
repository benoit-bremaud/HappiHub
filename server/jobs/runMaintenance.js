// Operator entry point for one maintenance run (the API also runs it hourly in-process).
import dotenvFlow from 'dotenv-flow';
import pg from 'pg';
import { readAppConfig } from '../config/appConfig.js';
import { createLinks } from '../app.js';
import { createKeyedLimiter } from '../utils/keyedLimiter.js';
import { runMaintenance } from './maintenance.js';

dotenvFlow.config();
const config = readAppConfig(process.env);
const pool = new pg.Pool({ connectionString: config.databaseUrl });
const ctx = { db: pool, now: Date.now, links: createLinks(config.origin),
  limits: { recipient: createKeyedLimiter({ limit: 10, windowMs: 3600e3 }) } };
try { console.log(JSON.stringify(await runMaintenance(ctx))); }
finally { await pool.end(); }
