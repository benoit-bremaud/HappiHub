import mongoose from "mongoose";

// Create a new mongoose schema for comments
/**
 * Represents a comment in the application.
 *
 * @typedef {Object} Comment
 * @property {string} content - The text content of the comment.
 * @property {mongoose.Schema.Types.ObjectId} user_id - The user who made the comment.
 * @property {mongoose.Schema.Types.ObjectId} event_id - The event to which the comment belongs.
 * @property {Date} createdAt - The date and time when the comment was created.
 * @property {Date} updatedAt - The date and time when the comment was last updated.
 */
const commentSchema = new mongoose.Schema({
    content: { type: String, required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    createdAt: { type: Date, required: true, default: Date.now },
    updatedAt: { type: Date, required: true, default: Date.now },
});

// Create a new mongoose model for comments
const Comment = mongoose.model('Comment', commentSchema);

// Export the Comment model
export default Comment;