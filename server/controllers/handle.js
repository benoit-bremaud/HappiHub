import { DomainError } from '../services/errors.js';

/** Map expected refusals to their answer; any other failure is a generic 500 that echoes no input. */
export const handle = (action) => async (req, res) => {
  try {
    return await action(req, res);
  } catch (error) {
    if (!(error instanceof DomainError)) return res.status(500).json({ message: 'Server error' });
    const { retryAfter, ...details } = error.details;
    if (retryAfter) res.set('Retry-After', String(retryAfter));
    return res.status(error.status).json({ message: error.message, ...details });
  }
};

/** Validate a body with a Joi schema; unknown fields are refused. */
export const validate = (schema, body) => {
  const { error, value } = schema.validate(body ?? {}, { abortEarly: true, stripUnknown: false });
  if (error) throw new DomainError(400, 'Invalid request', { field: error.details[0].path.join('.') });
  return value;
};

/** Apply a keyed limit (account or recipient); 429 with Retry-After when exhausted (AC17). */
export const guardLimit = (limiter, key, now) => {
  const retryAfter = limiter.retryAfter(key, now);
  if (retryAfter) throw new DomainError(429, 'Too many requests. Try again later.', { retryAfter });
};
