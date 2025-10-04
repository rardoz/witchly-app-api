import { Client } from '../models/Client';
import {
  generateAccessToken,
  generateClientId,
  generateClientSecret,
  hashClientSecret,
} from '../services/jwt.service';

describe('JWT Client Credentials Authentication', () => {
  const testClient = {
    clientId: '',
    clientSecret: '',
    hashedSecret: '',
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
      description: 'Test client for authentication',
      allowedScopes: ['read', 'write', 'admin'],
      tokenExpiresIn: 3600,
    });
    await client.save();
  }, 30000);

  describe('POST /oauth/token', () => {
    it('should return access token for valid client credentials', async () => {
      const response = await testRequest.post('/oauth/token').send({
        grant_type: 'client_credentials',
        client_id: testClient.clientId,
        client_secret: testClient.clientSecret,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('token_type', 'Bearer');
      expect(response.body).toHaveProperty('expires_in', 3600);
      expect(response.body).toHaveProperty('scope', 'read write admin');
    });

    it('should return error for missing fields', async () => {
      const response = await testRequest.post('/oauth/token').send({
        grant_type: 'client_credentials',
        client_id: testClient.clientId,
        // missing client_secret
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'invalid_request');
    });

    it('should return error for invalid grant type', async () => {
      const response = await testRequest.post('/oauth/token').send({
        grant_type: 'authorization_code',
        client_id: testClient.clientId,
        client_secret: testClient.clientSecret,
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'unsupported_grant_type');
    });

    it('should return error for invalid client_id', async () => {
      const response = await testRequest.post('/oauth/token').send({
        grant_type: 'client_credentials',
        client_id: 'invalid_client_id',
        client_secret: testClient.clientSecret,
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'invalid_client');
    });

    it('should return error for invalid client_secret', async () => {
      const response = await testRequest.post('/oauth/token').send({
        grant_type: 'client_credentials',
        client_id: testClient.clientId,
        client_secret: 'invalid_secret',
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'invalid_client');
    });

    it('should respect requested scopes', async () => {
      const response = await testRequest.post('/oauth/token').send({
        grant_type: 'client_credentials',
        client_id: testClient.clientId,
        client_secret: testClient.clientSecret,
        scope: 'read',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('scope', 'read');
    });

    it('should reject invalid scopes', async () => {
      const response = await testRequest.post('/oauth/token').send({
        grant_type: 'client_credentials',
        client_id: testClient.clientId,
        client_secret: testClient.clientSecret,
        scope: 'invalid_scope',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'invalid_scope');
    });
  });

  describe('GraphQL with JWT Authentication', () => {
    let accessToken: string;

    beforeAll(async () => {
      // Get access token for GraphQL tests
      const response = await testRequest.post('/oauth/token').send({
        grant_type: 'client_credentials',
        client_id: testClient.clientId,
        client_secret: testClient.clientSecret,
        scope: 'read write admin',
      });

      accessToken = response.body.access_token;
    }, 10000);

    it('should allow access with valid token', async () => {
      const query = `
        query {
          users {
            id
            name
            email
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('should work without token for public queries', async () => {
      const query = `
        query {
          users {
            id
            name
            email
          }
        }
      `;

      const response = await testRequest.post('/graphql').send({ query });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('should reject invalid token', async () => {
      const query = `
        query {
          clients {
            id
            name
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', 'Bearer invalid_token')
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].message).toContain('Unauthorized');
    });

    it('should allow admin operations with admin scope', async () => {
      const mutation = `
        mutation {
          createClient(input: {
            name: "Test Client 2"
            description: "Another test client"
            allowedScopes: ["read"]
          }) {
            clientId
            clientSecret
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.createClient).toHaveProperty('clientId');
      expect(response.body.data.createClient).toHaveProperty('clientSecret');

      // Clean up
      if (response.body.data?.createClient?.clientId) {
        await Client.deleteOne({
          clientId: response.body.data.createClient.clientId,
        });
      }
    });
  });

  describe('JWT Service', () => {
    it('should generate valid client credentials', () => {
      const clientId = generateClientId();
      const clientSecret = generateClientSecret();

      expect(clientId).toMatch(/^client_[a-f0-9]{32}$/);
      expect(clientSecret).toHaveLength(64);
      expect(clientSecret).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate and verify JWT tokens', () => {
      const token = generateAccessToken('test_client', ['read'], 3600);

      expect(token).toHaveProperty('access_token');
      expect(token).toHaveProperty('token_type', 'Bearer');
      expect(token).toHaveProperty('expires_in', 3600);
      expect(token).toHaveProperty('scope', 'read');
    });

    it('should hash and verify client secrets', async () => {
      const secret = 'test_secret';
      const hash = await hashClientSecret(secret);

      expect(hash).not.toBe(secret);
      expect(hash).toHaveLength(60); // bcrypt hash length
    });
  });
});
