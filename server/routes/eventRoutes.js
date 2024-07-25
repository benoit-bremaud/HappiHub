import { addAttendee, createEvent, getEvents, getEventsId, getPublicEvents } from '../controllers/eventController.js';

import authenticateToken from '../middleware/auth.js';
import express from 'express';

// Create an express router
const router = express.Router();

// Routes for events
router.post('/', authenticateToken, createEvent);
router.get('/', authenticateToken, getEvents);
router.get('/:id', authenticateToken, getEventsId);
router.get('/public', authenticateToken, getPublicEvents);

// Add user id into event attendees array
router.patch('/:id', authenticateToken, addAttendee);

export default router;