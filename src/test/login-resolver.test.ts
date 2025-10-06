import { Client } from '../models/Client';
import { EmailVerification } from '../models/EmailVerification';
import { type IUser, User } from '../models/User';
import { UserSession } from '../models/UserSession';
import {
  generateClientId,
  generateClientSecret,
  hashClientSecret,
} from '../services/jwt.service';
import { VerificationService } from '../services/verification.service';

describe('LoginResolver GraphQL Endpoints', () => {
  let accessToken: string;
  let createdTestUser: IUser; // Store the actual created user with _id

  const testClient = {
    clientId: '',
    clientSecret: '',
    hashedSecret: '',
  };

  const testUser = {
    name: 'John Doe',
    email: 'john.login@example.com',
    userType: 'user',
    bio: 'Test user for login',
    handle: 'johnlogin123',
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
      name: 'Test Client for Login',
      description: 'Test client for login resolver tests',
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
  }, 30000);

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: { $regex: /login.*@example\.com/ } });
    await Client.deleteOne({ clientId: testClient.clientId });
    await EmailVerification.deleteMany({
      email: { $regex: /login.*@example\.com/ },
    });
  });

  describe('initiateLogin mutation', () => {
    const initiateLoginMutation = (email: string) => `
      mutation {
        initiateLogin(input: { email: "${email}" }) {
          success
          message
          expiresAt
        }
      }
    `;

    beforeEach(async () => {
      // Clean up verification codes before each test
      await EmailVerification.deleteMany({
        email: testUser.email.toLowerCase(),
      });
    });

    it('should require authentication', async () => {
      const response = await global.testRequest
        .post('/graphql')
        .send({ query: initiateLoginMutation(testUser.email) });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
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
        .send({ query: initiateLoginMutation(testUser.email) });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');

      // Cleanup
      await Client.deleteOne({ clientId: readOnlyClientId });
    });

    it('should initiate login for existing verified user', async () => {
      // Verify user exists first
      const existingUser = await User.findOne({
        email: testUser.email.toLowerCase(),
      });
      expect(existingUser).toBeDefined();
      expect(existingUser?.emailVerified).toBe(true);

      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: initiateLoginMutation(testUser.email) });

      expect(response.status).toBe(200);
      expect(response.body.data.initiateLogin.success).toBe(true);
      expect(response.body.data.initiateLogin.message).toContain(
        'Verification code sent'
      );
      expect(response.body.data.initiateLogin.expiresAt).toBeDefined();

      // Check that verification record was created
      const verification = await EmailVerification.findOne({
        email: testUser.email.toLowerCase(),
      });
      expect(verification).toBeDefined();
      expect(verification?.verified).toBe(false);
    });

    it('should reject non-existent user', async () => {
      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: initiateLoginMutation('nonexistent@example.com') });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');
      expect(response.body.errors[0].message).toContain('No account found');
    });

    it('should reject unverified user', async () => {
      // Create unverified user
      const unverifiedUser = new User({
        name: 'Unverified User',
        email: 'unverified.login@example.com',
        userType: 'user',
        handle: 'unverified123',
        emailVerified: false,
      });
      await unverifiedUser.save();

      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: initiateLoginMutation('unverified.login@example.com') });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('VALIDATION_ERROR');
      expect(response.body.errors[0].message).toContain(
        'Email address not verified'
      );

      // Cleanup
      await User.deleteOne({ email: 'unverified.login@example.com' });
    });

    it('should enforce rate limiting', async () => {
      // Clean up any existing verification codes first
      await EmailVerification.deleteMany({
        email: testUser.email.toLowerCase(),
      });

      // First request
      const response1 = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: initiateLoginMutation(testUser.email) });

      expect(response1.status).toBe(200);

      // Second request within 1 minute should fail
      const response2 = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: initiateLoginMutation(testUser.email) });

      expect(response2.body.errors).toBeDefined();
      expect(response2.body.errors[0].extensions.code).toBe(
        'TOO_MANY_REQUESTS'
      );
      expect(response2.body.errors[0].message).toContain(
        'Please wait at least 1 minute before requesting'
      );
    });

    it('should validate email format', async () => {
      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: initiateLoginMutation('invalid-email') });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('completeLogin mutation', () => {
    const completeLoginMutation = (
      email: string,
      code: string,
      keepMeLoggedIn: boolean = false
    ) => `
      mutation {
        completeLogin(input: { 
          email: "${email}"
          verificationCode: "${code}"
          keepMeLoggedIn: ${keepMeLoggedIn}
        }) {
          success
          message
          sessionToken
          refreshToken
          expiresIn
          expiresAt
          userId
        }
      }
    `;

    beforeEach(async () => {
      // Clean up any existing verification codes
      await EmailVerification.deleteMany({
        email: testUser.email.toLowerCase(),
      });
    });

    it('should require authentication', async () => {
      const response = await global.testRequest
        .post('/graphql')
        .send({ query: completeLoginMutation(testUser.email, '123456') });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });

    it('should complete login with valid code', async () => {
      // First initiate login to get verification code
      const code = '123456';
      const hashedCode = await VerificationService.hashVerificationCode(code);

      const verification = new EmailVerification({
        email: testUser.email.toLowerCase(),
        code: hashedCode,
        expiresAt: new Date(
          Date.now() + VerificationService.CODE_EXPIRY_MINUTES_VALUE * 60 * 1000
        ),
        attempts: 0,
        verified: false,
      });
      await verification.save();

      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('User-Agent', 'Mozilla/5.0 (Test Login Browser)')
        .set('X-Forwarded-For', '192.168.1.100')
        .send({ query: completeLoginMutation(testUser.email, code) });

      expect(response.status).toBe(200);
      expect(response.body.data.completeLogin.success).toBe(true);
      expect(response.body.data.completeLogin.message).toContain(
        'Welcome back'
      );
      expect(response.body.data.completeLogin.sessionToken).toBeDefined();
      expect(response.body.data.completeLogin.userId).toBe(
        (createdTestUser._id as string).toString()
      );
      expect(response.body.data.completeLogin.expiresIn).toBeDefined();
      expect(response.body.data.completeLogin.expiresAt).toBeDefined();

      // Verification record should be deleted after successful login
      const deletedVerification = await EmailVerification.findOne({
        email: testUser.email.toLowerCase(),
      });
      expect(deletedVerification).toBeNull();
    });

    it('should capture userAgent and ipAddress during login', async () => {
      // First initiate login to get verification code
      const code = '789012';
      const hashedCode = await VerificationService.hashVerificationCode(code);

      const verification = new EmailVerification({
        email: testUser.email.toLowerCase(),
        code: hashedCode,
        expiresAt: new Date(
          Date.now() + VerificationService.CODE_EXPIRY_MINUTES_VALUE * 60 * 1000
        ),
        attempts: 0,
        verified: false,
      });
      await verification.save();

      // Complete login with specific headers
      const loginResponse = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('User-Agent', 'Test-Agent/1.0 (Testing UserAgent Capture)')
        .set('X-Forwarded-For', '203.0.113.42, 198.51.100.1')
        .send({ query: completeLoginMutation(testUser.email, code, true) });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.data.completeLogin.success).toBe(true);

      const sessionToken = loginResponse.body.data.completeLogin.sessionToken;
      expect(sessionToken).toBeDefined();

      // Now verify the session was created with the correct userAgent and ipAddress
      // We need to get the session data to verify the userAgent and ipAddress were captured
      const sessions = await UserSession.find({
        userId: createdTestUser._id,
        isActive: true,
      })
        .sort({ createdAt: -1 })
        .limit(1);

      expect(sessions.length).toBeGreaterThan(0);
      const latestSession = sessions[0];
      expect(latestSession).toBeDefined();
      if (latestSession) {
        expect(latestSession.userAgent).toBe(
          'Test-Agent/1.0 (Testing UserAgent Capture)'
        );
        expect(latestSession.ipAddress).toBe('203.0.113.42'); // First IP from X-Forwarded-For
      }
    });

    it('should reject invalid verification code', async () => {
      // Create verification with different code
      const correctCode = '123456';
      const wrongCode = '654321';
      const hashedCode =
        await VerificationService.hashVerificationCode(correctCode);

      const verification = new EmailVerification({
        email: testUser.email.toLowerCase(),
        code: hashedCode,
        expiresAt: new Date(
          Date.now() + VerificationService.CODE_EXPIRY_MINUTES_VALUE * 60 * 1000
        ),
        attempts: 0,
        verified: false,
      });
      await verification.save();

      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: completeLoginMutation(testUser.email, wrongCode) });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('VALIDATION_ERROR');
      expect(response.body.errors[0].message).toContain(
        'Invalid verification code'
      );

      // Check that attempts were incremented
      const updatedVerification = await EmailVerification.findOne({
        email: testUser.email.toLowerCase(),
      });
      expect(updatedVerification?.attempts).toBe(1);
    });

    it('should handle expired verification code', async () => {
      // Create expired verification
      const code = '123456';
      const hashedCode = await VerificationService.hashVerificationCode(code);

      const verification = new EmailVerification({
        email: testUser.email.toLowerCase(),
        code: hashedCode,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        attempts: 0,
        verified: false,
      });
      await verification.save();

      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: completeLoginMutation(testUser.email, code) });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');
      expect(response.body.errors[0].message).toContain('not found or expired');
    });

    it('should handle too many failed attempts', async () => {
      // Create verification with max attempts
      const code = '123456';
      const hashedCode = await VerificationService.hashVerificationCode(code);

      const verification = new EmailVerification({
        email: testUser.email.toLowerCase(),
        code: hashedCode,
        expiresAt: new Date(
          Date.now() + VerificationService.CODE_EXPIRY_MINUTES_VALUE * 60 * 1000
        ),
        attempts: VerificationService.MAX_ATTEMPTS_VALUE, // Max attempts reached
        verified: false,
      });
      await verification.save();

      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: completeLoginMutation(testUser.email, code) });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('TOO_MANY_REQUESTS');
      expect(response.body.errors[0].message).toContain(
        'Too many failed attempts'
      );

      // Verification should be deleted
      const deletedVerification = await EmailVerification.findOne({
        email: testUser.email.toLowerCase(),
      });
      expect(deletedVerification).toBeNull();
    });

    it('should reject login for non-existent user', async () => {
      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: completeLoginMutation('nonexistent@example.com', '123456'),
        });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');
      expect(response.body.errors[0].message).toContain('No account found');
    });

    it('should validate verification code format', async () => {
      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: completeLoginMutation(testUser.email, 'abc123') });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('VALIDATION_ERROR');
      expect(response.body.errors[0].message).toContain('6 digits');
    });
  });
});
