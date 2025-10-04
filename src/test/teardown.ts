// Global teardown file
// This runs after all test suites have completed

import 'dotenv/config'; // Load environment variables
import mongoose from 'mongoose';

export default async (): Promise<void> => {
  try {
    // Connect if not already connected
    if (mongoose.connection.readyState === 0) {
      const mongoUri = process.env.MONGODB_URI;
      if (mongoUri) {
        await mongoose.connect(mongoUri);
      }
    }

    // Only proceed if we have an active connection and database
    if (mongoose.connection.readyState !== 0 && mongoose.connection.db) {
      const dbName = mongoose.connection.db.databaseName;

      // Only drop test databases (safety check)
      if (
        dbName.toLowerCase().includes('test') ||
        process.env.NODE_ENV === 'test'
      ) {
        await mongoose.connection.db.dropDatabase();
        console.log(`🗑️  Test database '${dbName}' dropped successfully`);
      } else {
        console.log(
          `⚠️  Skipping database drop for '${dbName}' (not a test database)`
        );
      }

      // Close all connections
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed');
    }
  } catch (error) {
    console.error('❌ Error during global test teardown:', error);
  }
};
