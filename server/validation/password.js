import Joi from 'joi';
/** bcrypt consumes at most 72 UTF-8 bytes; reject inputs that would be silently truncated. */
export const passwordSchema = Joi.string().min(6).max(72).custom((value, helpers) =>
  Buffer.byteLength(value, 'utf8') <= 72 ? value : helpers.error('any.invalid'));
