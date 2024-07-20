import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending'},
    // add more fields here
    // likes: { type: Number, default: 0 },
    // dislikes: { type: Number, default: 0 },
    // reports: { type: Number, default: 0 },
    // replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
}, 
{ 
    timestamps: true
});

// Create a new mongoose model for comments
const Comment = mongoose.model('Comment', commentSchema);

// Export the Comment model
export default Comment;
