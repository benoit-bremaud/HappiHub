import { createEvent, getEvents } from '../controllers/eventController.js';

import authenticateToken from '../middleware/auth.js';
import express from 'express';

// Create an express router
const router = express.Router();

// Routes for events
router.post('/events', authenticateToken, createEvent);
router.get('/events', authenticateToken, getEvents);

export default router;