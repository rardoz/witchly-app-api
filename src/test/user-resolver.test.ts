import { Types } from 'mongoose';
import { Client } from '../models/Client';
import { User } from '../models/User';
import {
  generateClientId,
  generateClientSecret,
  hashClientSecret,
} from '../services/jwt.service';
import { SessionService } from '../services/session.service';

describe('UserResolver GraphQL Endpoints', () => {
  let accessToken: string;

  const testClient = {
    clientId: '',
    clientSecret: '',
    hashedSecret: '',
  };

  const testUser = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    bio: 'Test user biography',
    handle: 'johndoe123',
  };

  const _testAdminUser = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    allowedScopes: ['read', 'write', 'admin'],
    bio: 'Test user biography',
    handle: 'johndoe123',
  };

  beforeAll(async () => {
    // Generate test client credentials
    testClient.clientId = generateClientId();
    testClient.clientSecret = generateClientSecret();
    testClient.hashedSecret = await hashClientSecret(testClient.clientSecret);

    // Create test client in database
    const client = new Client({
      clientId: testClient.clientId,
      clientSecret: testClient.hashedSecret,
      name: 'Test Client',
      description: 'Test client for user resolver tests',
      allowedScopes: ['read', 'write'],
      tokenExpiresIn: 3600,
    });
    await client.save();

    // Get access token using GraphQL mutation
    const mutation = `
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

    const tokenResponse = await testRequest
      .post('/graphql')
      .send({ query: mutation });

    accessToken = tokenResponse.body.data.authenticate.access_token;
  }, 30000);

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: { $regex: /test|example/ } });
    await Client.deleteOne({ clientId: testClient.clientId });
  });

  afterEach(async () => {
    // Clean up any users created during tests
    await User.deleteMany({ email: { $regex: /test|example/ } });
  });

  describe('Query: users', () => {
    beforeEach(async () => {
      // Create some test users
      await User.create([
        {
          name: 'User 1',
          email: 'user1@test.com',
          allowedScopes: ['read', 'write', 'admin'],
          handle: 'user_1',
        },
        {
          name: 'User 2',
          email: 'user2@test.com',
          allowedScopes: ['read', 'write', 'admin'],
          handle: 'user_2',
        },
        {
          name: 'User 3',
          email: 'user3@test.com',
          allowedScopes: ['read', 'write', 'admin'],
          handle: 'user_3',
        },
      ]);
    });

    it('should return list of users with authentication', async () => {
      const query = `
        query {
          users {
            id
            name
            email
            allowedScopes
            createdAt
            updatedAt
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.users).toHaveLength(3);
      expect(response.body.data.users[0]).toHaveProperty('id');
      expect(response.body.data.users[0]).toHaveProperty('name');
      expect(response.body.data.users[0]).toHaveProperty('email');
      expect(response.body.data.users[0]).toHaveProperty('allowedScopes');
    });

    it('should return paginated users with limit and offset', async () => {
      const query = `
        query GetUsers($limit: Float, $offset: Float) {
          users(limit: $limit, offset: $offset) {
            id
            name
            email
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query,
          variables: { limit: 2, offset: 1 },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.users).toHaveLength(2);
    });

    it('should return 401 without authentication', async () => {
      const query = `
        query {
          users {
            id
            name
          }
        }
      `;

      const response = await testRequest.post('/graphql').send({ query });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });

    it('should return validation error for invalid limit', async () => {
      const query = `
        query GetUsers($limit: Float) {
          users(limit: $limit) {
            id
            name
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query,
          variables: { limit: 150 },
        });

      expect(response.status).toBe(400);
      expect(response.body.errors[0].extensions.code).toBe('VALIDATION_ERROR');
      expect(response.body.errors[0].message).toContain(
        'Limit must be between 1 and 100'
      );
    });

    it('should return validation error for negative offset', async () => {
      const query = `
        query GetUsers($offset: Float) {
          users(offset: $offset) {
            id
            name
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query,
          variables: { offset: -1 },
        });

      expect(response.status).toBe(400);
      expect(response.body.errors[0].extensions.code).toBe('VALIDATION_ERROR');
      expect(response.body.errors[0].message).toContain(
        'Offset must be non-negative'
      );
    });
  });

  describe('Query: user', () => {
    let createdUserId: string;

    beforeEach(async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test.user@example.com',
        allowedScopes: ['read', 'write', 'admin'],
        bio: 'Test biography',
        handle: 'test_user',
      });
      createdUserId = user.id;
    });

    it('should return user by ID with authentication', async () => {
      const query = `
        query GetUser($id: ID!) {
          user(id: $id) {
            id
            name
            email
            allowedScopes
            bio
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query,
          variables: { id: createdUserId },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.user).toHaveProperty('id', createdUserId);
      expect(response.body.data.user).toHaveProperty('name', 'Test User');
      expect(response.body.data.user).toHaveProperty(
        'email',
        'test.user@example.com'
      );
      expect(response.body.data.user).toHaveProperty('bio', 'Test biography');
    });

    it('should return 404 for non-existent user', async () => {
      const nonExistentId = new Types.ObjectId().toString();
      const query = `
        query GetUser($id: ID!) {
          user(id: $id) {
            id
            name
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query,
          variables: { id: nonExistentId },
        });

      expect(response.status).toBe(404);
      expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');
      expect(response.body.errors[0].message).toBe('User not found');
    });

    it('should return 401 without authentication', async () => {
      const query = `
        query GetUser($id: ID!) {
          user(id: $id) {
            id
            name
          }
        }
      `;

      const response = await testRequest.post('/graphql').send({
        query,
        variables: { id: createdUserId },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Mutation: createUser', () => {
    it('should create user with valid input', async () => {
      const mutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            name
            email
            allowedScopes
            bio
            handle
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: mutation,
          variables: {
            input: testUser,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.createUser).toHaveProperty('id');
      expect(response.body.data.createUser).toHaveProperty(
        'name',
        testUser.name
      );
      expect(response.body.data.createUser).toHaveProperty(
        'email',
        testUser.email
      );
      expect(response.body.data.createUser).toHaveProperty('allowedScopes', [
        'read',
        'write',
        'basic',
      ]);
      expect(response.body.data.createUser).toHaveProperty('bio', testUser.bio);
      expect(response.body.data.createUser).toHaveProperty(
        'handle',
        testUser.handle
      );
    });

    it('should return 409 conflict for duplicate email', async () => {
      // First create a user
      await User.create({
        name: 'Existing User',
        email: 'duplicate@example.com',
        handle: 'existing_user',
      });

      const mutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            name
            email
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: mutation,
          variables: {
            input: {
              name: 'Another User',
              email: 'duplicate@example.com',
              handle: 'another_user',
            },
          },
        });

      expect(response.status).toBe(409);
      expect(response.body.errors[0].extensions.code).toBe('CONFLICT');
      expect(response.body.errors[0].message).toContain(
        'User with this email or handle already exists'
      );
    });

    it('should return 401 without authentication', async () => {
      const mutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            name
          }
        }
      `;

      const response = await testRequest.post('/graphql').send({
        query: mutation,
        variables: {
          input: testUser,
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });

    it('should prevent non-admin from creating user with custom allowedScopes', async () => {
      const mutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            name
            email
            allowedScopes
          }
        }
      `;

      // Try to create user with custom allowedScopes using only OAuth2 token (no admin user session)
      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: mutation,
          variables: {
            input: {
              name: 'Test Admin User',
              email: 'testadmin@example.com',
              handle: 'test_admin_user',
              allowedScopes: ['read', 'write', 'admin'], // Trying to set custom scopes
            },
          },
        });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
      expect(response.body.errors[0].message).toBe(
        'Admin access required to set scopes'
      );
    });
  });

  describe('Mutation: updateUser', () => {
    let createdUserId: string;
    let userSessionToken: string;

    beforeEach(async () => {
      const user = await User.create({
        name: 'Original Name',
        email: 'original@example.com',
        allowedScopes: ['read', 'write', 'admin'],
        bio: 'Original bio',
        handle: 'original_user',
        emailVerified: true,
      });
      createdUserId = user.id;

      // Create session for the user so they can update their own profile
      const session = await SessionService.createSession(
        createdUserId,
        true, // keepMeLoggedIn
        'node-superagent/3.8.3', // Match supertest/superagent User-Agent
        '::ffff:127.0.0.1'
      );
      userSessionToken = session.sessionToken;
    });

    it('should update user with valid input', async () => {
      const mutation = `
        mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
          updateUser(id: $id, input: $input) {
            id
            name
            email
            bio
            handle
          }
        }
      `;

      const updateData = {
        name: 'Updated Name',
        bio: 'Updated bio',
        handle: 'updated_handle',
      };

      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Session-Token', userSessionToken)
        .set('User-Agent', 'node-superagent/3.8.3')
        .send({
          query: mutation,
          variables: {
            id: createdUserId,
            input: updateData,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.updateUser).toHaveProperty('id', createdUserId);
      expect(response.body.data.updateUser).toHaveProperty(
        'name',
        'Updated Name'
      );
      expect(response.body.data.updateUser).toHaveProperty(
        'bio',
        'Updated bio'
      );
      expect(response.body.data.updateUser).toHaveProperty(
        'handle',
        'updated_handle'
      );
      expect(response.body.data.updateUser).toHaveProperty(
        'email',
        'original@example.com'
      ); // Should remain unchanged
    });

    it('should return 404 for non-existent user', async () => {
      const nonExistentId = new Types.ObjectId().toString();
      const mutation = `
        mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
          updateUser(id: $id, input: $input) {
            id
            name
          }
        }
      `;

      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Session-Token', userSessionToken)
        .set('User-Agent', 'node-superagent/3.8.3')
        .send({
          query: mutation,
          variables: {
            id: nonExistentId,
            input: { name: 'Updated Name' },
          },
        });

      expect(response.status).toBe(404);
      expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');
      expect(response.body.errors[0].message).toBe('User not found');
    });

    it('should return 401 without authentication', async () => {
      const mutation = `
        mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
          updateUser(id: $id, input: $input) {
            id
            name
          }
        }
      `;

      const response = await global.testRequest.post('/graphql').send({
        query: mutation,
        variables: {
          id: createdUserId,
          input: { name: 'Updated Name' },
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });

    it('should prevent non-admin from updating user allowedScopes', async () => {
      // Create a regular user (without admin scope) for this test
      const regularUser = await User.create({
        name: 'Regular User',
        email: 'regular@example.com',
        allowedScopes: ['read', 'write', 'basic'], // No admin scope
        handle: 'regular_user',
        emailVerified: true,
      });

      // Create session for the regular user
      const regularUserSession = await SessionService.createSession(
        regularUser.id,
        true,
        'node-superagent/3.8.3',
        '::ffff:127.0.0.1'
      );

      // Create another user to try to update
      const targetUser = await User.create({
        name: 'Target User',
        email: 'target@example.com',
        allowedScopes: ['read', 'write', 'basic'],
        handle: 'target_user',
        emailVerified: true,
      });

      const mutation = `
        mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
          updateUser(id: $id, input: $input) {
            id
            name
            allowedScopes
          }
        }
      `;

      // Try to update another user's allowedScopes using session of regular user (no admin scope)
      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Session-Token', regularUserSession.sessionToken) // Regular user session (no admin scope)
        .set('User-Agent', 'node-superagent/3.8.3')
        .send({
          query: mutation,
          variables: {
            id: targetUser.id,
            input: {
              name: 'Updated Name',
              allowedScopes: ['read', 'write', 'admin'], // Trying to escalate privileges
            },
          },
        });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
      expect(response.body.errors[0].message).toBe(
        'Admin access required to set scopes'
      );

      // Cleanup
      await User.findByIdAndDelete(regularUser.id);
      await User.findByIdAndDelete(targetUser.id);
    });

    it('should allow basic user to update their own profile without allowedScopes', async () => {
      // Create a basic user (without admin scope) for this test
      const basicUser = await User.create({
        name: 'Basic User',
        email: 'basic@example.com',
        allowedScopes: ['read', 'write', 'basic'], // No admin scope
        bio: 'Original bio',
        handle: 'basic_user',
        emailVerified: true,
      });

      // Create session for the basic user
      const basicUserSession = await SessionService.createSession(
        basicUser.id,
        true,
        'node-superagent/3.8.3',
        '::ffff:127.0.0.1'
      );

      const mutation = `
        mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
          updateUser(id: $id, input: $input) {
            id
            name
            bio
            handle
          }
        }
      `;

      // Basic user updates their own profile (without touching allowedScopes)
      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Session-Token', basicUserSession.sessionToken)
        .set('User-Agent', 'node-superagent/3.8.3')
        .send({
          query: mutation,
          variables: {
            id: basicUser.id, // Updating their own account
            input: {
              name: 'Updated Basic User',
              bio: 'Updated bio for basic user',
              handle: 'updated_basic_user',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.updateUser).toHaveProperty('id', basicUser.id);
      expect(response.body.data.updateUser).toHaveProperty(
        'name',
        'Updated Basic User'
      );
      expect(response.body.data.updateUser).toHaveProperty(
        'bio',
        'Updated bio for basic user'
      );
      expect(response.body.data.updateUser).toHaveProperty(
        'handle',
        'updated_basic_user'
      );

      // Verify the user was actually updated in the database
      const updatedUser = await User.findById(basicUser.id);
      expect(updatedUser?.name).toBe('Updated Basic User');
      expect(updatedUser?.bio).toBe('Updated bio for basic user');
      expect(updatedUser?.allowedScopes).toEqual(['read', 'write', 'basic']); // Should remain unchanged

      // Cleanup
      await User.findByIdAndDelete(basicUser.id);
    });
  });

  describe('Mutation: deleteUser', () => {
    let createdUserId: string;
    let userSessionToken: string;

    beforeEach(async () => {
      const user = await User.create({
        name: 'To Be Deleted',
        email: 'delete@example.com',
        allowedScopes: ['read', 'write', 'admin'],
        handle: 'to_be_deleted',
        emailVerified: true,
      });
      createdUserId = user.id;

      // Create session for the user so they can delete their own profile
      const session = await SessionService.createSession(
        createdUserId,
        true, // keepMeLoggedIn
        'node-superagent/3.8.3', // Match supertest User-Agent
        '::ffff:127.0.0.1'
      );
      userSessionToken = session.sessionToken;
    });

    it('should delete user successfully', async () => {
      // Create a specific user for this test with basic scopes
      const testUser = await User.create({
        name: 'Self Delete User',
        email: 'selfdelete@example.com',
        allowedScopes: ['read', 'write', 'basic'], // Basic scopes only
        handle: 'self_delete_user',
        emailVerified: true,
      });
      const testUserId = testUser.id;

      // Create session for this specific user
      const testSession = await SessionService.createSession(
        testUserId,
        true, // keepMeLoggedIn
        'node-superagent/3.8.3', // Match supertest User-Agent
        '::ffff:127.0.0.1'
      );

      const mutation = `
        mutation DeleteUser($id: ID!) {
          deleteUser(id: $id)
        }
      `;

      // User deletes their own account
      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Session-Token', testSession.sessionToken)
        .set('User-Agent', 'node-superagent/3.8.3')
        .send({
          query: mutation,
          variables: { id: testUserId },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.deleteUser).toBe(true);

      // Verify user was actually deleted
      const deletedUser = await User.findById(testUserId);
      expect(deletedUser).toBeNull();
    });

    it('should return 404 for non-existent user', async () => {
      const nonExistentId = new Types.ObjectId().toString();
      const mutation = `
        mutation DeleteUser($id: ID!) {
          deleteUser(id: $id)
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Session-Token', userSessionToken)
        .set('User-Agent', 'node-superagent/3.8.3')
        .send({
          query: mutation,
          variables: { id: nonExistentId },
        });

      expect(response.status).toBe(404);
      expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');
      expect(response.body.errors[0].message).toBe('User not found');
    });

    it('should return 401 without authentication', async () => {
      const mutation = `
        mutation DeleteUser($id: ID!) {
          deleteUser(id: $id)
        }
      `;

      const response = await testRequest.post('/graphql').send({
        query: mutation,
        variables: { id: createdUserId },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });

    it('should prevent user from deleting another user account', async () => {
      // Create another user that will try to delete the first user
      const anotherUser = await User.create({
        name: 'Another User',
        email: 'another@example.com',
        allowedScopes: ['read', 'write'], // No admin scope
        handle: 'another_user',
        emailVerified: true,
      });

      // Create session for the other user
      const anotherSession = await SessionService.createSession(
        anotherUser.id,
        true,
        'node-superagent/3.8.3',
        '::ffff:127.0.0.1'
      );

      const mutation = `
        mutation DeleteUser($id: ID!) {
          deleteUser(id: $id)
        }
      `;

      // Try to delete the first user using another user's session
      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Session-Token', anotherSession.sessionToken)
        .set('User-Agent', 'node-superagent/3.8.3')
        .send({
          query: mutation,
          variables: { id: createdUserId }, // Try to delete different user
        });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
      expect(response.body.errors[0].message).toBe(
        'Users can only delete their own accounts'
      );

      // Verify original user still exists
      const stillExists = await User.findById(createdUserId);
      expect(stillExists).not.toBeNull();

      // Cleanup
      await User.findByIdAndDelete(anotherUser.id);
    });

    it('should allow admin user to delete any user account', async () => {
      // Create an admin user
      const adminUser = await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        allowedScopes: ['read', 'write', 'admin'], // Has admin scope
        handle: 'admin_user',
        emailVerified: true,
      });

      // Create session for the admin user
      const adminSession = await SessionService.createSession(
        adminUser.id,
        true,
        'node-superagent/3.8.3',
        '::ffff:127.0.0.1'
      );

      const mutation = `
        mutation DeleteUser($id: ID!) {
          deleteUser(id: $id)
        }
      `;

      // Admin should be able to delete any user
      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Session-Token', adminSession.sessionToken)
        .set('User-Agent', 'node-superagent/3.8.3')
        .send({
          query: mutation,
          variables: { id: createdUserId }, // Delete different user
        });

      expect(response.status).toBe(200);
      expect(response.body.data.deleteUser).toBe(true);

      // Verify user was actually deleted
      const deletedUser = await User.findById(createdUserId);
      expect(deletedUser).toBeNull();

      // Cleanup admin user
      await User.findByIdAndDelete(adminUser.id);
    });
  });

  describe('Integration: Full User Lifecycle', () => {
    it('should create, read, update, and delete a user', async () => {
      // 1. Create user - without allowedScopes to use defaults
      const createMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            name
            email
            allowedScopes
          }
        }
      `;

      const createResponse = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: createMutation,
          variables: {
            input: {
              name: 'Lifecycle Test User',
              email: 'lifecycle@example.com',
              handle: 'lifecycle_test',
            },
          },
        });

      expect(createResponse.status).toBe(200);
      const userId = createResponse.body.data.createUser.id;

      // Create session for the user so they can update/delete their own profile
      const session = await SessionService.createSession(
        userId,
        true, // keepMeLoggedIn
        'node-superagent/3.8.3', // Match supertest User-Agent
        '::ffff:127.0.0.1'
      );
      const userSessionToken = session.sessionToken;

      // 2. Read user
      const readQuery = `
        query GetUser($id: ID!) {
          user(id: $id) {
            id
            name
            email
          }
        }
      `;

      const readResponse = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: readQuery,
          variables: { id: userId },
        });

      expect(readResponse.status).toBe(200);
      expect(readResponse.body.data.user.name).toBe('Lifecycle Test User');

      // 3. Update user - requires session authentication
      const updateMutation = `
        mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
          updateUser(id: $id, input: $input) {
            id
            name
            bio
          }
        }
      `;

      const updateResponse = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Session-Token', userSessionToken)
        .set('User-Agent', 'node-superagent/3.8.3')
        .send({
          query: updateMutation,
          variables: {
            id: userId,
            input: {
              name: 'Updated Lifecycle User',
              bio: 'Updated biography',
            },
          },
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.updateUser.name).toBe(
        'Updated Lifecycle User'
      );
      expect(updateResponse.body.data.updateUser.bio).toBe('Updated biography');

      // 4. Delete user - requires session authentication
      const deleteMutation = `
        mutation DeleteUser($id: ID!) {
          deleteUser(id: $id)
        }
      `;

      const deleteResponse = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Session-Token', userSessionToken)
        .set('User-Agent', 'node-superagent/3.8.3')
        .send({
          query: deleteMutation,
          variables: { id: userId },
        });

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.data.deleteUser).toBe(true);

      // 5. Verify deletion
      const verifyQuery = `
        query GetUser($id: ID!) {
          user(id: $id) {
            id
            name
          }
        }
      `;

      const verifyResponse = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: verifyQuery,
          variables: { id: userId },
        });

      expect(verifyResponse.status).toBe(404);
      expect(verifyResponse.body.errors[0].extensions.code).toBe('NOT_FOUND');
    });
  });
});
