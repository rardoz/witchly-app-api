#!/usr/bin/env ts-node

/**
 * Manual database cleanup script
 * Run this script to manually drop the test database
 *
 * Usage: npm run clean-test-db
 */

import 'dotenv/config';
import { connectDB } from '../config/database';
import { cleanupTestDatabase, closeTestConnection } from '../test/db-cleanup';

async function main() {
  try {
    console.log('🧹 Starting test database cleanup...');

    // Connect to database
    await connectDB();

    // Clean up the test database
    await cleanupTestDatabase();

    // Close the connection
    await closeTestConnection();

    console.log('✅ Test database cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

main();
