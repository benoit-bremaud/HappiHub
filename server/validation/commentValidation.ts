import joi, { ValidationResult } from "joi";

interface CommentData {
    content: string;
    user_id: string;
    event_id: string;
}

const commentValidation = (data: CommentData): ValidationResult<CommentData> => {
    const schema = joi.object({
        content: joi.string().required(),
        user_id: joi.string().required(),
        event_id: joi.string().required(),
    });
    
    return schema.validate(data);
    }

export { commentValidation, CommentData };
