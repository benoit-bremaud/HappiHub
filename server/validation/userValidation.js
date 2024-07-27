import Joi from 'joi';
import { mongo } from 'mongoose';

/**
 * Validates the signup data.
 * @param {object} data - The signup data to be validated.
 * @returns {object} - The result of the validation.
 */
const signupValidation = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(3).required(),
    email: Joi.string().min(6).required().email(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('user', 'admin').optional(),
    rank: Joi.string().valid('Visitor', 'Friend', 'Companion', 'Organizer', 'Unifier', 'Ambassador', 'Guardian').optional(),
  });

  return schema.validate(data);
};

export { signupValidation };

/**
 * Validates the login data.
 * @param {object} data - The login data to be validated.
 * @returns {object} - The result of the validation.
 */
const loginValidation = (data) => {
  const schema = Joi.object({
    email: Joi.string().min(6).required().email(),
    password: Joi.string().min(6).required(),
  });

  return schema.validate(data);
};

export { loginValidation };

/**
 * Checks if a user_id is valid.
 * @param {string} user_id - The user_id to be checked.
 * @returns {boolean} - True if the user_id is valid, false otherwise.
 */
const isValidUserId = (user_id) => {
  return mongo.ObjectId.isValid(user_id);
}

export { isValidUserId };
