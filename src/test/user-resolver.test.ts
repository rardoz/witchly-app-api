import { Types } from 'mongoose';
import { IUser, User } from '../models/User';
import { SessionService } from '../services/session.service';

describe('UserResolver GraphQL Endpoints', () => {
  const testUser = {
    name: 'User 1',
    email: 'user1.user-resolver@example.com',
    allowedScopes: ['read', 'write', 'admin'],
    handle: 'user_1',
  };

  let userId: string;
  beforeAll(async () => {
    // Create some test users
    const users = (await User.create([
      testUser,
      {
        name: 'User 2',
        email: 'user2.user-resolver@example.com',
        allowedScopes: ['read', 'write', 'admin'],
        handle: 'user_2',
      },
      {
        name: 'User 3',
        email: 'user3.user-resolver@example.com',
        allowedScopes: ['read', 'write', 'admin'],
        handle: 'user_3',
      },
    ])) as IUser[];

    userId = (users?.[0]?._id as Types.ObjectId).toString();
  });

  describe('Query: users', () => {
    it('should return list of users with authentication when admin', async () => {
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

      const response = await global
        .adminUserAdminAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.users.length).toBeGreaterThanOrEqual(4);
      expect(response.body.data.users[0]).toHaveProperty('id');
      expect(response.body.data.users[0]).toHaveProperty('name');
      expect(response.body.data.users[0]).toHaveProperty('email');
      expect(response.body.data.users[0]).toHaveProperty('allowedScopes');
    });

    it('should return paginated users with limit and offset when basic', async () => {
      const query = `
        query GetUsers($limit: Float, $offset: Float) {
          users(limit: $limit, offset: $offset) {
            id
            name
            email
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
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

      const response = await global.adminUserAdminAppTestRequest().send({
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

      const response = await global.adminUserAdminAppTestRequest().send({
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
    it('should return user by ID with authentication when basic', async () => {
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

      const response = await global.basicUserBasicAppTestRequest().send({
        query,
        variables: { id: userId },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.user).toHaveProperty('id', userId);
      expect(response.body.data.user).toHaveProperty('name', testUser.name);
      expect(response.body.data.user).toHaveProperty('email', testUser.email);
    });

    it('should return 404 for non-existent user when basic', async () => {
      const nonExistentId = new Types.ObjectId().toString();
      const query = `
        query GetUser($id: ID!) {
          user(id: $id) {
            id
            name
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
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
        variables: { id: userId },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Mutation: createUser', () => {
    it('should create user with valid input', async () => {
      const createTestUser = {
        name: 'Test User for Create Function',
        email: 'testcreate.user-resolver@example.com',
        handle: 'test_create_user',
        bio: 'This is a test user for create function',
        allowedScopes: ['read', 'write', 'admin'],
      };

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

      const response = await adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: createTestUser,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.createUser).toHaveProperty('id');
      expect(response.body.data.createUser).toHaveProperty(
        'name',
        createTestUser.name
      );
      expect(response.body.data.createUser).toHaveProperty(
        'email',
        createTestUser.email
      );
      expect(response.body.data.createUser).toHaveProperty('allowedScopes', [
        'read',
        'write',
        'admin',
      ]);
      expect(response.body.data.createUser).toHaveProperty(
        'bio',
        createTestUser.bio
      );
      expect(response.body.data.createUser).toHaveProperty(
        'handle',
        createTestUser.handle
      );
    });

    it('should return 409 conflict for duplicate email', async () => {
      const mutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            name
            email
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: testUser,
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

    it('should return 401 for basic authentication', async () => {
      const mutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            name
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: testUser,
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });

    it('should prevent non-admin from creating user with admin app permissions', async () => {
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
      const response = await global.basicUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            name: 'Test Admin User',
            email: 'testadmin.user-resolver@example.com',
            handle: 'test_admin_user',
            allowedScopes: ['read', 'write', 'admin'], // Trying to set custom scopes
          },
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
      expect(response.body.errors[0].message).toBe(
        'Admin session access required'
      );
    });
  });

  describe('Mutation: updateUser', () => {
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
        bio: 'Updated bio',
      };

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          id: userId,
          input: updateData,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.updateUser).toHaveProperty('id', userId);
      expect(response.body.data.updateUser).toHaveProperty(
        'name',
        testUser.name
      );
      expect(response.body.data.updateUser).toHaveProperty(
        'bio',
        'Updated bio'
      );
      expect(response.body.data.updateUser).toHaveProperty(
        'handle',
        testUser.handle
      );
      expect(response.body.data.updateUser).toHaveProperty(
        'email',
        testUser.email
      );
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

      const response = await global.adminUserAdminAppTestRequest().send({
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
          id: userId,
          input: { bio: 'Updated bio' },
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });

    it('should prevent non-admin from updating user allowedScopes', async () => {
      const mutation = `
        mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
          updateUser(id: $id, input: $input) {
            id
            allowedScopes
          }
        }
      `;

      // Try to update another user's allowedScopes using session of regular user (no admin scope)
      const responseBasicApp = await basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          id: userId,
          input: {
            allowedScopes: ['read', 'write', 'basic'], // Trying to change privileges
          },
        },
      });

      expect(responseBasicApp.status).toBe(401);
      expect(responseBasicApp.body.errors[0].extensions.code).toBe(
        'UNAUTHORIZED'
      );
      expect(responseBasicApp.body.errors[0].message).toBe(
        'Admin session access required'
      );

      const responseAdminApp = await basicUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          id: userId,
          input: {
            allowedScopes: ['read', 'write', 'basic'], // Trying to change privileges
          },
        },
      });

      expect(responseAdminApp.status).toBe(401);
      expect(responseAdminApp.body.errors[0].extensions.code).toBe(
        'UNAUTHORIZED'
      );
      expect(responseAdminApp.body.errors[0].message).toBe(
        'Admin session access required'
      );
    });

    it('should allow basic user to update their own profile without allowedScopes', async () => {
      // Create session for the basic user

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
      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          id: global.basicUserId, // Updating their own account
          input: {
            bio: 'Updated bio for basic user',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.updateUser).toHaveProperty(
        'id',
        global.basicUserId
      );

      expect(response.body.data.updateUser).toHaveProperty(
        'bio',
        'Updated bio for basic user'
      );
    });
  });

  describe('Mutation: deleteUser', () => {
    const testUserForDelete = {
      name: 'To Be Deleted',
      email: 'delete.user-resolver@example.com',
      allowedScopes: ['read', 'write', 'admin'],
      handle: 'to_be_deleted',
      emailVerified: true,
    };

    const mutation = `
        mutation DeleteUser($id: ID!) {
          deleteUser(id: $id)
        }
      `;

    it('should delete user successfully', async () => {
      // Create a specific user for this test with basic scopes
      const testUserForDeleteRecord = await User.create(testUserForDelete);

      // User deletes their own account
      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: { id: testUserForDeleteRecord.id },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.deleteUser).toBe(true);

      // Verify user was actually deleted
      const deletedUser = await User.findById(testUserForDeleteRecord.id);
      expect(deletedUser).toBeNull();
    });

    it('should return 404 for non-existent user', async () => {
      const nonExistentId = new Types.ObjectId().toString();
      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: { id: nonExistentId },
      });

      expect(response.status).toBe(404);
      expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');
      expect(response.body.errors[0].message).toBe('User not found');
    });

    it('should return 401 without authentication', async () => {
      const response = await testRequest.post('/graphql').send({
        query: mutation,
        variables: { id: userId },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });

    it('should prevent user from deleting another user account', async () => {
      // Try to delete the first user using another user's session
      const basicAppResponse = await global
        .basicUserBasicAppTestRequest()
        .send({
          query: mutation,
          variables: { id: userId }, // Try to delete different user
        });

      expect(basicAppResponse.status).toBe(401);
      expect(basicAppResponse.body.errors[0].extensions.code).toBe(
        'UNAUTHORIZED'
      );
      expect(basicAppResponse.body.errors[0].message).toBe(
        'Users can only delete their own accounts'
      );
      const adminAppResponse = await global
        .basicUserAdminAppTestRequest()
        .send({
          query: mutation,
          variables: { id: userId }, // Try to delete different user
        });

      expect(adminAppResponse.status).toBe(401);
      expect(adminAppResponse.body.errors[0].extensions.code).toBe(
        'UNAUTHORIZED'
      );
      expect(adminAppResponse.body.errors[0].message).toBe(
        'Users can only delete their own accounts'
      );
    });

    it('should allow admin user to delete any user account', async () => {
      // Create an admin user
      const testUserForDeleteRecord = await User.create(testUserForDelete);

      const mutation = `
        mutation DeleteUser($id: ID!) {
          deleteUser(id: $id)
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: { id: testUserForDeleteRecord.id },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.deleteUser).toBe(true);
    });
  });

  describe('Integration: Full User Lifecycle', () => {
    const testUserForLifecycle = {
      name: 'Test User lifecycle',
      email: 'lifecycle.user-resolver@example.com',
      allowedScopes: ['read', 'write', 'admin'],
      handle: 'test_user_for_lifecycle',
      emailVerified: true,
    };
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

      const createResponse = await global.adminUserAdminAppTestRequest().send({
        query: createMutation,
        variables: {
          input: testUserForLifecycle,
        },
      });

      expect(createResponse.status).toBe(200);
      const testUserForLifecycleUserData = createResponse.body.data.createUser;

      // Create session for the user so they can update/delete their own profile
      const session = await SessionService.createSession(
        testUserForLifecycleUserData.id,
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
        .set('Authorization', `Bearer ${global.adminAccessToken}`)
        .set('User-Agent', 'node-superagent/3.8.3')
        .set('X-Session-Token', userSessionToken)
        .send({
          query: readQuery,
          variables: { id: testUserForLifecycleUserData.id },
        });

      expect(readResponse.status).toBe(200);
      expect(readResponse.body.data.user.name).toBe(testUserForLifecycle.name);
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
        .set('Authorization', `Bearer ${global.adminAccessToken}`)
        .set('X-Session-Token', userSessionToken)
        .set('User-Agent', 'node-superagent/3.8.3')
        .send({
          query: updateMutation,
          variables: {
            id: testUserForLifecycleUserData.id,
            input: {
              bio: 'Updated biography',
            },
          },
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.updateUser.bio).toBe('Updated biography');

      // 4. Delete user - requires session authentication
      const deleteMutation = `
        mutation DeleteUser($id: ID!) {
          deleteUser(id: $id)
        }
      `;

      const deleteResponse = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${global.adminAccessToken}`)
        .set('X-Session-Token', userSessionToken)
        .set('User-Agent', 'node-superagent/3.8.3')
        .send({
          query: deleteMutation,
          variables: { id: testUserForLifecycleUserData.id },
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

      const verifyResponse = await adminUserAdminAppTestRequest().send({
        query: verifyQuery,
        variables: { id: testUserForLifecycleUserData.id },
      });

      expect(verifyResponse.status).toBe(404);
      expect(verifyResponse.body.errors[0].extensions.code).toBe('NOT_FOUND');
    });
  });
});
