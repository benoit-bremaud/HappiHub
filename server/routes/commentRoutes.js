import authenticateToken, { isAdmin } from "../middleware/auth.js";
import { createComment, getAllComments, getCommentById, getCommentsByEventId, getCommentsByUserId, patchCommentById, updateCommentById } from "../controllers/commentController.js";

import express from "express";

/**
 * Express router for handling comment routes.
 * @type {import('express').Router}
 */
const router = express.Router();

// Routes for comments
router.post("/", authenticateToken, createComment);

// Get comment by id
router.get("/:id", authenticateToken, getCommentById);

// Get all comments by user id
router.get("/user/:id", authenticateToken, getCommentsByUserId);

// Get comments by event id
router.get("/event/:id", authenticateToken, getCommentsByEventId);

// Get all comments (for admin)
router.get("/", authenticateToken, isAdmin, getAllComments);

// Update comment by id
router.put("/:id", authenticateToken, updateCommentById);

// Update comment by id (partial update)
router.patch("/:id", authenticateToken, patchCommentById);

export default router;

