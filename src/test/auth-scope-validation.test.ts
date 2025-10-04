import { Client, type IClient } from '../models/Client';
import {
  generateClientId,
  generateClientSecret,
  hashClientSecret,
} from '../services/jwt.service';

describe('Enhanced Scope Validation in Authentication', () => {
  let testClient: IClient;
  let clientSecret: string;

  beforeAll(async () => {
    // Create a test client with specific scopes
    const clientId = generateClientId();
    clientSecret = generateClientSecret();
    const hashedSecret = await hashClientSecret(clientSecret);

    // Store the plain text secret for use in tests

    testClient = new Client({
      clientId,
      clientSecret: hashedSecret,
      name: 'Scope Test Client',
      description: 'Client for testing scope validation',
      allowedScopes: ['read', 'write'], // Note: no 'admin' scope
      tokenExpiresIn: 3600,
    });

    await testClient.save();
  }, 30000);

  afterAll(async () => {
    await Client.deleteOne({ clientId: testClient.clientId });
  });

  describe('Scope validation in authenticate mutation', () => {
    test('should authenticate with valid subset of allowed scopes', async () => {
      const mutation = `
        mutation {
          authenticate(
            grant_type: "client_credentials"
            client_id: "${testClient.clientId}"
            client_secret: "${clientSecret}"
            scope: "read"
          ) {
            access_token
            scope
          }
        }
      `;

      const response = await global.testRequest
        .post('/graphql')
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.data.authenticate).toHaveProperty('access_token');
      expect(response.body.data.authenticate.scope).toBe('read');
    });

    test('should require scope parameter - GraphQL validation error', async () => {
      const mutation = `
        mutation {
          authenticate(
            grant_type: "client_credentials"
            client_id: "${testClient.clientId}"
            client_secret: "${clientSecret}"
          ) {
            access_token
            scope
          }
        }
      `;

      const response = await global.testRequest
        .post('/graphql')
        .send({ query: mutation });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].extensions.code).toBe(
        'GRAPHQL_VALIDATION_FAILED'
      );
      expect(response.body.errors[0].message).toContain('scope');
    });

    test('should reject invalid scope format', async () => {
      const mutation = `
        mutation {
          authenticate(
            grant_type: "client_credentials"
            client_id: "${testClient.clientId}"
            client_secret: "${clientSecret}"
            scope: "read-only"
          ) {
            access_token
            scope
          }
        }
      `;

      const response = await global.testRequest
        .post('/graphql')
        .send({ query: mutation });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].message).toContain(
        'Invalid scope format: "read-only"'
      );
    });

    test('should reject non-existent scopes', async () => {
      const mutation = `
        mutation {
          authenticate(
            grant_type: "client_credentials"
            client_id: "${testClient.clientId}"
            client_secret: "${clientSecret}"
            scope: "superuser"
          ) {
            access_token
            scope
          }
        }
      `;

      const response = await global.testRequest
        .post('/graphql')
        .send({ query: mutation });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].message).toContain(
        'Invalid scope: "superuser"'
      );
    });

    test('should reject scopes not allowed for client', async () => {
      const mutation = `
        mutation {
          authenticate(
            grant_type: "client_credentials"
            client_id: "${testClient.clientId}"
            client_secret: "${clientSecret}"
            scope: "admin"
          ) {
            access_token
            scope
          }
        }
      `;

      const response = await global.testRequest
        .post('/graphql')
        .send({ query: mutation });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].message).toContain(
        'Client not authorized for scopes: admin'
      );
    });

    test('should handle multiple scopes with validation', async () => {
      const mutation = `
        mutation {
          authenticate(
            grant_type: "client_credentials"
            client_id: "${testClient.clientId}"
            client_secret: "${clientSecret}"
            scope: "read write"
          ) {
            access_token
            scope
          }
        }
      `;

      const response = await global.testRequest
        .post('/graphql')
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.data.authenticate).toHaveProperty('access_token');
      expect(response.body.data.authenticate.scope).toBe('read write');
    });

    test('should handle mixed valid and invalid scopes', async () => {
      const mutation = `
        mutation {
          authenticate(
            grant_type: "client_credentials"
            client_id: "${testClient.clientId}"
            client_secret: "${clientSecret}"
            scope: "read admin"
          ) {
            access_token
            scope
          }
        }
      `;

      const response = await global.testRequest
        .post('/graphql')
        .send({ query: mutation });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].message).toContain(
        'Client not authorized for scopes: admin'
      );
    });
  });
});
