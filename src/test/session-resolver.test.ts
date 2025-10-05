import { Client } from '../models/Client';
import { type IUser, User } from '../models/User';
import { UserSession } from '../models/UserSession';
import {
  generateClientId,
  generateClientSecret,
  hashClientSecret,
} from '../services/jwt.service';
import { SessionService } from '../services/session.service';

describe('SessionResolver GraphQL Endpoints', () => {
  let accessToken: string;
  let createdTestUser: IUser;
  let userSessionToken: string;
  let userRefreshToken: string;

  const testClient = {
    clientId: '',
    clientSecret: '',
    hashedSecret: '',
  };

  const testUser = {
    name: 'Jane Session',
    email: 'jane.session@example.com',
    userType: 'user',
    bio: 'Test user for session management',
    handle: 'janesession123',
    emailVerified: true,
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    // Generate test client credentials
    testClient.clientId = generateClientId();
    testClient.clientSecret = generateClientSecret();
    testClient.hashedSecret = await hashClientSecret(testClient.clientSecret);

    // Create test client in database
    const client = new Client({
      clientId: testClient.clientId,
      clientSecret: testClient.hashedSecret,
      name: 'Test Client for Sessions',
      description: 'Test client for session resolver tests',
      allowedScopes: ['read', 'write'],
      tokenExpiresIn: 3600,
    });
    await client.save();

    // Get access token using GraphQL mutation
    const authMutation = `
      mutation {
        authenticate(
          grant_type: "client_credentials"
          client_id: "${testClient.clientId}"
          client_secret: "${testClient.clientSecret}"
          scope: "read write"
        ) {
          access_token
        }
      }
    `;

    const authResponse = await global.testRequest
      .post('/graphql')
      .send({ query: authMutation });

    accessToken = authResponse.body.data.authenticate.access_token;

    // Create test user
    const user = new User(testUser);
    createdTestUser = await user.save();

    // Create user session for session-based authentication tests
    const sessionResponse = await SessionService.createSession(
      createdTestUser._id as string,
      true, // keepMeLoggedIn = true to get refresh token
      'Mozilla/5.0 (Test Browser)',
      '127.0.0.1'
    );

    userSessionToken = sessionResponse.sessionToken;
    userRefreshToken = sessionResponse.refreshToken!;
  }, 30000);

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: { $regex: /session.*@example\.com/ } });
    await Client.deleteOne({ clientId: testClient.clientId });
    await UserSession.deleteMany({ userId: createdTestUser._id });
  });

  describe('mySessions query', () => {
    const mySessionsQuery = `
      query {
        mySessions {
          sessionId
          keepMeLoggedIn
          lastUsedAt
          expiresAt
          userAgent
          ipAddress
          isActive
          createdAt
        }
      }
    `;

    it('should require authentication', async () => {
      const response = await global.testRequest
        .post('/graphql')
        .send({ query: mySessionsQuery });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
      expect(response.body.errors[0].message).toBe('Read access required');
    });

    it('should require read scope', async () => {
      // Create client with write scope only (no read scope)
      const writeOnlyClientId = generateClientId();
      const writeOnlyClientSecret = generateClientSecret();
      const writeOnlyClient = new Client({
        clientId: writeOnlyClientId,
        clientSecret: await hashClientSecret(writeOnlyClientSecret),
        name: 'Write Only Client',
        allowedScopes: ['write'], // Only write scope, no read
        tokenExpiresIn: 3600,
      });
      await writeOnlyClient.save();

      // Get token with only write scope
      const authResponse = await global.testRequest.post('/graphql').send({
        query: `
          mutation {
            authenticate(
              grant_type: "client_credentials"
              client_id: "${writeOnlyClientId}"
              client_secret: "${writeOnlyClientSecret}"
              scope: "write"
            ) {
              access_token
            }
          }
        `,
      });

      const writeOnlyToken = authResponse.body.data.authenticate.access_token;

      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${writeOnlyToken}`)
        .set('X-Session-Token', userSessionToken)
        .send({ query: mySessionsQuery });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
      expect(response.body.errors[0].message).toBe('Read access required');

      // Cleanup
      await Client.deleteOne({ clientId: writeOnlyClientId });
    });

    it('should require user session', async () => {
      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: mySessionsQuery });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
      expect(response.body.errors[0].message).toBe(
        'User session required to view sessions'
      );
    });

    it('should return user sessions with valid authentication', async () => {
      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Session-Token', userSessionToken)
        .send({ query: mySessionsQuery });

      expect(response.status).toBe(200);
      expect(response.body.data.mySessions).toBeDefined();
      expect(Array.isArray(response.body.data.mySessions)).toBe(true);
      expect(response.body.data.mySessions.length).toBeGreaterThan(0);

      const session = response.body.data.mySessions[0];
      expect(session.sessionId).toBeDefined();
      expect(session.keepMeLoggedIn).toBe(true);
      expect(session.lastUsedAt).toBeDefined();
      expect(session.expiresAt).toBeDefined();
      expect(session.userAgent).toBe('Mozilla/5.0 (Test Browser)');
      expect(session.ipAddress).toBe('127.0.0.1');
      expect(session.isActive).toBe(true);
      expect(session.createdAt).toBeDefined();
    });
  });

  describe('refreshSession mutation', () => {
    const refreshSessionMutation = (refreshToken: string) => `
      mutation {
        refreshSession(input: { refreshToken: "${refreshToken}" }) {
          sessionToken
          refreshToken
          expiresIn
          expiresAt
        }
      }
    `;

    it('should require authentication', async () => {
      const response = await global.testRequest
        .post('/graphql')
        .send({ query: refreshSessionMutation(userRefreshToken) });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
      expect(response.body.errors[0].message).toBe('Write access required');
    });

    it('should require write scope', async () => {
      // Create read-only client
      const readOnlyClientId = generateClientId();
      const readOnlyClientSecret = generateClientSecret();
      const readOnlyClient = new Client({
        clientId: readOnlyClientId,
        clientSecret: await hashClientSecret(readOnlyClientSecret),
        name: 'Read Only Client',
        allowedScopes: ['read'],
        tokenExpiresIn: 3600,
      });
      await readOnlyClient.save();

      // Get read-only token
      const authResponse = await global.testRequest.post('/graphql').send({
        query: `
          mutation {
            authenticate(
              grant_type: "client_credentials"
              client_id: "${readOnlyClientId}"
              client_secret: "${readOnlyClientSecret}"
              scope: "read"
            ) {
              access_token
            }
          }
        `,
      });

      const readOnlyToken = authResponse.body.data.authenticate.access_token;

      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .send({ query: refreshSessionMutation(userRefreshToken) });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
      expect(response.body.errors[0].message).toBe('Write access required');

      // Cleanup
      await Client.deleteOne({ clientId: readOnlyClientId });
    });

    it('should refresh session with valid refresh token', async () => {
      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: refreshSessionMutation(userRefreshToken) });

      expect(response.status).toBe(200);
      expect(response.body.data.refreshSession).toBeDefined();
      expect(response.body.data.refreshSession.sessionToken).toBeDefined();
      expect(response.body.data.refreshSession.refreshToken).toBeDefined();
      expect(response.body.data.refreshSession.expiresIn).toBeGreaterThan(0);
      expect(response.body.data.refreshSession.expiresAt).toBeDefined();

      // Session token should be different from the old one
      expect(response.body.data.refreshSession.sessionToken).not.toBe(
        userSessionToken
      );
      // Refresh token should remain the same
      expect(response.body.data.refreshSession.refreshToken).toBe(
        userRefreshToken
      );
    });

    it('should reject invalid refresh token', async () => {
      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: refreshSessionMutation('invalid-refresh-token') });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
      expect(response.body.errors[0].message).toBe(
        'Invalid or expired refresh token'
      );
    });
  });

  describe('logout mutation', () => {
    const logoutMutation = `
      mutation {
        logout {
          success
          message
        }
      }
    `;

    beforeEach(async () => {
      // Create a fresh session for each logout test
      const sessionResponse = await SessionService.createSession(
        createdTestUser._id as string,
        false,
        'Mozilla/5.0 (Logout Test)',
        '127.0.0.1'
      );
      userSessionToken = sessionResponse.sessionToken;
    });

    it('should require authentication', async () => {
      const response = await global.testRequest
        .post('/graphql')
        .send({ query: logoutMutation });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
      expect(response.body.errors[0].message).toBe('Write access required');
    });

    it('should require write scope', async () => {
      // Create read-only client
      const readOnlyClientId = generateClientId();
      const readOnlyClientSecret = generateClientSecret();
      const readOnlyClient = new Client({
        clientId: readOnlyClientId,
        clientSecret: await hashClientSecret(readOnlyClientSecret),
        name: 'Read Only Client',
        allowedScopes: ['read'],
        tokenExpiresIn: 3600,
      });
      await readOnlyClient.save();

      // Get read-only token
      const authResponse = await global.testRequest.post('/graphql').send({
        query: `
          mutation {
            authenticate(
              grant_type: "client_credentials"
              client_id: "${readOnlyClientId}"
              client_secret: "${readOnlyClientSecret}"
              scope: "read"
            ) {
              access_token
            }
          }
        `,
      });

      const readOnlyToken = authResponse.body.data.authenticate.access_token;

      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .set('X-Session-Token', userSessionToken)
        .send({ query: logoutMutation });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
      expect(response.body.errors[0].message).toBe('Write access required');

      // Cleanup
      await Client.deleteOne({ clientId: readOnlyClientId });
    });

    it('should require user session', async () => {
      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: logoutMutation });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
      expect(response.body.errors[0].message).toBe(
        'User session required to logout'
      );
    });

    it('should logout current session successfully', async () => {
      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Session-Token', userSessionToken)
        .send({ query: logoutMutation });

      expect(response.status).toBe(200);
      expect(response.body.data.logout).toBeDefined();
      expect(response.body.data.logout.success).toBe(true);
      expect(response.body.data.logout.message).toBe('Successfully logged out');

      // Verify session is no longer active
      const sessionInfo =
        await SessionService.validateSession(userSessionToken);
      expect(sessionInfo).toBeNull();
    });
  });

  describe('logoutAllSessions mutation', () => {
    const logoutAllSessionsMutation = `
      mutation {
        logoutAllSessions {
          success
          message
          sessionsTerminated
        }
      }
    `;

    beforeEach(async () => {
      // Create multiple fresh sessions for each test
      const session1 = await SessionService.createSession(
        createdTestUser._id as string,
        false,
        'Mozilla/5.0 (Session 1)',
        '127.0.0.1'
      );
      await SessionService.createSession(
        createdTestUser._id as string,
        true,
        'Mozilla/5.0 (Session 2)',
        '127.0.0.2'
      );
      userSessionToken = session1.sessionToken;
    });

    it('should require authentication', async () => {
      const response = await global.testRequest
        .post('/graphql')
        .send({ query: logoutAllSessionsMutation });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
      expect(response.body.errors[0].message).toBe('Write access required');
    });

    it('should require write scope', async () => {
      // Create read-only client
      const readOnlyClientId = generateClientId();
      const readOnlyClientSecret = generateClientSecret();
      const readOnlyClient = new Client({
        clientId: readOnlyClientId,
        clientSecret: await hashClientSecret(readOnlyClientSecret),
        name: 'Read Only Client',
        allowedScopes: ['read'],
        tokenExpiresIn: 3600,
      });
      await readOnlyClient.save();

      // Get read-only token
      const authResponse = await global.testRequest.post('/graphql').send({
        query: `
          mutation {
            authenticate(
              grant_type: "client_credentials"
              client_id: "${readOnlyClientId}"
              client_secret: "${readOnlyClientSecret}"
              scope: "read"
            ) {
              access_token
            }
          }
        `,
      });

      const readOnlyToken = authResponse.body.data.authenticate.access_token;

      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .set('X-Session-Token', userSessionToken)
        .send({ query: logoutAllSessionsMutation });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
      expect(response.body.errors[0].message).toBe('Write access required');

      // Cleanup
      await Client.deleteOne({ clientId: readOnlyClientId });
    });

    it('should require user session', async () => {
      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: logoutAllSessionsMutation });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
      expect(response.body.errors[0].message).toBe(
        'User session required to logout from all sessions'
      );
    });

    it('should logout all sessions successfully', async () => {
      // First verify we have multiple sessions
      const sessionsBeforeResponse = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Session-Token', userSessionToken)
        .send({
          query: `
            query {
              mySessions {
                sessionId
                isActive
              }
            }
          `,
        });

      const sessionsBefore = sessionsBeforeResponse.body.data.mySessions;
      expect(sessionsBefore.length).toBeGreaterThan(1);

      // Now logout all sessions
      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Session-Token', userSessionToken)
        .send({ query: logoutAllSessionsMutation });

      expect(response.status).toBe(200);
      expect(response.body.data.logoutAllSessions).toBeDefined();
      expect(response.body.data.logoutAllSessions.success).toBe(true);
      expect(
        response.body.data.logoutAllSessions.sessionsTerminated
      ).toBeGreaterThan(0);
      expect(response.body.data.logoutAllSessions.message).toContain(
        'Successfully logged out from'
      );

      // Verify all sessions are terminated
      const sessionInfo =
        await SessionService.validateSession(userSessionToken);
      expect(sessionInfo).toBeNull();
    });
  });
});
