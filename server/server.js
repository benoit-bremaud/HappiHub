import bodyParser from 'body-parser';
import commentRoutes from './routes/commentRoutes.js';
import connectDB from './config/mongo.js';
import cors from 'cors';
import dotenvFlow from 'dotenv-flow'; // Replacing dotenv with dotenv-flow
import eventRoutes from './routes/eventRoutes.js';
import express from 'express';
import userRoutes from './routes/userRoutes.js';

// Load environment variables
dotenvFlow.config();

// Create an Express application
const app = express();

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Set up CORS with environment-specific origin
const corsOptions = {
  origin: process.env.APP_URL_DEV, // Default to development URL
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true, // Allow credentials (cookies, authorization headers)
  optionsSuccessStatus: 204 // For legacy browser support
};

if (process.env.NODE_ENV === 'production') {
  corsOptions.origin = process.env.APP_URL_PROD;
} else if (process.env.NODE_ENV === 'test') {
  corsOptions.origin = process.env.APP_URL_TEST;
}
console.log(corsOptions);

app.use(cors(corsOptions));

// Middleware to parse the request body as JSON
app.use(express.json());

// Connect to the database
connectDB();

// Log the environment
console.log(`Running in ${process.env.NODE_ENV} mode`);

// Define the port
let PORT = process.env.PORT_DEV || 5000; // Use environment-specific variables
if (process.env.NODE_ENV === 'production') {
  PORT = process.env.PORT_PROD || 80;
} else if (process.env.NODE_ENV === 'test') {
  PORT = process.env.PORT_TEST || 5001;
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Define the routes
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/comments', commentRoutes);

// Define a test route
app.get('/test', (req, res) => {
  res.send('Hello HappiHub Server!');
});

export default app;
