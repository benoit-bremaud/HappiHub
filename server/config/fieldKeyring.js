import { readFileSync } from 'node:fs';
import { envSuffix } from './appConfig.js';

/**
 * Read the JSON keyring named by `FIELD_KEYRING_FILE_<DEV|TEST|PROD>` (spec § 6.1, D2). The
 * shape is validated by `createFieldCipher`; errors name the variable, never the content (AC3).
 */
export const readFieldKeyring = (env, readFile = readFileSync) => {
  const variable = `FIELD_KEYRING_FILE_${envSuffix(env)}`;
  if (!env[variable]) throw new Error(`${variable} is not configured`);
  try {
    return JSON.parse(readFile(env[variable], 'utf8'));
  } catch {
    throw new Error(`${variable} does not point to a readable JSON keyring`);
  }
};
