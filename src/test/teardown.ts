// Global teardown file
// This runs after all test suites have completed

import mongoose from 'mongoose';
import { disconnectDB, forceCloseDB } from '../config/database';

export default async (): Promise<void> => {
  try {
    // Connect if not already connected
    console.log('Cleaning up test database...');
    if (mongoose.connection.readyState === 0) {
      const mongoUri = process.env.MONGODB_URI;
      if (mongoUri) {
        await mongoose.connect(mongoUri, {
          dbName: process.env.DB_NAME || 'test',
        });
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
        console.log(`Test database '${dbName}' dropped successfully`);
      } else {
        console.log(
          `Skipping database drop for '${dbName}' (not a test database)`
        );
      }

      // FORCE CLOSE ALL CONNECTIONS
      await forceCloseDB();
    }
  } catch (error) {
    console.error('Error during global test teardown:', error);
  } finally {
    // Ensure all connections are definitely closed
    try {
      await disconnectDB();
      await forceCloseDB();
      console.log('All MongoDB connections forcefully closed');
    } catch (finalError) {
      console.error('Error in final cleanup:', finalError);
    }
  }
};
