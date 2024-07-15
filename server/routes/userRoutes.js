import { getPublicEvents, getUserProfile, login, logout, signup, updateUserProfile } from '../controllers/userController.js';

import authenticateToken from '../middleware/auth.js';
import express from 'express';

// Create an express router
const router = express.Router();

// Define the routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);

// Profile route
router.put('/profile', authenticateToken, updateUserProfile);
router.get('/profile', authenticateToken, getUserProfile);

// Route to view public events
router.get('/events', getPublicEvents);

export default router;
