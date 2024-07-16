import joi from 'joi';

// Event validation
const eventValidation = (data) => {
  // Define the schema for the event data
  const schema = joi.object({
    // id: joi.string().required(),
    title: joi.string().min(3).required(),
    description: joi.string().min(6).required(),
    date: joi.date().required(),
    location: joi.string().min(3).required(),
    user_id: joi.string().required(),
    // isPrivate: joi.boolean().required
    // image: joi.string().required()
    // comment: joi.array().items(joi.string())
    // createdAt: joi.date().required()
    // updatedAt: joi.date().required()
    // timestamps: joi.boolean().required()
    // __v: joi.number().required()
  });

  return schema.validate(data);
}

export { eventValidation };