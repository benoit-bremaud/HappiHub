import Comment from "../models/commentModel.js";
import Event from "../models/eventModel.js";
import User from "../models/userModel.js";

// Create a new comment
export const createComment = async (req, res) => {
    try {
        const newComment = new Comment({
            content: req.body.content,
            author: req.body.author,
            event: req.body.event,
            status: 'pending',
        });
        const savedComment = await newComment.save();
        res.status(201).json(savedComment);
    }
    catch (err) {
        res.status(500).json({ message: err.message});
    }
};

// Get comment by id
export const getCommentById = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found'});
        }
        res.json(comment);
    }
    catch (err) {
        res.status(500).json({ message: err.message});
    }
};

// Get all comments by user id
export const getCommentsByUserId = async (req, res) => {
    try {
        const comments = await Comment.find({ author: req.params.id });
        if (comments === null) {
            return res.status(404).json({ message: 'Comments not found'});
        }
        res.json(comments);
    }
    catch (err) {
        res.status(500).json({ message: err.message});
    }
};

// Get comments by event id
export const getCommentsByEventId = async (req, res) => {
    try {
        const comments = await Comment.find({ event: req.params.id });
        if (comments === null) {
            return res.status(404).json({ message: 'Comments not found'});
        }
        res.json(comments);
    }
    catch (err) {
        res.status(500).json({ message: err.message});
    }
};

// Get all comments (for admin)
export const getAllComments = async (req, res) => {
    try {
        const comments = await Comment.find({});
        if (comments === null) {
            return res.status(404).json({ message: 'Comments not found'});
        }
        res.json(comments);
    }
    catch (err) {
        res.status(500).json({ message: err.message});
    }
};

// Update comment by id
export const updateCommentById = async (req, res) => {
    try {
        // Check if the comment exists
        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found'});
        }

        // Check if the user is the author of the comment
        if (comment.author.toString() !== req.user._id && req.user.role !== 'admin' && req.user.role !== 'moderator') {
            return res.status(403).json({ message: 'You do not have permission to update this comment'});
        }

        // Update the comment
        comment.content = req.body.content || comment.content;
        comment.status = req.body.status || comment.status;

        const updatedComment = await comment.save();
        res.json(updatedComment);
    }
    catch (err) {
        res.status(500).json({ message: err.message});
    }
};

// Patch comment by id
export const patchCommentById = async (req, res) => {
    try {
        // Check if the comment exists
        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found'});
        }

        // Check if the user is the author of the comment
        if (comment.author.toString() !== req.user._id && req.user.role !== 'admin' && req.user.role !== 'moderator') {
            return res.status(403).json({ message: 'You do not have permission to update this comment'});
        }

        // Update the comment
        comment.content = req.body.content || comment.content;
        comment.status = req.body.status || comment.status;
        // add more fields here
        // comment.likes = req.body.likes || comment.likes;
        // comment.dislikes = req.body.dislikes || comment
        // comment.reports = req.body.reports || comment.reports;
        // comment.replies = req.body.replies || comment.replies;
        // comment.createdAt = req.body.createdAt || comment.createdAt;
        // comment.updatedAt = req.body.updatedAt || comment.updatedAt;

        const updatedComment = await comment.save();
        res.json(updatedComment);
    }
    catch (err) {
        res.status(500).json({ message: err.message});
    }
};

// Delete comment by id
export const deleteCommentById = async (req, res) => {
    try {
        // Check if the comment exists
        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found'});
        }

        // Check if the user is the author of the comment
        const isAuthor = comment.author.toString() === req.user._id;
        if (!isAuthor) {
            return res.status(403).json({ message: 'You do not have permission to delete this comment'});
        }

        // Delete the comment
        await comment.deleteOne();
        res.json({ message: 'Comment deleted successfully'});
    }
    catch (err) {
        res.status(500).json({ message: err.message});
    }
};

// Delete all comments by user id
export const deleteCommentsByUserId = async (req, res) => {
    try {
        // Check if the user exists
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found'});
        }

        // Check if there are comments to delete
        const comments = await Comment.find({ author: req.params.id });
        if (comments.length === 0) {
            return res.status(404).json({ message: 'Comments not found'});
        }

        // Check if the user is the author of the comments
        const isAuthor = comments.every(comment => comment.author.toString() === req.user._id);
        if (!isAuthor) {
            return res.status(403).json({ message: 'You do not have permission to delete these comments'});
        }

        // Delete the comments
        await Comment.deleteMany({ author: req.params.id });
        res.json({ message: 'Comments deleted successfully'});
    }
    catch (err) {
        res.status(500).json({ message: err.message});
    }
}

// Delete all comments by event id
export const deleteCommentsByEventId = async (req, res) => {
    try {
        // Check if the event exists
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found'});
        }

        // Check if there are comments to delete
        const comments = await Comment.find({ event: req.params.id });
        if (comments.length === 0) {
            return res.status(404).json({ message: 'Comments not found'});
        }

        // Check if the user is the creator of the event
        const isCreator = event.creator.toString() === req.user._id;
        if (!isCreator) {
            return res.status(403).json({ message: 'You do not have permission to delete these comments'});
        }

        // Delete all the comments
        await Comment.deleteMany({ event: req.params.id });
        res.json({ message: 'Comments deleted successfully'});
        
    }
    catch (err) {
        res.status(500).json({ message: err.message});
    }
}

// Delete all comments (for admin)