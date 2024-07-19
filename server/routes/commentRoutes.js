import authenticateToken from "../middleware/auth.js";
import { createComment } from "../controllers/commentController.js";
import express from "express";

/**
 * Express router for handling comment routes.
 * @type {import('express').Router}
 */
const router = express.Router();

// Routes for comments
router.post("/", authenticateToken, createComment);

export default router;

