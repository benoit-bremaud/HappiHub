import Comment from "../models/commentModel.js";
import User from "../models/userModel.js";
import { commentValidation } from "../validation/commentValidation.js";
import { isValidEventId } from "../validation/eventValidation.js";
import { isValidUserId } from "../validation/userValidation.js";

/**
 * 
 * 
 * @param {Object} req - The request object.
 * @param {Object} req.body - The request body containing the comment data.
 * @param {string} req.body.content - The content of the comment.
 * @param {string} req.body.user_id - The ID of the user creating the comment.
 * @param {string} req.body.event_id - The ID of the event the comment is associated with.
 * @param {Object} res - The response object.
 * @returns {Object} The created comment.
 * @throws {Object} If there is an error during the comment creation process.
 */
export const createComment = async (req, res) => {
    // Validate the comment data
    const { error } = commentValidation(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    // Check if the user_id is valid
    if (!isValidUserId(req.body.user_id)) {
        return res.status(400).json({ message: "Invalid user_id" });
    }

    // Check if the event_id is valid
    if (!isValidEventId(req.body.event_id)) {
        return res.status(400).json({ message: "Invalid event_id" });
    }

    // Create a new comment
    const newComment = new Comment({
        content: req.body.content,
        user_id: req.body.user_id,
        event_id: req.body.event_id,
    });

    try {
        const savedComment = await newComment.save();
        // Send the comment data in the response
        res.status(201).json(savedComment);
        // res.status(201).json({ message: 'Comment created successfully', comment_id: savedComment._id });
    } catch (error) {
        res.status(500).json({ message: error.message });
        console.log(error);
    }

};

/**
 * Get comments for a specific event.
 *
 * @param {Object} req - The request object.
 * @param {string} req.params.event_id - The ID of the event to retrieve comments for.
 * @param {Object} res - The response object.
 * @returns {Object} The comments for the specified event.
 * @throws {Object} If there is an error during the comment retrieval process.
 */
export const getEventComments = async (req, res) => {
    try {
      const eventId = req.params.event_id;
      const comments = await Comment.find({ event_id: eventId })
        .populate({
          path: 'user_id',
          select: 'name'
        });
      res.status(200).json(comments);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };