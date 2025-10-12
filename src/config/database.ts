import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is required');
    }

    await mongoose.connect(mongoUri, { dbName: process.env.DB_NAME || 'test' });
    console.log(
      'MongoDB connected successfully to DB with name:',
      process.env.DB_NAME || 'test'
    );
  } catch (error) {
    console.error('MongoDB connection error:', error);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('MongoDB disconnection error:', error);
  }
};

export const forceCloseDB = async (): Promise<void> => {
  try {
    // Force close all connections
    await mongoose.connection.close(true);

    // Force close any remaining connections
    if (mongoose.connections) {
      for (const connection of mongoose.connections) {
        if (connection.readyState !== 0) {
          await connection.close(true); // Force close
        }
      }
    }
    console.log('MongoDB connections forcefully closed');
  } catch (error) {
    console.error('MongoDB force close error:', error);
  }
};
