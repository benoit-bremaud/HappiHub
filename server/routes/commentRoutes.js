import authenticateToken, { isAdmin } from "../middleware/auth.js";
import { createComment,
        getEventComments } from "../controllers/commentController.js"; 


import express from "express";

/**
 * Express router for handling comment routes.
 * @type {import('express').Router}
 */
const router = express.Router();

router.post("/add", authenticateToken, createComment);
router.get('/events/:event_id/comments', getEventComments);

// // Routes for comments
// router.post("/", authenticateToken, createComment);

// // Get comment by id
// router.get("/:id", authenticateToken, getCommentById);

// // Get all comments by user id
// router.get("/user/:event_id", authenticateToken, getCommentsByUserId);

// // Get comments by event id
// router.get("/event/:id", authenticateToken, getCommentsByEventId);

// // Get all comments (for admin)
// router.get("/", authenticateToken, isAdmin, getAllComments);

// // Update comment by id
// router.put("/:id", authenticateToken, updateCommentById);

// // Update comment by id (partial update)
// router.patch("/:id", authenticateToken, patchCommentById);

// // Delete comment by id
// router.delete("/:id", authenticateToken, deleteCommentById);

// // Delete all comments by user id
// router.delete("/user/:id", authenticateToken, deleteCommentsByUserId);

// // Delete all comments by event id
// router.delete("/event/:id", authenticateToken, deleteCommentsByEventId);

// Delete all comments (for admin)
// router.delete("/", authenticateToken, isAdmin, deleteAllComments);

export default router;

