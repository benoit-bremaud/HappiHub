import { randomBytes } from 'node:crypto';
import { createFieldCipher } from '../domain/fieldCipher.js';

/** Throw-away keyring generated in memory per test run (spec § 6.1); never written to disk. */
export const testKeyring = (kids = ['k1'], active = kids[0]) => ({ active,
  keys: Object.fromEntries(kids.map((kid) => [kid, randomBytes(32).toString('base64')])),
  blindIndex: randomBytes(32).toString('base64') });

/** Shared test keyring: `k1` active, `k2` staged for the rotation tests (§ 6.2). */
export const sharedTestKeyring = testKeyring(['k1', 'k2']);
export const testCipher = createFieldCipher(sharedTestKeyring);
