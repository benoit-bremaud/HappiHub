import { getSession, logout, getUserProfile, getUserRole, login, signup, updateUserProfile } from '../controllers/userController.js';

import { authenticateSession } from '../middleware/auth.js';
import express from 'express';

// Create an express router
const router = express.Router();

router.get('/session', getSession);
router.post('/logout', logout);
// Auth routes
router.post('/signup', signup);
router.post('/login', login);
    
// Profile route
router.put('/profile', authenticateSession, updateUserProfile);

// Get user profile
router.get('/profile', authenticateSession, getUserProfile);

// Role based routes
router.get('/role', authenticateSession, getUserRole);

export { router as userRoutes };