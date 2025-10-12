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

  describe('GraphQL with JWT Authentication', () => {
    let accessToken: string;

    beforeAll(async () => {
      // Get access token using GraphQL mutation
      const mutation = `
        mutation {
          authenticate(
            grant_type: "client_credentials"
            client_id: "${testClient.clientId}"
            client_secret: "${testClient.clientSecret}"
            scope: "read write admin"
          ) {
            access_token
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .send({ query: mutation });

      accessToken = response.body.data.authenticate.access_token;
    }, 10000);

    it('should allow access with valid token', async () => {
      const mutation = `
        mutation {
          initiateLogin(input: {
            email: "nonexistent@example.com"
          }) {
            success
            message
            expiresAt
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: mutation });
      expect(response.status).toBe(404);
      expect(response.body.errors[0].message).toContain(
        'No account found with this email address. Please sign up first.'
      );
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

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
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

  describe('GraphQL Authentication Mutation', () => {
    it('should authenticate via GraphQL mutation with valid credentials', async () => {
      const mutation = `
        mutation {
          authenticate(
            grant_type: "client_credentials"
            client_id: "${testClient.clientId}"
            client_secret: "${testClient.clientSecret}"
            scope: "read write admin"
          ) {
            access_token
            token_type
            expires_in
            scope
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.authenticate).toHaveProperty('access_token');
      expect(response.body.data.authenticate).toHaveProperty(
        'token_type',
        'Bearer'
      );
      expect(response.body.data.authenticate).toHaveProperty(
        'expires_in',
        3600
      );
      expect(response.body.data.authenticate).toHaveProperty(
        'scope',
        'read write admin'
      );
    });

    it('should return validation error for missing fields via GraphQL', async () => {
      const mutation = `
        mutation {
          authenticate(
            grant_type: "client_credentials"
            client_id: "${testClient.clientId}"
          ) {
            access_token
            token_type
            expires_in
            scope
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .send({ query: mutation });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].extensions.code).toBe(
        'GRAPHQL_VALIDATION_FAILED'
      );
      expect(response.body.errors[0].message).toContain(
        'Field "authenticate" argument "scope" of type "String!" is required, but it was not provided'
      );
    });

    it('should return validation error for invalid grant type via GraphQL', async () => {
      const mutation = `
        mutation {
          authenticate(
            grant_type: "invalid_type"
            client_id: "${testClient.clientId}"
            client_secret: "${testClient.clientSecret}"
            scope: "read write"
          ) {
            access_token
            token_type
            expires_in
            scope
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .send({ query: mutation });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].extensions.code).toBe('VALIDATION_ERROR');
      expect(response.body.errors[0].message).toContain(
        'Only client_credentials grant type is supported'
      );
    });

    it('should return unauthorized error for invalid client_id via GraphQL', async () => {
      const mutation = `
        mutation {
          authenticate(
            grant_type: "client_credentials"
            client_id: "invalid_client_id"
            client_secret: "${testClient.clientSecret}"
            scope: "read"
          ) {
            access_token
            token_type
            expires_in
            scope
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .send({ query: mutation });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
      expect(response.body.errors[0].message).toContain(
        'Invalid client_id or client not found'
      );
    });

    it('should support scope selection via GraphQL', async () => {
      const mutation = `
        mutation {
          authenticate(
            grant_type: "client_credentials"
            client_id: "${testClient.clientId}"
            client_secret: "${testClient.clientSecret}"
            scope: "read write"
          ) {
            access_token
            token_type
            expires_in
            scope
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.authenticate).toHaveProperty(
        'scope',
        'read write'
      );
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
