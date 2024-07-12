import connectDB from './config/mongo.js';
import dotenv from 'dotenv';
import eventRoutes from './routes/eventRoutes.js';
import express from 'express';
import userRoutes from './routes/userRoutes.js';
import cors from 'cors';

// Load environment variables
dotenv.config();

// Create an express application
const app = express();


// allow all origins
// app.use(cors());

app.use(cors({
  origin: 'http://localhost:3000'
}));


// Middleware to parse the request body as JSON
app.use(express.json());

// Connect to the database
connectDB();

// Define the port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Define the routes
app.use('/api/users', userRoutes);
app.use('/api', eventRoutes);

// Define a test route
app.get('/test', (req, res) => {
  res.send('Hello HappiHub Server !');
});