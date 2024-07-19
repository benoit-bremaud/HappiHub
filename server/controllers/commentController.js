import Comment from "../models/commentModel.js";

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