import { Client, type IClient } from '../models/Client';
import {
  generateClientId,
  generateClientSecret,
  hashClientSecret,
} from '../services/jwt.service';

describe('Required Scope Parameter Validation', () => {
  let testClient: IClient;
  let clientSecret: string;

  beforeAll(async () => {
    const clientId = generateClientId();
    clientSecret = generateClientSecret();
    const hashedSecret = await hashClientSecret(clientSecret);

    testClient = new Client({
      clientId,
      clientSecret: hashedSecret,
      name: 'Test Required Scope Client',
      description: 'Client for testing required scope validation',
      allowedScopes: ['read', 'write'],
      tokenExpiresIn: 3600,
    });

    await testClient.save();
  });

  afterAll(async () => {
    await Client.deleteOne({ clientId: testClient.clientId });
  });

  it('should require scope parameter - GraphQL validation error', async () => {
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
    expect(response.body.errors[0].message).toContain('required');
  });

  it('should reject empty scope string', async () => {
    const mutation = `
      mutation {
        authenticate(
          grant_type: "client_credentials"
          client_id: "${testClient.clientId}"
          client_secret: "${clientSecret}"
          scope: ""
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
    // Empty string gets caught by our validation logic
    expect(response.body.errors[0].message).toContain(
      'Missing required fields'
    );
  });

  it('should accept valid scope parameter', async () => {
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
});
