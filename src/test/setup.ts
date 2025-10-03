// Global test setup file
// This file runs before all tests

// Set test environment variables
process.env.NODE_ENV = 'test';

// Increase timeout for slower systems
jest.setTimeout(10000);
