import { createComment, getCommentById, getCommentsByEventId, getCommentsByUserId, updateCommentById } from "../controllers/commentController.js";

import authenticateToken from "../middleware/auth.js";
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

// Update comment by id
router.put("/:id", authenticateToken, updateCommentById);

export default router;

