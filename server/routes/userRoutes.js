import { getUserById, getUserProfile, getUserRole, login, signup, updateUserProfile } from '../controllers/userController.js';

import authenticateToken from '../middleware/auth.js';
import express from 'express';

// Create an express router
const router = express.Router();

// Auth routes
router.post('/signup', signup);
router.post('/login', login);
    

// User routes
router.get('/:id', authenticateToken, getUserById);

// Profile route
router.put('/profile', authenticateToken, updateUserProfile);
router.get('/profile', authenticateToken, getUserProfile);

// Role based routes
router.get('/role', authenticateToken, getUserRole);

export default router;