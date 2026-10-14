import joi from 'joi';
import { mongo } from 'mongoose';

/**
 * Validates the event data.
 * @param {object} data - The event data to be validated.
 * @returns {object} - The result of the validation.
 */
/** Accept bounded raster data or HTTPS URLs; never fetch remote URLs on the server. */
const validateImage = (value, helpers) => {
  if (/^https:\/\//.test(value)) {
    try { const url = new URL(value); return url.username || url.password ? helpers.error('any.invalid') : value; }
    catch { return helpers.error('any.invalid'); }
  }
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) return helpers.error('any.invalid');
  const bytes = Buffer.from(match[2], 'base64');
  const valid = match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) :
    match[1] === 'jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 :
    bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  return valid && bytes.length <= 2 * 1024 * 1024 ? value : helpers.error('any.invalid');
};
const eventValidation = (data) => {
  const schema = joi.object({
    title: joi.string().min(3).max(200).required(),
    description: joi.string().min(6).max(20000).required(),
    date: joi.date().required(),
    location: joi.string().min(3).max(500).required(),
    image: joi.string().max(2800000).custom(validateImage).allow(null, '').optional(),
    isPrivate: joi.boolean().optional(),
    creator: joi.string().required(),
    attendees: joi.array().items(joi.string()).optional(),
    comments: joi.array().items(joi.object({
      user: joi.string().required(),
      comment: joi.string().required(),
      date: joi.date().required(),
    })).optional(),
    likes: joi.array().items(joi.string()).optional(),
    dislikes: joi.array().items(joi.string()).optional(),
    report: joi.array().items(joi.string()).optional(),
  });

  return schema.validate(data);
}

export { eventValidation };

/**
 * Checks if the provided event ID is valid.
 * @param {*} event_id - The event ID to be checked.
 * @returns {boolean} - True if the event ID is valid, false otherwise.
 */
const isValidEventId = (event_id) => {
  return typeof event_id === 'string' && /^[a-f0-9]{24}$/i.test(event_id);
}

export { isValidEventId };