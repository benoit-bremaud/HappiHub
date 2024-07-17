import joi from "joi";

/**
 * Validates the comment data against a predefined schema.
 *
 * @param {object} data - The comment data to be validated.
 * @param {string} data.content - The content of the comment.
 * @param {string} data.user_id - The ID of the user who made the comment.
 * @param {string} data.event_id - The ID of the event the comment belongs to.
 * @returns {object} - The result of the validation process.
 */
const commentValidation = (data) => {
    const schema = joi.object({
        content: joi.string().min(1).max(255).required(),
        user_id: joi.string().required(),
        event_id: joi.string().required(),
    });
    
    return schema.validate(data);
    }

export { commentValidation };

// comment_id validation
/**
 * Checks if the provided comment ID is valid.
 * @param {string} comment_id - The comment ID to be checked.
 * @returns {boolean} - True if the comment ID is valid, false otherwise.
 */
// to be implemented