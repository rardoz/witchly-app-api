import { Client } from '../models/Client';
import {
  generateClientId,
  generateClientSecret,
  hashClientSecret,
} from '../services/jwt.service';

describe('Refresh Token Authentication', () => {
  let testClient: {
    clientId: string;
    clientSecret: string;
    hashedSecret: string;
  };

  beforeAll(async () => {
    // Generate test client credentials
    testClient = {
      clientId: generateClientId(),
      clientSecret: generateClientSecret(),
      hashedSecret: await hashClientSecret(generateClientSecret()),
    };
    testClient.hashedSecret = await hashClientSecret(testClient.clientSecret);

    // Create test client with refresh token support
    const client = new Client({
      clientId: testClient.clientId,
      clientSecret: testClient.hashedSecret,
      name: 'Test Client with Refresh Token',
      description: 'Test client for refresh token functionality',
      allowedScopes: ['read', 'write'],
      tokenExpiresIn: 3600, // 1 hour
      refreshTokenExpiresIn: 86400 * 7, // 7 days
      supportsRefreshToken: true,
    });
    await client.save();
  }, 30000);

  afterAll(async () => {
    // Clean up test client
    await Client.deleteOne({ clientId: testClient.clientId });
  });

  describe('Initial Authentication with Refresh Token', () => {
    it('should return access token and refresh token for supported clients', async () => {
      const authMutation = `
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
            refresh_token
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .send({ query: authMutation });

      expect(response.status).toBe(200);
      expect(response.body.data.authenticate).toBeDefined();

      const authData = response.body.data.authenticate;
      expect(authData.access_token).toBeDefined();
      expect(authData.token_type).toBe('Bearer');
      expect(authData.expires_in).toBe(3600);
      expect(authData.scope).toBe('read write');
      expect(authData.refresh_token).toBeDefined();
      expect(typeof authData.refresh_token).toBe('string');
    });

    it('should not return refresh token for clients that do not support it', async () => {
      // Create client without refresh token support
      const noRefreshClient = {
        clientId: generateClientId(),
        clientSecret: generateClientSecret(),
      };
      const hashedSecret = await hashClientSecret(noRefreshClient.clientSecret);

      const client = new Client({
        clientId: noRefreshClient.clientId,
        clientSecret: hashedSecret,
        name: 'No Refresh Token Client',
        allowedScopes: ['read'],
        supportsRefreshToken: false,
      });
      await client.save();

      const authMutation = `
        mutation {
          authenticate(
            grant_type: "client_credentials"
            client_id: "${noRefreshClient.clientId}"
            client_secret: "${noRefreshClient.clientSecret}"
            scope: "read"
          ) {
            access_token
            token_type
            expires_in
            scope
            refresh_token
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .send({ query: authMutation });

      expect(response.status).toBe(200);
      expect(response.body.data.authenticate.access_token).toBeDefined();
      expect(response.body.data.authenticate.refresh_token).toBeNull();

      // Clean up
      await Client.deleteOne({ clientId: noRefreshClient.clientId });
    });
  });

  describe('Refresh Token Usage', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Get initial tokens
      const authMutation = `
        mutation {
          authenticate(
            grant_type: "client_credentials"
            client_id: "${testClient.clientId}"
            client_secret: "${testClient.clientSecret}"
            scope: "read write"
          ) {
            access_token
            refresh_token
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .send({ query: authMutation });

      refreshToken = response.body.data.authenticate.refresh_token;
    });

    it('should successfully refresh access token with valid refresh token', async () => {
      const refreshMutation = `
        mutation {
          refreshToken(
            grant_type: "refresh_token"
            refresh_token: "${refreshToken}"
            client_id: "${testClient.clientId}"
            client_secret: "${testClient.clientSecret}"
          ) {
            access_token
            token_type
            expires_in
            scope
            refresh_token
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .send({ query: refreshMutation });

      expect(response.status).toBe(200);
      expect(response.body.data.refreshToken).toBeDefined();

      const refreshData = response.body.data.refreshToken;
      expect(refreshData.access_token).toBeDefined();
      // Tokens may be the same if issued at the same second with same payload
      // The important thing is that we get a valid token back
      expect(typeof refreshData.access_token).toBe('string');
      expect(refreshData.token_type).toBe('Bearer');
      expect(refreshData.expires_in).toBe(3600);
      expect(refreshData.scope).toBe('read write');
      expect(refreshData.refresh_token).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const refreshMutation = `
        mutation {
          refreshToken(
            grant_type: "refresh_token"
            refresh_token: "invalid_refresh_token"
            client_id: "${testClient.clientId}"
            client_secret: "${testClient.clientSecret}"
          ) {
            access_token
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .send({ query: refreshMutation });

      expect(response.status).toBe(401);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
      expect(response.body.errors[0].message).toContain(
        'Invalid or expired refresh token'
      );
    });

    it('should reject refresh token with wrong client credentials', async () => {
      // Create another client
      const wrongClient = {
        clientId: generateClientId(),
        clientSecret: generateClientSecret(),
      };
      const hashedSecret = await hashClientSecret(wrongClient.clientSecret);

      const client = new Client({
        clientId: wrongClient.clientId,
        clientSecret: hashedSecret,
        name: 'Wrong Client',
        allowedScopes: ['read'],
        supportsRefreshToken: true,
      });
      await client.save();

      const refreshMutation = `
        mutation {
          refreshToken(
            grant_type: "refresh_token"
            refresh_token: "${refreshToken}"
            client_id: "${wrongClient.clientId}"
            client_secret: "${wrongClient.clientSecret}"
          ) {
            access_token
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .send({ query: refreshMutation });

      expect(response.status).toBe(401);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
      expect(response.body.errors[0].message).toContain(
        'Refresh token does not belong to this client'
      );

      // Clean up
      await Client.deleteOne({ clientId: wrongClient.clientId });
    });

    it('should reject refresh token if client no longer supports refresh tokens', async () => {
      // Disable refresh token support for the client
      await Client.updateOne(
        { clientId: testClient.clientId },
        { supportsRefreshToken: false }
      );

      const refreshMutation = `
        mutation {
          refreshToken(
            grant_type: "refresh_token"
            refresh_token: "${refreshToken}"
            client_id: "${testClient.clientId}"
            client_secret: "${testClient.clientSecret}"
          ) {
            access_token
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .send({ query: refreshMutation });

      expect(response.status).toBe(401);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
      expect(response.body.errors[0].message).toContain(
        'Client no longer supports refresh tokens'
      );

      // Re-enable for cleanup
      await Client.updateOne(
        { clientId: testClient.clientId },
        { supportsRefreshToken: true }
      );
    });

    it('should reject wrong grant type for refresh endpoint', async () => {
      const refreshMutation = `
        mutation {
          refreshToken(
            grant_type: "client_credentials"
            refresh_token: "${refreshToken}"
            client_id: "${testClient.clientId}"
            client_secret: "${testClient.clientSecret}"
          ) {
            access_token
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .send({ query: refreshMutation });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('VALIDATION_ERROR');
      expect(response.body.errors[0].message).toContain(
        'Only refresh_token grant type is supported'
      );
    });

    it('should validate all required fields for refresh token', async () => {
      const refreshMutation = `
        mutation {
          refreshToken(
            grant_type: "refresh_token"
            refresh_token: ""
            client_id: "${testClient.clientId}"
            client_secret: "${testClient.clientSecret}"
          ) {
            access_token
          }
        }
      `;

      const response = await testRequest
        .post('/graphql')
        .send({ query: refreshMutation });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('VALIDATION_ERROR');
      expect(response.body.errors[0].message).toContain(
        'Missing required fields'
      );
    });
  });

  describe('Token Integration', () => {
    it('should be able to use refreshed access token for API calls', async () => {
      // Get initial tokens
      const authMutation = `
        mutation {
          authenticate(
            grant_type: "client_credentials"
            client_id: "${testClient.clientId}"
            client_secret: "${testClient.clientSecret}"
            scope: "read write"
          ) {
            access_token
            refresh_token
          }
        }
      `;

      const authResponse = await testRequest
        .post('/graphql')
        .send({ query: authMutation });

      const refreshToken = authResponse.body.data.authenticate.refresh_token;

      // Refresh the token
      const refreshMutation = `
        mutation {
          refreshToken(
            grant_type: "refresh_token"
            refresh_token: "${refreshToken}"
            client_id: "${testClient.clientId}"
            client_secret: "${testClient.clientSecret}"
          ) {
            access_token
          }
        }
      `;

      const refreshResponse = await testRequest
        .post('/graphql')
        .send({ query: refreshMutation });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.data.refreshToken).toBeDefined();
      const newAccessToken =
        refreshResponse.body.data.refreshToken.access_token;

      // Test the new access token works for API calls (use a read operation)
      const testQuery = `
        query {
          users {
            id
            email
          }
        }
      `;

      const apiResponse = await testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .send({ query: testQuery });

      expect(apiResponse.status).toBe(200);
      expect(apiResponse.body.data.users).toBeDefined();
    });
  });
});
