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
    allowedScopes: ['read', 'write', 'basic'],
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
    // Express in test environment typically provides IPv6-mapped IPv4 addresses
    const sessionResponse = await SessionService.createSession(
      createdTestUser._id as string,
      true, // keepMeLoggedIn = true to get refresh token
      'Mozilla/5.0 (Test Browser)',
      '::ffff:127.0.0.1' // Express format for localhost in test
    );

    userSessionToken = sessionResponse.sessionToken;
    userRefreshToken = sessionResponse.refreshToken || '';
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
      // Create a fresh session for this test to avoid isolation issues
      const freshSessionResponse = await SessionService.createSession(
        createdTestUser._id as string,
        true,
        'Mozilla/5.0 (Test Browser)',
        '::ffff:127.0.0.1'
      );

      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Session-Token', freshSessionResponse.sessionToken)
        .set('User-Agent', 'Mozilla/5.0 (Test Browser)') // Match session creation
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
      expect(session.ipAddress).toBe('::ffff:127.0.0.1'); // Express format for localhost
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
      // Create a fresh session with refresh token for this test
      const freshSessionResponse = await SessionService.createSession(
        createdTestUser._id as string,
        true, // keepMeLoggedIn = true to get refresh token
        'Mozilla/5.0 (Test Browser)',
        '::ffff:127.0.0.1'
      );

      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Session-Token', freshSessionResponse.sessionToken) // Need session token for user validation
        .set('User-Agent', 'Mozilla/5.0 (Test Browser)') // Match session creation
        .send({
          query: refreshSessionMutation(
            freshSessionResponse.refreshToken || ''
          ),
        });

      expect(response.status).toBe(200);
      expect(response.body.data.refreshSession).toBeDefined();
      expect(response.body.data.refreshSession.sessionToken).toBeDefined();
      expect(response.body.data.refreshSession.refreshToken).toBeDefined();
      expect(response.body.data.refreshSession.expiresIn).toBeGreaterThan(0);
      expect(response.body.data.refreshSession.expiresAt).toBeDefined();

      // The new session token should be valid
      expect(response.body.data.refreshSession.sessionToken).toBeTruthy();

      // Refresh token should remain the same
      expect(response.body.data.refreshSession.refreshToken).toBe(
        freshSessionResponse.refreshToken
      );

      // Expiration should be updated (refreshed sessions should have longer expiration)
      expect(
        new Date(response.body.data.refreshSession.expiresAt).getTime()
      ).toBeGreaterThan(freshSessionResponse.expiresAt.getTime());
    });

    it('should require user session for refresh token validation', async () => {
      // Create two different users
      const anotherUser = new User({
        name: 'Another User',
        email: 'another.refresh@example.com',
        allowedScopes: ['read', 'write', 'basic'],
        handle: 'another_refresh',
        emailVerified: true,
      });
      await anotherUser.save();

      // Create sessions for both users
      const user1Session = await SessionService.createSession(
        createdTestUser._id as string,
        true,
        'Mozilla/5.0 (Test Browser)',
        '::ffff:127.0.0.1'
      );

      const user2Session = await SessionService.createSession(
        anotherUser._id as string,
        true,
        'Mozilla/5.0 (Test Browser)',
        '::ffff:127.0.0.1'
      );

      // Try to refresh user1's token while authenticated as user2
      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Session-Token', user2Session.sessionToken) // User2's session
        .set('User-Agent', 'Mozilla/5.0 (Test Browser)')
        .send({
          query: refreshSessionMutation(
            user1Session.refreshToken || '' // User1's refresh token
          ),
        });

      // GraphQL returns 401 for UNAUTHORIZED errors
      expect(response.status).toBe(401);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
      expect(response.body.errors[0].message).toBe(
        'Refresh token does not belong to the current user'
      );

      // Cleanup
      await User.deleteOne({ _id: anotherUser._id });
      await UserSession.deleteMany({ userId: anotherUser._id });
    });

    it('should require user session token to be provided', async () => {
      // Create a session
      const freshSessionResponse = await SessionService.createSession(
        createdTestUser._id as string,
        true,
        'Mozilla/5.0 (Test Browser)',
        '::ffff:127.0.0.1'
      );

      // Make request without session token
      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        // Intentionally NOT setting X-Session-Token
        .send({
          query: refreshSessionMutation(
            freshSessionResponse.refreshToken || ''
          ),
        });

      // GraphQL returns 401 for UNAUTHORIZED errors
      expect(response.status).toBe(401);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
      expect(response.body.errors[0].message).toBe(
        'User session required to refresh tokens'
      );
    });

    it('should reject invalid refresh token', async () => {
      // Create a valid session to provide the required session token
      const validSession = await SessionService.createSession(
        createdTestUser._id as string,
        true,
        'Mozilla/5.0 (Test Browser)',
        '::ffff:127.0.0.1'
      );

      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Session-Token', validSession.sessionToken) // Provide valid session
        .set('User-Agent', 'Mozilla/5.0 (Test Browser)')
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
        '::ffff:127.0.0.1' // Express format for localhost
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
        .set('User-Agent', 'Mozilla/5.0 (Logout Test)') // Match session creation
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
        'Mozilla/5.0 (Test Browser)', // Match the main session User-Agent
        '::ffff:127.0.0.1' // Express format for localhost
      );
      await SessionService.createSession(
        createdTestUser._id as string,
        true,
        'Mozilla/5.0 (Session 2)',
        '::ffff:127.0.0.2'
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
        .set('User-Agent', 'Mozilla/5.0 (Test Browser)') // Match session creation
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
        .set('User-Agent', 'Mozilla/5.0 (Test Browser)') // Match session creation
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
