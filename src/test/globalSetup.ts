// Global setup file - runs once before all tests

import { config } from 'dotenv';

// Load test environment variables first
config({ path: '.env.test' });
// Then load .env as fallback for any missing variables
config({ path: '.env' });
export default async (): Promise<void> => {
  console.log('Global test setup - environment configured');
};
