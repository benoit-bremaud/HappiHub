import { createEvent, getEvents, getPublicEvents, getEventsId, addAttendee, getAttendees } from '../controllers/eventController.js';

import authenticateToken from '../middleware/auth.js';
import express from 'express';

// Create an express router
const router = express.Router();

// Routes for events
router.post('/events', authenticateToken, createEvent);
router.get('/events', authenticateToken, getEvents);
router.get('/events/:id', authenticateToken, getEventsId);
router.get('/events/public', authenticateToken, getPublicEvents);
router.post('/events/attend/:event_id', authenticateToken, addAttendee);
router.get('/events/attend/:event_id', authenticateToken, getAttendees);

export default router;