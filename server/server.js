import connectDB from './config/mongo.js';
import dotenv from 'dotenv';
import express from 'express';
import userRoutes from './routes/userRoutes.js';

dotenv.config();

connectDB();

const app = express();

app.use(express.json());

app.use('/api/users', userRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('Hello HappiHub Server !');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
