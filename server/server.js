import connectDB from './config/mongo.js';
import dotenv from 'dotenv';
import express from 'express';
import userRoutes from './routes/userRoutes.js';

// Load environment variables
dotenv.config();

// Create an express application
const app = express();


// Middleware to parse the request body as JSON
app.use(express.json());

// Connect to the database
connectDB();

// Define the routes
app.use('/api/users', userRoutes);

// Define a test route
app.get('/test', (req, res) => {
  res.send('Hello HappiHub Server !');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
