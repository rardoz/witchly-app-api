import { Types } from 'mongoose';
import { Client } from '../models/Client';
import { User } from '../models/User';
import {
  generateClientId,
  generateClientSecret,
  hashClientSecret,
} from '../services/jwt.service';

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
    userType: 'user',
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
        { name: 'User 1', email: 'user1@test.com', userType: 'user' },
        { name: 'User 2', email: 'user2@test.com', userType: 'admin' },
        { name: 'User 3', email: 'user3@test.com', userType: 'user' },
      ]);
    });

    it('should return list of users with authentication', async () => {
      const query = `
        query {
          users {
            id
            name
            email
            userType
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
      expect(response.body.data.users[0]).toHaveProperty('userType');
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
        userType: 'user',
        bio: 'Test biography',
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
            userType
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
            userType
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
      expect(response.body.data.createUser).toHaveProperty(
        'userType',
        testUser.userType
      );
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
        userType: 'user',
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
              userType: 'user',
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
  });

  describe('Mutation: updateUser', () => {
    let createdUserId: string;

    beforeEach(async () => {
      const user = await User.create({
        name: 'Original Name',
        email: 'original@example.com',
        userType: 'user',
        bio: 'Original bio',
      });
      createdUserId = user.id;
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

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
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

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
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

      const response = await testRequest.post('/graphql').send({
        query: mutation,
        variables: {
          id: createdUserId,
          input: { name: 'Updated Name' },
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Mutation: deleteUser', () => {
    let createdUserId: string;

    beforeEach(async () => {
      const user = await User.create({
        name: 'To Be Deleted',
        email: 'delete@example.com',
        userType: 'user',
      });
      createdUserId = user.id;
    });

    it('should delete user successfully', async () => {
      const mutation = `
        mutation DeleteUser($id: ID!) {
          deleteUser(id: $id)
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: mutation,
          variables: { id: createdUserId },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.deleteUser).toBe(true);

      // Verify user was actually deleted
      const deletedUser = await User.findById(createdUserId);
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
  });

  describe('Integration: Full User Lifecycle', () => {
    it('should create, read, update, and delete a user', async () => {
      // 1. Create user
      const createMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            name
            email
            userType
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
              userType: 'user',
            },
          },
        });

      expect(createResponse.status).toBe(200);
      const userId = createResponse.body.data.createUser.id;

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

      // 3. Update user
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

      // 4. Delete user
      const deleteMutation = `
        mutation DeleteUser($id: ID!) {
          deleteUser(id: $id)
        }
      `;

      const deleteResponse = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
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
