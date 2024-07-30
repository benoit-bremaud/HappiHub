import joi from 'joi';
import { mongo } from 'mongoose';

/**
 * Validates the event data.
 * @param {object} data - The event data to be validated.
 * @returns {object} - The result of the validation.
 */
const eventValidation = (data) => {
  const schema = joi.object({
    title: joi.string().min(3).required(),
    description: joi.string().min(6).required(),
    date: joi.date().required(),
    location: joi.string().min(3).required(),
    image: joi.string().allow(null, '').optional(),
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
  return mongo.ObjectId.isValid(event_id);
}

export { isValidEventId };