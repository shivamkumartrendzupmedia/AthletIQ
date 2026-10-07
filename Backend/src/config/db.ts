import mongoose from 'mongoose';
import { env } from './env.js';

// Connection event listeners (never log connection string)
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connection established.');
});

mongoose.connection.on('error', (err: Error) => {
  console.error('❌ MongoDB connection error:', err.name || 'ConnectionError');
});

mongoose.connection.on('disconnected', () => {
  console.log('ℹ️  MongoDB disconnected.');
});

/**
 * Connects to MongoDB with Mongoose
 */
export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(env.MONGODB_URI);
  } catch (err) {
    const error = err as Error;
    console.error('❌ Failed to connect to MongoDB on startup:', error.name || 'ConnectionError');
    throw err;
  }
};

/**
 * Closes the active MongoDB connection cleanly
 */
export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed successfully.');
  } catch (err) {
    const error = err as Error;
    console.error('❌ Error closing MongoDB connection:', error.name || 'Error');
  }
};

/**
 * Helper to check connection status for health check
 */
export const isDbConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};
