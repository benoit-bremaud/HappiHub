import { authenticateSession, optionalAuthentication } from "../middleware/auth.js";
import { createComment,
        getEventComments } from "../controllers/commentController.js"; 


import express from "express";

/**
 * Express router for handling comment routes.
 * @type {import('express').Router}
 */
const router = express.Router();

router.post("/add", authenticateSession, createComment);
router.get('/events/:event_id/comments', optionalAuthentication, getEventComments);

// // Routes for comments
// router.post("/", authenticateSession, createComment);

// // Get comment by id
// router.get("/:id", authenticateSession, getCommentById);

// // Get all comments by user id
// router.get("/user/:event_id", authenticateSession, getCommentsByUserId);

// // Get comments by event id
// router.get("/event/:id", authenticateSession, getCommentsByEventId);

// // Get all comments (for admin)
// router.get("/", authenticateSession, isAdmin, getAllComments);

// // Update comment by id
// router.put("/:id", authenticateSession, updateCommentById);

// // Update comment by id (partial update)
// router.patch("/:id", authenticateSession, patchCommentById);

// // Delete comment by id
// router.delete("/:id", authenticateSession, deleteCommentById);

// // Delete all comments by user id
// router.delete("/user/:id", authenticateSession, deleteCommentsByUserId);

// // Delete all comments by event id
// router.delete("/event/:id", authenticateSession, deleteCommentsByEventId);

// Delete all comments (for admin)
// router.delete("/", authenticateSession, isAdmin, deleteAllComments);

export { router as commentRoutes };

