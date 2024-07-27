import { getUserProfile, getUserRole, login, signup, updateUserProfile } from '../controllers/userController.js';

import authenticateToken from '../middleware/auth.js';
import express from 'express';
import { getUserId } from '../utils/jwt.js';

// Create an express router
const router = express.Router();

// Auth routes
router.post('/signup', signup);
router.post('/login', login);
    
// Profile route
router.put('/profile', authenticateToken, updateUserProfile);

// Get user profile
router.get('/profile', authenticateToken, getUserProfile);

// Role based routes
router.get('/role', authenticateToken, getUserRole);

export default router;