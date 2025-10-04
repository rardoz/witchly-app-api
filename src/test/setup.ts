// Global test setup file
// This file runs before each test file

import request from 'supertest';
import { app, initializeServer } from '../app';
import { disconnectDB, forceCloseDB } from '../config/database';

// Global variables for tests
declare global {
  var testRequest: ReturnType<typeof request>;
}

// Initialize server once and create global test request instance
beforeAll(async () => {
  console.log('Initializing server globally for all tests...');
  await initializeServer();

  // Create global test request instance
  global.testRequest = request(app);

  console.log('Server initialized globally - testRequest available');
}, 30000);

afterAll(async () => {
  await disconnectDB();
  await forceCloseDB();
}, 30000);

jest.setTimeout(60000);
