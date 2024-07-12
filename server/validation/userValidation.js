import Joi from 'joi';

// Signup validation
const signupValidation = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(3).required(),
    email: Joi.string().min(6).required().email(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('user', 'admin').required(),
  });

  return schema.validate(data);
};

// Login validation
const loginValidation = (data) => {
  const schema = Joi.object({
    email: Joi.string().min(6).required().email(),
    password: Joi.string().min(6).required(),
  });

  return schema.validate(data);
};

// Logout with token validation
const logoutValidation = (data) => {
  const schema = Joi.object({
    token: Joi.string().required(),
  });

  return schema.validate(data);
}

export { signupValidation, loginValidation , logoutValidation};