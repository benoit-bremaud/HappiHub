import authenticateToken from '../middleware/auth.js';
import { createEvent } from '../controllers/eventController.js';
import express from 'express';

// Create an express router
const router = express.Router();

// Routes for events
router.post('/events', authenticateToken, createEvent);

export default router;