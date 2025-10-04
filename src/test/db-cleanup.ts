import mongoose from 'mongoose';

/**
 * Utility function to clean up test database
 * Call this after all tests to drop the test database
 */
export async function cleanupTestDatabase(): Promise<void> {
  try {
    if (mongoose.connection.readyState !== 0 && mongoose.connection.db) {
      const dbName = mongoose.connection.db.databaseName;

      // Safety check - only drop test databases
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
    }
  } catch (error) {
    console.error('❌ Error dropping test database:', error);
  }
}

/**
 * Utility function to close MongoDB connection
 */
export async function closeTestConnection(): Promise<void> {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('🔌 MongoDB test connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error);
  }
}
