import Joi from 'joi';
/** Validate comment input; authorship is assigned by the authenticated request handler. */
export const commentValidation = (data) => Joi.object({
  content: Joi.string().min(1).max(5000).required(),
  event_id: Joi.string().pattern(/^[a-f0-9]{24}$/i).required(),
  user_id: Joi.string().optional(),
}).validate(data);
