import mongoose from 'mongoose';
import { env } from './env.js';

const connectDB = async (): Promise<void> => {
  const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  const conn = await mongoose.connect(env.mongoUri, options);
  console.log(`MongoDB Connected: ${conn.connection.host}`);
};

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected.');
});

mongoose.connection.on('error', (err) => {
  console.error(`MongoDB connection error: ${err.message}`);
});

export default connectDB;
