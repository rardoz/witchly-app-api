// Global setup file - runs once before all tests

import 'dotenv/config';

export default async (): Promise<void> => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';

  console.log('🚀 Global test setup - environment configured');
};
