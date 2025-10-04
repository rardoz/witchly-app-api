import { Client } from '../models/Client';
import { EmailVerification } from '../models/EmailVerification';
import { Signup } from '../models/Signup';
import { User } from '../models/User';
import {
  generateClientId,
  generateClientSecret,
  hashClientSecret,
} from '../services/jwt.service';

describe('SignupResolver GraphQL Endpoints', () => {
  const testClient = {
    clientId: '',
    clientSecret: '',
    hashedSecret: '',
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    // Generate test client credentials for cleanup
    testClient.clientId = generateClientId();
    testClient.clientSecret = generateClientSecret();
    testClient.hashedSecret = await hashClientSecret(testClient.clientSecret);

    // Create test client in database for consistency with other tests
    const client = new Client({
      clientId: testClient.clientId,
      clientSecret: testClient.hashedSecret,
      name: 'Test Client for Signup',
      description: 'Test client for signup resolver tests',
      allowedScopes: ['read', 'write'],
      tokenExpiresIn: 3600,
    });
    await client.save();
  }, 30000);

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: { $regex: /test|example/ } });
    await Signup.deleteMany({ email: { $regex: /test|example/ } });
    await Client.deleteOne({ clientId: testClient.clientId });
  });

  afterEach(async () => {
    // Clean up any data created during tests
    await User.deleteMany({ email: { $regex: /test|example/ } });
    await EmailVerification.deleteMany({ email: { $regex: /test|example/ } });
    await Signup.deleteMany({ email: { $regex: /test|example/ } });
  });
  describe('Mutation: initiateSignup', () => {
    const validSignupData = {
      email: 'signup.test@example.com',
    };

    it('should initiate signup successfully with valid data', async () => {
      const mutation = `
        mutation InitiateSignup($input: InitiateSignupInput!) {
          initiateSignup(input: $input) {
            success
            message
            expiresAt
          }
        }
      `;

      const response = await testRequest.post('/graphql').send({
        query: mutation,
        variables: {
          input: validSignupData,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.initiateSignup.success).toBe(true);
      expect(response.body.data.initiateSignup.message).toContain(
        'Verification code sent'
      );
      expect(response.body.data.initiateSignup.expiresAt).toBeDefined();

      // Verify that records were created
      const verification = await EmailVerification.findOne({
        email: validSignupData.email.toLowerCase(),
      });
      const signup = await Signup.findOne({
        email: validSignupData.email.toLowerCase(),
      });

      expect(verification).toBeDefined();
      expect(signup).toBeDefined();
      // EmailVerification stores the code and verification data
      expect(verification?.code).toBeDefined();
      expect(verification?.verified).toBe(false);
      // Signup stores the email and expiration
      expect(signup?.email).toBe(validSignupData.email.toLowerCase());
    });

    it('should initiate signup successfully without name', async () => {
      const mutation = `
        mutation InitiateSignup($input: InitiateSignupInput!) {
          initiateSignup(input: $input) {
            success
            message
            expiresAt
          }
        }
      `;

      const signupDataWithoutName = {
        email: 'no-name.test@example.com',
      };

      const response = await testRequest.post('/graphql').send({
        query: mutation,
        variables: {
          input: signupDataWithoutName,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.initiateSignup.success).toBe(true);
      expect(response.body.data.initiateSignup.message).toContain(
        'Verification code sent'
      );

      // Verify that records were created
      const verification = await EmailVerification.findOne({
        email: signupDataWithoutName.email.toLowerCase(),
      });
      const pendingSignup = await Signup.findOne({
        email: signupDataWithoutName.email.toLowerCase(),
      });

      expect(verification).toBeDefined();
      expect(pendingSignup).toBeDefined();
      // Signup now only stores email
      expect(pendingSignup?.email).toBe(
        signupDataWithoutName.email.toLowerCase()
      );
    });

    it('should initiate signup successfully (simplified test)', async () => {
      const mutation = `
        mutation InitiateSignup($input: InitiateSignupInput!) {
          initiateSignup(input: $input) {
            success
            message
            expiresAt
          }
        }
      `;

      const simpleSignupData = {
        email: 'simple-signup.test@example.com',
      };

      const response = await testRequest.post('/graphql').send({
        query: mutation,
        variables: {
          input: simpleSignupData,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.initiateSignup.success).toBe(true);

      // Verify that pending signup was created
      const pendingSignup = await Signup.findOne({
        email: simpleSignupData.email.toLowerCase(),
      });

      expect(pendingSignup).toBeDefined();
      expect(pendingSignup?.email).toBe(simpleSignupData.email.toLowerCase());
    });

    it('should call email service with correct parameters', async () => {
      // Import the mocked email service to spy on it
      const { emailService } = require('../config/email');
      const sendVerificationCodeSpy = jest.spyOn(
        emailService,
        'sendVerificationCode'
      );

      const mutation = `
        mutation InitiateSignup($input: InitiateSignupInput!) {
          initiateSignup(input: $input) {
            success
            message
          }
        }
      `;

      const testEmail = 'mock.test@example.com';
      const response = await testRequest.post('/graphql').send({
        query: mutation,
        variables: {
          input: {
            ...validSignupData,
            email: testEmail,
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.initiateSignup.success).toBe(true);

      // Verify the email service was called with correct parameters
      expect(sendVerificationCodeSpy).toHaveBeenCalledWith(
        testEmail,
        expect.any(String) // The verification code
      );
      expect(sendVerificationCodeSpy).toHaveBeenCalledTimes(1);
    });

    it('should return validation error for invalid email', async () => {
      const mutation = `
        mutation InitiateSignup($input: InitiateSignupInput!) {
          initiateSignup(input: $input) {
            success
            message
          }
        }
      `;

      const response = await testRequest.post('/graphql').send({
        query: mutation,
        variables: {
          input: {
            ...validSignupData,
            email: 'invalid-email',
          },
        },
      });

      expect(response.status).toBe(400);
      expect(response.body.errors[0].extensions.code).toBe('VALIDATION_ERROR');
    });

    it('should return conflict error for existing user email', async () => {
      // Create existing user
      await User.create({
        name: 'Existing User',
        email: validSignupData.email,
        userType: 'basic',
        handle: 'existing_user',
        emailVerified: true,
      });

      const mutation = `
        mutation InitiateSignup($input: InitiateSignupInput!) {
          initiateSignup(input: $input) {
            success
            message
          }
        }
      `;

      const response = await testRequest.post('/graphql').send({
        query: mutation,
        variables: {
          input: validSignupData,
        },
      });

      expect(response.status).toBe(409);
      expect(response.body.errors[0].extensions.code).toBe('CONFLICT');
    });

    it('should enforce rate limiting', async () => {
      const mutation = `
        mutation InitiateSignup($input: InitiateSignupInput!) {
          initiateSignup(input: $input) {
            success
            message
          }
        }
      `;

      const email = 'ratelimit.test@example.com';
      const testData = {
        email,
      };

      // Send first request
      const firstResponse = await testRequest.post('/graphql').send({
        query: mutation,
        variables: { input: testData },
      });

      expect(firstResponse.status).toBe(200);
      expect(firstResponse.body.data.initiateSignup.success).toBe(true);

      // Immediately send second request - should be rate limited
      const secondResponse = await testRequest.post('/graphql').send({
        query: mutation,
        variables: { input: testData },
      });

      expect(secondResponse.status).toBe(429);
      expect(secondResponse.body.errors[0].extensions.code).toBe(
        'TOO_MANY_REQUESTS'
      );
    });

    it('should return validation error for invalid email format', async () => {
      const mutation = `
        mutation InitiateSignup($input: InitiateSignupInput!) {
          initiateSignup(input: $input) {
            success
            message
          }
        }
      `;

      const response = await testRequest.post('/graphql').send({
        query: mutation,
        variables: {
          input: {
            email: 'invalid-email-format', // Invalid email format
          },
        },
      });

      expect(response.status).toBe(400);
      expect(response.body.errors[0].extensions.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Mutation: completeSignup', () => {
    let verificationCode: string;
    const testEmail = 'complete.test@example.com';

    beforeEach(async () => {
      // Set up verification code
      verificationCode = '123456';

      // Create verification record
      const verification = new EmailVerification({
        email: testEmail,
        code: await require('bcrypt').hash(verificationCode, 10),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        attempts: 0,
        verified: false,
      });
      await verification.save();

      // Create pending signup
      const pendingSignup = new Signup({
        email: testEmail,
      });
      await pendingSignup.save();
    });

    it('should complete signup successfully with valid code', async () => {
      const mutation = `
        mutation CompleteSignup($input: CompleteSignupInput!) {
          completeSignup(input: $input) {
            success
            message
            user {
              id
              name
              email
              handle
              userType
              emailVerified
            }
          }
        }
      `;

      const response = await testRequest.post('/graphql').send({
        query: mutation,
        variables: {
          input: {
            email: testEmail,
            verificationCode,
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.completeSignup.success).toBe(true);
      expect(response.body.data.completeSignup.user).toBeDefined();
      expect(response.body.data.completeSignup.user.email).toBe(testEmail);
      expect(response.body.data.completeSignup.user.emailVerified).toBe(true);
      expect(response.body.data.completeSignup.user.userType).toBe('basic');
      expect(response.body.data.completeSignup.user.handle).toMatch(
        /^[a-z]+_\d+$/
      );

      // Verify user was created
      const user = await User.findOne({ email: testEmail });
      expect(user).toBeDefined();
      expect(user?.emailVerified).toBe(true);

      // Verify cleanup happened
      const verification = await EmailVerification.findOne({
        email: testEmail,
      });
      const pendingSignup = await Signup.findOne({
        email: testEmail,
      });
      expect(verification).toBeNull();
      expect(pendingSignup).toBeNull();
    });

    it('should return error for invalid verification code', async () => {
      const mutation = `
        mutation CompleteSignup($input: CompleteSignupInput!) {
          completeSignup(input: $input) {
            success
            message
          }
        }
      `;

      const response = await testRequest.post('/graphql').send({
        query: mutation,
        variables: {
          input: {
            email: testEmail,
            verificationCode: '999999',
          },
        },
      });

      expect(response.status).toBe(400);
      expect(response.body.errors[0].extensions.code).toBe('VALIDATION_ERROR');
    });

    it('should return error for expired verification code', async () => {
      // Create expired verification
      await EmailVerification.findOneAndUpdate(
        { email: testEmail },
        { expiresAt: new Date(Date.now() - 60 * 1000) } // 1 minute ago
      );

      const mutation = `
        mutation CompleteSignup($input: CompleteSignupInput!) {
          completeSignup(input: $input) {
            success
            message
          }
        }
      `;

      const response = await testRequest.post('/graphql').send({
        query: mutation,
        variables: {
          input: {
            email: testEmail,
            verificationCode,
          },
        },
      });

      expect(response.status).toBe(404);
      expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');
    });

    it('should return error for non-existent email', async () => {
      const mutation = `
        mutation CompleteSignup($input: CompleteSignupInput!) {
          completeSignup(input: $input) {
            success
            message
          }
        }
      `;

      const response = await testRequest.post('/graphql').send({
        query: mutation,
        variables: {
          input: {
            email: 'nonexistent@example.com',
            verificationCode: '123456',
          },
        },
      });

      expect(response.status).toBe(404);
      expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');
    });

    it('should enforce attempt limits', async () => {
      const mutation = `
        mutation CompleteSignup($input: CompleteSignupInput!) {
          completeSignup(input: $input) {
            success
            message
          }
        }
      `;

      // Make multiple failed attempts
      for (let i = 0; i < 3; i++) {
        await testRequest.post('/graphql').send({
          query: mutation,
          variables: {
            input: {
              email: testEmail,
              verificationCode: '999999',
            },
          },
        });
      }

      // Next attempt should be blocked
      const response = await testRequest.post('/graphql').send({
        query: mutation,
        variables: {
          input: {
            email: testEmail,
            verificationCode: verificationCode,
          },
        },
      });

      expect(response.status).toBe(429);
      expect(response.body.errors[0].extensions.code).toBe('TOO_MANY_REQUESTS');
    });
  });

  describe('Integration: Full Signup Flow', () => {
    const fullFlowEmail = 'fullflow.test@example.com';
    const signupData = {
      email: fullFlowEmail,
    };

    it('should complete the entire signup flow successfully', async () => {
      // Step 1: Initiate signup
      const initiateMutation = `
        mutation InitiateSignup($input: InitiateSignupInput!) {
          initiateSignup(input: $input) {
            success
            message
            expiresAt
          }
        }
      `;

      const initiateResponse = await testRequest.post('/graphql').send({
        query: initiateMutation,
        variables: { input: signupData },
      });

      expect(initiateResponse.status).toBe(200);
      expect(initiateResponse.body.data.initiateSignup.success).toBe(true);

      // Step 2: Get the verification code from database (simulate email received)
      const verification = await EmailVerification.findOne({
        email: fullFlowEmail,
      });
      expect(verification).toBeDefined();

      // We need to use a known code for testing
      const testCode = '789123';
      await EmailVerification.findOneAndUpdate(
        { email: fullFlowEmail },
        { code: await require('bcrypt').hash(testCode, 10) }
      );

      // Step 3: Complete signup
      const completeMutation = `
        mutation CompleteSignup($input: CompleteSignupInput!) {
          completeSignup(input: $input) {
            success
            message
            user {
              id
              name
              email
              handle
              userType
              emailVerified
              bio
              shortBio
              location
              birthDate
              pronouns
              sex
            }
          }
        }
      `;

      const completeResponse = await testRequest.post('/graphql').send({
        query: completeMutation,
        variables: {
          input: {
            email: fullFlowEmail,
            verificationCode: testCode,
          },
        },
      });

      expect(completeResponse.status).toBe(200);
      expect(completeResponse.body.data.completeSignup.success).toBe(true);

      const user = completeResponse.body.data.completeSignup.user;
      expect(user.email).toBe(fullFlowEmail);
      expect(user.emailVerified).toBe(true);
      expect(user.userType).toBe('basic');
      expect(user.handle).toMatch(/^[a-z]+_\d+$/);

      // Profile fields should be null since we no longer collect them during signup
      expect(user.name).toBeNull();
      expect(user.bio).toBeNull();
      expect(user.shortBio).toBeNull();
      expect(user.location).toBeNull();

      // Step 4: Verify cleanup
      const remainingVerification = await EmailVerification.findOne({
        email: fullFlowEmail,
      });
      const remainingPending = await Signup.findOne({
        email: fullFlowEmail,
      });

      expect(remainingVerification).toBeNull();
      expect(remainingPending).toBeNull();

      // Step 5: Verify user exists in database
      const dbUser = await User.findOne({ email: fullFlowEmail });
      expect(dbUser).toBeDefined();
      expect(dbUser?.emailVerified).toBe(true);
    });
  });
});
