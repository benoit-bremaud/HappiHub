// mongo.js
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // Use the appropriate URI for the environment
    let mongoUri = process.env.MONGO_URI_DEV; // Default to development

    if (process.env.NODE_ENV === 'production') {
      mongoUri = process.env.MONGO_URI_PROD;
    } else if (process.env.NODE_ENV === 'test') {
      mongoUri = process.env.MONGO_URI_TEST;
    }

    if (!mongoUri) {
      throw new Error("Mongo URI is not defined");
    }
    console.log(process.env.NODE_ENV)

    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

export default connectDB;
