// Global test setup file
// This file runs before each test file

// Mock the email service globally for all tests before any imports
jest.mock('../config/email', () => ({
  emailService: {
    sendVerificationCode: jest.fn().mockResolvedValue(undefined),
    sendLoginVerificationCode: jest.fn().mockResolvedValue(undefined),
    sendEmail: jest.fn().mockResolvedValue(undefined),
    sendTemplatedEmail: jest.fn().mockResolvedValue(undefined),
    testConnection: jest.fn().mockResolvedValue(true),
    listMethods: jest
      .fn()
      .mockReturnValue([
        'sendVerificationCode',
        'sendLoginVerificationCode',
        'sendEmail',
        'sendTemplatedEmail',
      ]),
  },
}));

import request, { type Test } from 'supertest';
import { app, initializeServer } from '../app';
import { disconnectDB, forceCloseDB } from '../config/database';
import { Client } from '../models/Client';
import { User } from '../models/User';
import {
  generateClientId,
  generateClientSecret,
  hashClientSecret,
} from '../services/jwt.service';
import { SessionService } from '../services/session.service';

const basicClient: {
  clientId: string;
  clientSecret: string;
  hashedSecret: string;
} = {
  clientId: '',
  clientSecret: '',
  hashedSecret: '',
};
const adminClient: {
  clientId: string;
  clientSecret: string;
  hashedSecret: string;
} = {
  clientId: '',
  clientSecret: '',
  hashedSecret: '',
};

// Global variables for tests
declare global {
  var testRequest: ReturnType<typeof request>;
  var adminUserAdminAppTestRequest: () => Test;
  var basicUserBasicAppTestRequest: () => Test;
  var basicUserAdminAppTestRequest: () => Test;
  var basicAccessToken: string;
  var adminAccessToken: string;
  var basicSessionToken: string;
  var adminSessionToken: string;
  var basicUserId: string;
  var adminUserId: string;
}

// Initialize server once and create global test request instance
beforeAll(async () => {
  console.log('Initializing server globally for all tests...');
  await initializeServer();

  // Create global test request instance
  global.testRequest = request(app);

  basicClient.clientId = generateClientId();
  basicClient.clientSecret = generateClientSecret();
  basicClient.hashedSecret = await hashClientSecret(basicClient.clientSecret);

  adminClient.clientId = generateClientId();
  adminClient.clientSecret = generateClientSecret();
  adminClient.hashedSecret = await hashClientSecret(adminClient.clientSecret);

  // Create test client in database
  let client = new Client({
    clientId: basicClient.clientId,
    clientSecret: basicClient.hashedSecret,
    name: 'Basic Client for App Testing',
    description: 'Basic client for resolver tests',
    allowedScopes: ['read', 'write', 'basic'],
    tokenExpiresIn: 3600,
  });
  await client.save();

  // Create test client in database
  client = new Client({
    clientId: adminClient.clientId,
    clientSecret: adminClient.hashedSecret,
    name: 'Admin Client for App Testing',
    description: 'Admin client for resolver tests',
    allowedScopes: ['read', 'write', 'admin'],
    tokenExpiresIn: 3600,
  });
  await client.save();

  // Get access token using GraphQL mutation
  const basicAuth = `
      mutation {
        authenticate(
          grant_type: "client_credentials"
          client_id: "${basicClient.clientId}"
          client_secret: "${basicClient.clientSecret}"
          scope: "read write basic"
        ) {
          access_token
        }
      }
    `;

  const adminAuth = `
      mutation {
        authenticate(
          grant_type: "client_credentials"
          client_id: "${adminClient.clientId}"
          client_secret: "${adminClient.clientSecret}"
          scope: "read write admin"
        ) {
          access_token
        }
      }
    `;

  const basicTokenResponse = await testRequest
    .post('/graphql')
    .send({ query: basicAuth });

  global.basicAccessToken =
    basicTokenResponse.body.data.authenticate.access_token;

  const adminTokenResponse = await testRequest
    .post('/graphql')
    .send({ query: adminAuth });
  global.adminAccessToken =
    adminTokenResponse.body.data.authenticate.access_token;

  const adminUser = await User.create({
    name: 'Test Admin User',
    email: 'admin.test-auth@witchlyapp.com',
    allowedScopes: ['read', 'write', 'admin'],
    handle: 'admin_test_user',
  });
  global.adminUserId = adminUser.id.toString();
  const adminSession = await SessionService.createSession(
    adminUser.id,
    true, // keepMeLoggedIn
    'node-superagent/3.8.3', // Match supertest/superagent User-Agent
    '::ffff:127.0.0.1'
  );
  global.adminSessionToken = adminSession.sessionToken;

  const basicUser = await User.create({
    name: 'Test Basic User',
    email: 'basic.test-auth@witchlyapp.com',
    allowedScopes: ['read', 'write', 'basic'],
    handle: 'basic_test_user',
  });
  global.basicUserId = basicUser.id.toString();
  const basicSession = await SessionService.createSession(
    basicUser.id,
    true, // keepMeLoggedIn
    'node-superagent/3.8.3', // Match supertest/superagent User-Agent
    '::ffff:127.0.0.1'
  );
  global.basicSessionToken = basicSession.sessionToken;

  global.adminUserAdminAppTestRequest = () =>
    request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${global.adminAccessToken}`)
      .set('X-Session-Token', global.adminSessionToken)
      .set('User-Agent', 'node-superagent/3.8.3');
  global.basicUserBasicAppTestRequest = () =>
    request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${global.basicAccessToken}`)
      .set('X-Session-Token', global.basicSessionToken)
      .set('User-Agent', 'node-superagent/3.8.3');

  global.basicUserAdminAppTestRequest = () =>
    request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${global.adminAccessToken}`)
      .set('X-Session-Token', global.basicSessionToken)
      .set('User-Agent', 'node-superagent/3.8.3');

  console.log('Server setup for testing complete');
}, 30000);

afterAll(async () => {
  // Clean up test data
  await Client.deleteOne({ clientId: basicClient.clientId });
  await Client.deleteOne({ clientId: adminClient.clientId });
  await User.deleteMany({ email: /test-auth@witchlyapp.com$/i });
  await disconnectDB();
  await forceCloseDB();
}, 30000);

jest.setTimeout(60000);
