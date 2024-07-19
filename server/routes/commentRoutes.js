import authenticateToken from "../middleware/auth.js";
import { createComment, getEventComments } from "../controllers/commentController.js";
import express from "express";

/**
 * Express router for handling comment routes.
 * @type {import('express').Router}
 */
const router = express.Router();

// Routes for comments
router.post("/add", authenticateToken, createComment);
router.get('/events/:event_id/comments', getEventComments);


export default router;
