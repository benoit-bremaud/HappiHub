import { login, logout, signup } from '../controllers/userController.js';

import authenticateToken from '../middleware/auth.js';
import express from 'express';
import { updateUserProfile } from '../controllers/userController.js';

// Create an express router
const router = express.Router();

// Define the routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);

// Profile route
router.put('/profile', authenticateToken, updateUserProfile);

export default router;
