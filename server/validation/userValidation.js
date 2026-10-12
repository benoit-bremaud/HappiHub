import Joi from 'joi';
import { passwordSchema } from './password.js';

/**
 * Validates the signup data.
 * @param {object} data - The signup data to be validated.
 * @returns {object} - The result of the validation.
 */
const signupValidation = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(3).max(100).required(),
    email: Joi.string().min(6).max(254).required().email(),
    password: passwordSchema.required(),
    role: Joi.string().valid('user').optional(),
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
    email: Joi.string().min(6).max(254).required().email(),
    password: passwordSchema.required(),
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
  return typeof user_id === 'string' && /^[a-f0-9]{24}$/i.test(user_id);
}

export { isValidUserId };

/** Profile mutations cannot change privileges or arbitrary model fields. */
export const profileValidation = (data) => Joi.object({
  name: Joi.string().min(3).max(100),
  email: Joi.string().email().max(254),
  password: passwordSchema,
  currentPassword: Joi.string().max(72).when('password', { is: Joi.exist(), then: Joi.required(), otherwise: Joi.forbidden() }),
}).min(1).validate(data);
