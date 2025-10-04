import { Client } from '../models/Client';
import {
  generateClientId,
  generateClientSecret,
  hashClientSecret,
} from '../services/jwt.service';

describe('ClientResolver GraphQL Endpoints', () => {
  let adminAccessToken: string;
  let userAccessToken: string;

  const adminTestClient = {
    clientId: '',
    clientSecret: '',
    hashedSecret: '',
  };

  const userTestClient = {
    clientId: '',
    clientSecret: '',
    hashedSecret: '',
  };

  beforeAll(async () => {
    // Generate admin test client credentials
    adminTestClient.clientId = generateClientId();
    adminTestClient.clientSecret = generateClientSecret();
    adminTestClient.hashedSecret = await hashClientSecret(
      adminTestClient.clientSecret
    );

    // Create admin client in database
    const adminClient = new Client({
      clientId: adminTestClient.clientId,
      clientSecret: adminTestClient.hashedSecret,
      name: 'Admin Test Client',
      description: 'Admin client for client resolver tests',
      allowedScopes: ['read', 'write', 'admin'],
      tokenExpiresIn: 3600,
    });
    await adminClient.save();

    // Generate user test client credentials
    userTestClient.clientId = generateClientId();
    userTestClient.clientSecret = generateClientSecret();
    userTestClient.hashedSecret = await hashClientSecret(
      userTestClient.clientSecret
    );

    // Create user client in database
    const userClient = new Client({
      clientId: userTestClient.clientId,
      clientSecret: userTestClient.hashedSecret,
      name: 'User Test Client',
      description: 'User client for client resolver tests',
      allowedScopes: ['read', 'write'],
      tokenExpiresIn: 3600,
    });
    await userClient.save();

    // Get admin access token
    const adminTokenResponse = await testRequest.post('/oauth/token').send({
      grant_type: 'client_credentials',
      client_id: adminTestClient.clientId,
      client_secret: adminTestClient.clientSecret,
    });
    adminAccessToken = adminTokenResponse.body.access_token;

    // Get user access token
    const userTokenResponse = await testRequest.post('/oauth/token').send({
      grant_type: 'client_credentials',
      client_id: userTestClient.clientId,
      client_secret: userTestClient.clientSecret,
    });
    userAccessToken = userTokenResponse.body.access_token;
  }, 30000);

  afterAll(async () => {
    // Clean up test data
    await Client.deleteMany({
      $or: [
        { clientId: adminTestClient.clientId },
        { clientId: userTestClient.clientId },
        { name: { $regex: /test|example/i } },
      ],
    });
  });

  afterEach(async () => {
    // Clean up any clients created during tests (except the main test clients)
    await Client.deleteMany({
      clientId: {
        $nin: [adminTestClient.clientId, userTestClient.clientId],
      },
      name: { $regex: /test|example/i },
    });
  });

  describe('Query: clients', () => {
    beforeEach(async () => {
      // Create some test clients for listing
      await Client.create([
        {
          clientId: 'test-client-1',
          clientSecret: await hashClientSecret('secret1'),
          name: 'Test Client 1',
          allowedScopes: ['read'],
          tokenExpiresIn: 3600,
        },
        {
          clientId: 'test-client-2',
          clientSecret: await hashClientSecret('secret2'),
          name: 'Test Client 2',
          allowedScopes: ['read', 'write'],
          tokenExpiresIn: 7200,
        },
      ]);
    });

    it('should return list of clients with admin authentication', async () => {
      const query = `
        query {
          clients {
            id
            clientId
            name
            description
            isActive
            allowedScopes
            tokenExpiresIn
            createdAt
            updatedAt
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.clients).toBeInstanceOf(Array);
      expect(response.body.data.clients.length).toBeGreaterThanOrEqual(2);
      expect(response.body.data.clients[0]).toHaveProperty('clientId');
      expect(response.body.data.clients[0]).toHaveProperty('name');
      expect(response.body.data.clients[0]).toHaveProperty('allowedScopes');
    });

    it('should return 401 for non-admin users', async () => {
      const query = `
        query {
          clients {
            id
            clientId
            name
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({ query });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 without authentication', async () => {
      const query = `
        query {
          clients {
            id
            clientId
            name
          }
        }
      `;

      const response = await testRequest.post('/graphql').send({ query });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Query: client', () => {
    it('should return client by clientId for admin', async () => {
      const query = `
        query GetClient($clientId: String!) {
          client(clientId: $clientId) {
            id
            clientId
            name
            description
            isActive
            allowedScopes
            tokenExpiresIn
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          query,
          variables: { clientId: userTestClient.clientId },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.client).toHaveProperty(
        'clientId',
        userTestClient.clientId
      );
      expect(response.body.data.client).toHaveProperty(
        'name',
        'User Test Client'
      );
    });

    it('should allow client to view own info', async () => {
      const query = `
        query GetClient($clientId: String!) {
          client(clientId: $clientId) {
            id
            clientId
            name
            description
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          query,
          variables: { clientId: userTestClient.clientId },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.client).toHaveProperty(
        'clientId',
        userTestClient.clientId
      );
      expect(response.body.data.client).toHaveProperty(
        'name',
        'User Test Client'
      );
    });

    it('should return 401 for non-admin viewing other clients', async () => {
      const query = `
        query GetClient($clientId: String!) {
          client(clientId: $clientId) {
            id
            clientId
            name
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          query,
          variables: { clientId: adminTestClient.clientId },
        });

      expect(response.status).toBe(403);
      expect(response.body.errors[0].extensions.code).toBe('FORBIDDEN');
    });

    it('should return null for non-existent client', async () => {
      const query = `
        query GetClient($clientId: String!) {
          client(clientId: $clientId) {
            id
            clientId
            name
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          query,
          variables: { clientId: 'non-existent-client' },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.client).toBeNull();
    });
  });

  describe('Mutation: createClient', () => {
    it('should create client with valid input', async () => {
      const mutation = `
        mutation CreateClient($input: CreateClientInput!) {
          createClient(input: $input) {
            clientId
            clientSecret
          }
        }
      `;

      const input = {
        name: 'New Test Client',
        description: 'Created via test',
        allowedScopes: ['read', 'write'],
        tokenExpiresIn: 7200,
      };

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          query: mutation,
          variables: { input },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.createClient).toHaveProperty('clientId');
      expect(response.body.data.createClient).toHaveProperty('clientSecret');
      expect(response.body.data.createClient.clientId).toMatch(
        /^[A-Za-z0-9_-]+$/
      );
      expect(response.body.data.createClient.clientSecret).toMatch(
        /^[A-Za-z0-9_-]+$/
      );

      // Verify client was created in database
      const createdClient = await Client.findOne({
        clientId: response.body.data.createClient.clientId,
      });
      expect(createdClient).toBeTruthy();
      expect(createdClient?.name).toBe(input.name);
      expect(createdClient?.allowedScopes).toEqual(input.allowedScopes);
    });

    it('should create client with default values', async () => {
      const mutation = `
        mutation CreateClient($input: CreateClientInput!) {
          createClient(input: $input) {
            clientId
            clientSecret
          }
        }
      `;

      const input = {
        name: 'Minimal Test Client',
      };

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          query: mutation,
          variables: { input },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.createClient).toHaveProperty('clientId');
      expect(response.body.data.createClient).toHaveProperty('clientSecret');

      // Verify defaults were applied
      const createdClient = await Client.findOne({
        clientId: response.body.data.createClient.clientId,
      });
      expect(createdClient?.allowedScopes).toEqual(['read']);
      expect(createdClient?.tokenExpiresIn).toBe(3600);
    });

    it('should return 401 for non-admin users', async () => {
      const mutation = `
        mutation CreateClient($input: CreateClientInput!) {
          createClient(input: $input) {
            clientId
            clientSecret
          }
        }
      `;

      const input = {
        name: 'Unauthorized Client',
      };

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          query: mutation,
          variables: { input },
        });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].message).toContain(
        'Admin access required'
      );
    });
  });

  describe('Mutation: updateClient', () => {
    let updateTestClientId: string;

    beforeEach(async () => {
      // Create a client to update with unique ID
      const uniqueId = `update-test-client-${Date.now()}`;
      const client = await Client.create({
        clientId: uniqueId,
        clientSecret: await hashClientSecret('secret'),
        name: 'Original Name',
        description: 'Original description',
        allowedScopes: ['read'],
        tokenExpiresIn: 3600,
      });
      updateTestClientId = client.clientId;
    });

    afterEach(async () => {
      // Clean up created client
      await Client.deleteOne({ clientId: updateTestClientId });
    });

    it('should update client with valid input', async () => {
      const mutation = `
        mutation UpdateClient($clientId: String!, $input: UpdateClientInput!) {
          updateClient(clientId: $clientId, input: $input) {
            id
            clientId
            name
            description
            allowedScopes
            tokenExpiresIn
            isActive
          }
        }
      `;

      const input = {
        name: 'Updated Name',
        description: 'Updated description',
        allowedScopes: ['read', 'write'],
        tokenExpiresIn: 7200,
        isActive: false,
      };

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          query: mutation,
          variables: { clientId: updateTestClientId, input },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.updateClient).toHaveProperty(
        'name',
        'Updated Name'
      );
      expect(response.body.data.updateClient).toHaveProperty(
        'description',
        'Updated description'
      );
      expect(response.body.data.updateClient).toHaveProperty('allowedScopes', [
        'read',
        'write',
      ]);
      expect(response.body.data.updateClient).toHaveProperty(
        'tokenExpiresIn',
        7200
      );
      expect(response.body.data.updateClient).toHaveProperty('isActive', false);
    });

    it('should return error for non-existent client', async () => {
      const mutation = `
        mutation UpdateClient($clientId: String!, $input: UpdateClientInput!) {
          updateClient(clientId: $clientId, input: $input) {
            id
            name
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          query: mutation,
          variables: {
            clientId: 'non-existent-client',
            input: { name: 'Updated Name' },
          },
        });

      expect(response.status).toBe(404);
      expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');
    });

    it('should return 401 for non-admin users', async () => {
      const mutation = `
        mutation UpdateClient($clientId: String!, $input: UpdateClientInput!) {
          updateClient(clientId: $clientId, input: $input) {
            id
            name
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          query: mutation,
          variables: {
            clientId: updateTestClientId,
            input: { name: 'Updated Name' },
          },
        });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].message).toContain(
        'Admin access required'
      );
    });
  });

  describe('Mutation: deleteClient', () => {
    let deleteTestClientId: string;

    beforeEach(async () => {
      // Create a client to delete with unique ID
      const uniqueId = `delete-test-client-${Date.now()}`;
      const client = await Client.create({
        clientId: uniqueId,
        clientSecret: await hashClientSecret('secret'),
        name: 'To Be Deleted',
        allowedScopes: ['read'],
        tokenExpiresIn: 3600,
      });
      deleteTestClientId = client.clientId;
    });

    afterEach(async () => {
      // Clean up created client (if it still exists)
      await Client.deleteOne({ clientId: deleteTestClientId });
    });

    it('should delete client successfully', async () => {
      const mutation = `
        mutation DeleteClient($clientId: String!) {
          deleteClient(clientId: $clientId)
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          query: mutation,
          variables: { clientId: deleteTestClientId },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.deleteClient).toBe(true);

      // Verify client was actually deleted
      const deletedClient = await Client.findOne({
        clientId: deleteTestClientId,
      });
      expect(deletedClient).toBeNull();
    });

    it('should return false for non-existent client', async () => {
      const mutation = `
        mutation DeleteClient($clientId: String!) {
          deleteClient(clientId: $clientId)
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          query: mutation,
          variables: { clientId: 'non-existent-client' },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.deleteClient).toBe(false);
    });

    it('should return 401 for non-admin users', async () => {
      const mutation = `
        mutation DeleteClient($clientId: String!) {
          deleteClient(clientId: $clientId)
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          query: mutation,
          variables: { clientId: deleteTestClientId },
        });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].message).toContain(
        'Admin access required'
      );
    });
  });

  describe('Mutation: regenerateClientSecret', () => {
    let regenTestClientId: string;
    let originalSecret: string;

    beforeEach(async () => {
      // Create a client for secret regeneration with unique ID
      originalSecret = generateClientSecret();
      const uniqueId = `regen-test-client-${Date.now()}`;
      const client = await Client.create({
        clientId: uniqueId,
        clientSecret: await hashClientSecret(originalSecret),
        name: 'Secret Regen Test',
        allowedScopes: ['read'],
        tokenExpiresIn: 3600,
      });
      regenTestClientId = client.clientId;
    });

    afterEach(async () => {
      // Clean up created client
      await Client.deleteOne({ clientId: regenTestClientId });
    });

    it('should regenerate client secret successfully', async () => {
      const mutation = `
        mutation RegenerateClientSecret($clientId: String!) {
          regenerateClientSecret(clientId: $clientId)
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          query: mutation,
          variables: { clientId: regenTestClientId },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.regenerateClientSecret).toMatch(
        /^[A-Za-z0-9_-]+$/
      );
      expect(response.body.data.regenerateClientSecret).not.toBe(
        originalSecret
      );

      // Verify the secret was actually changed in the database
      const updatedClient = await Client.findOne({
        clientId: regenTestClientId,
      });
      expect(updatedClient?.clientSecret).not.toBe(
        await hashClientSecret(originalSecret)
      );
    });

    it('should return error for non-existent client', async () => {
      const mutation = `
        mutation RegenerateClientSecret($clientId: String!) {
          regenerateClientSecret(clientId: $clientId)
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          query: mutation,
          variables: { clientId: 'non-existent-client' },
        });

      expect(response.status).toBe(404);
      expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');
    });

    it('should return 401 for non-admin users', async () => {
      const mutation = `
        mutation RegenerateClientSecret($clientId: String!) {
          regenerateClientSecret(clientId: $clientId)
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          query: mutation,
          variables: { clientId: regenTestClientId },
        });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].message).toContain(
        'Admin access required'
      );
    });
  });

  describe('Integration: Full Client Management Lifecycle', () => {
    it('should create, read, update, regenerate secret, and delete a client', async () => {
      // 1. Create client
      const createMutation = `
        mutation CreateClient($input: CreateClientInput!) {
          createClient(input: $input) {
            clientId
            clientSecret
          }
        }
      `;

      const createResponse = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          query: createMutation,
          variables: {
            input: {
              name: 'Lifecycle Test Client',
              description: 'Full lifecycle test',
              allowedScopes: ['read'],
              tokenExpiresIn: 3600,
            },
          },
        });

      expect(createResponse.status).toBe(200);
      const clientId = createResponse.body.data.createClient.clientId;
      const originalSecret = createResponse.body.data.createClient.clientSecret;

      // 2. Read client
      const readQuery = `
        query GetClient($clientId: String!) {
          client(clientId: $clientId) {
            id
            clientId
            name
            description
            allowedScopes
          }
        }
      `;

      const readResponse = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          query: readQuery,
          variables: { clientId },
        });

      expect(readResponse.status).toBe(200);
      expect(readResponse.body.data.client.name).toBe('Lifecycle Test Client');

      // 3. Update client
      const updateMutation = `
        mutation UpdateClient($clientId: String!, $input: UpdateClientInput!) {
          updateClient(clientId: $clientId, input: $input) {
            name
            description
            allowedScopes
          }
        }
      `;

      const updateResponse = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          query: updateMutation,
          variables: {
            clientId,
            input: {
              name: 'Updated Lifecycle Client',
              description: 'Updated description',
              allowedScopes: ['read', 'write'],
            },
          },
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.updateClient.name).toBe(
        'Updated Lifecycle Client'
      );
      expect(updateResponse.body.data.updateClient.allowedScopes).toEqual([
        'read',
        'write',
      ]);

      // 4. Regenerate secret
      const regenMutation = `
        mutation RegenerateClientSecret($clientId: String!) {
          regenerateClientSecret(clientId: $clientId)
        }
      `;

      const regenResponse = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          query: regenMutation,
          variables: { clientId },
        });

      expect(regenResponse.status).toBe(200);
      expect(regenResponse.body.data.regenerateClientSecret).not.toBe(
        originalSecret
      );

      // 5. Delete client
      const deleteMutation = `
        mutation DeleteClient($clientId: String!) {
          deleteClient(clientId: $clientId)
        }
      `;

      const deleteResponse = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          query: deleteMutation,
          variables: { clientId },
        });

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.data.deleteClient).toBe(true);

      // 6. Verify deletion
      const verifyQuery = `
        query GetClient($clientId: String!) {
          client(clientId: $clientId) {
            id
            name
          }
        }
      `;

      const verifyResponse = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          query: verifyQuery,
          variables: { clientId },
        });

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.data.client).toBeNull();
    });
  });
});
