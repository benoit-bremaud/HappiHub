import { login, signup } from '../controllers/userController.js';

import express from 'express';

// Create an express router
const router = express.Router();

// Define the routes
router.post('/signup', signup);
router.post('/login', login);

export default router;
