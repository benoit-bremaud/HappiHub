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
    creator: joi.string().required(),
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