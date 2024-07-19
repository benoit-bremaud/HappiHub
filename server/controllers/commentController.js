import Comment from "../models/commentModel.js";

export const createComment = async (req, res) => {
    try {
        const newComment = new Comment({
            content: req.body.content,
            author: req.body.author,
            status: 'pending',
        });
        const savedComment = await newComment.save();
        res.status(201).json(savedComment);
    }
    catch (err) {
        res.status(500).json({ message: err.message});
    }
}