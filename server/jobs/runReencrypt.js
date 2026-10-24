// Operator entry point for key rotation (spec db-encryption-at-rest § 6.2): `npm run reencrypt`.
import dotenvFlow from 'dotenv-flow';
import pg from 'pg';
import { readAppConfig } from '../config/appConfig.js';
import { databasePoolConfig } from '../config/databaseUrl.js';
import { readFieldKeyring } from '../config/fieldKeyring.js';
import { createFieldCipher } from '../domain/fieldCipher.js';
import { reencrypt } from './reencrypt.js';

dotenvFlow.config({ silent: true });
const config = readAppConfig(process.env);
const cipher = createFieldCipher(readFieldKeyring(process.env));
const pool = new pg.Pool(databasePoolConfig(config.databaseUrl, config));
try { console.log(JSON.stringify(await reencrypt(pool, cipher))); }
finally { await pool.end(); }
