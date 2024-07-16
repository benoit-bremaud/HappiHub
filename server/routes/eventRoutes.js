import { createEvent, getEventById, getEvents, getPublicEvents } from '../controllers/eventController.js';

import authenticateToken from '../middleware/auth.js';
import express from 'express';

// Create an express router
const router = express.Router();

// Routes for events
router.post('/events', authenticateToken, createEvent);
router.get('/events', authenticateToken, getEvents);
router.get('/events/public', authenticateToken, getPublicEvents);
router.get('/events/:event_id', authenticateToken, getEventById);

export default router;