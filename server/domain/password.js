import Joi from 'joi';
import { PASSWORD_BLOCKLIST } from './passwordBlocklist.js';

const blocklist = new Set(PASSWORD_BLOCKLIST);

export const PASSWORD_HINT = 'Use 15 to 64 characters, for example a sentence of 3 or 4 words.';

/** A2 policy: 15–64 characters, at most 72 UTF-8 bytes for bcrypt, not on the local list. */
export const isAcceptablePassword = (value) => typeof value === 'string' &&
  [...value].length >= 15 && [...value].length <= 64 && Buffer.byteLength(value, 'utf8') <= 72 &&
  !blocklist.has(value.trim().toLowerCase());

export const newPasswordSchema = Joi.string().custom((value, helpers) =>
  isAcceptablePassword(value) ? value : helpers.error('any.invalid'));

/** Sign-in and current-password checks accept older, shorter passwords (#262); the cap bounds hashing cost. */
export const existingPasswordSchema = Joi.string().min(1).max(1024);
