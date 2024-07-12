import joi from 'joi';

const eventValidation = (data) => {
  const schema = joi.object({
    title: joi.string().min(3).required(),
    description: joi.string().min(6).required(),
    date: joi.date().required(),
    location: joi.string().min(3).required(),
  });

  return schema.validate(data);
}

export { eventValidation };