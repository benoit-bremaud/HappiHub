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

// Update comment by id
export const updateCommentById = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found'});
        }
        const updatedComment = await Comment.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedComment);
    }
    catch (err) {
        res.status(500).json({ message: err.message});
    }
};