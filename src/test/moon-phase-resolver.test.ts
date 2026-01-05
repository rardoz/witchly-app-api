import { MoonPhase } from '../models/MoonPhase';

describe('MoonPhaseResolver GraphQL Endpoints', () => {
  let testMoonPhaseId: string;
  const moonPhasesQuery = `
    query GetMoonPhases($locale: String, $status: String, $phase: String, $limit: Float, $offset: Float) {
      moonPhases(locale: $locale, status: $status, phase: $phase, limit: $limit, offset: $offset) {
        records {
            _id
            phase
            phaseLocal
            locale
            description
            number
            primaryColor
            status
            primaryAsset {
                id
                publicUrl
            }
            backgroundAsset {
                id
                publicUrl
            }
            user {
                id
                handle
                name
            }
            createdAt
            updatedAt
        }
        totalCount
        limit
        offset
      }
    }
  `;
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    // Create test moon phases
    const moonPhase = await MoonPhase.create({
      locale: 'en_US',
      description: 'The new moon represents new beginnings and fresh starts.',
      number: 1,
      phase: 'new moon',
      phaseLocal: 'new moon',
      primaryColor: '#1A1A2E',
      primaryAsset: '68ff7ebe04e43ae41ca0fc59',
      backgroundAsset: '68ff7ebe04e43ae41ca0fc59',
      status: 'active',
    });
    testMoonPhaseId = (moonPhase._id as string).toString();

    await MoonPhase.create([
      {
        phase: 'Waxing Crescent',
        locale: 'en_US',
        number: 2,
        status: 'active',
      },
      { phase: 'First Quarter', locale: 'en_US', number: 3, status: 'active' },
      { phase: 'Waxing Gibbous', locale: 'es_ES', number: 4, status: 'paused' },
    ]);
  });

  describe('createMoonPhase', () => {
    it('should create a moon phase with all fields', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: ` 
            mutation CreateMoonPhase($input: CreateMoonPhaseInput!) {
              createMoonPhase(input: $input) {
                success
                message
                moonPhase {
                  _id
                  phase
                  status
                  locale
                  number
                }
              }
            }
        `,
        variables: {
          input: {
            locale: 'en_US',
            description:
              'The full moon illuminates everything and brings clarity.',
            number: 5,
            phase: 'full moon',
            phaseLocal: 'full moon',
            primaryColor: '#FFD700',
            primaryAsset: '68ff7ebe04e43ae41ca0fc59',
            backgroundAsset: '68ff7ebe04e43ae41ca0fc59',
            status: 'active',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.createMoonPhase.success).toBe(true);
      expect(response.body.data.createMoonPhase.moonPhase.phase).toBe(
        'full moon'
      );
      expect(response.body.data.createMoonPhase.moonPhase.locale).toBe('en_US');
      expect(response.body.data.createMoonPhase.moonPhase.number).toBe(5);
      expect(response.body.data.createMoonPhase.moonPhase.status).toBe(
        'active'
      );
    });

    it('should create a moon phase with only required fields', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: `
            mutation CreateMoonPhase($input: CreateMoonPhaseInput!) {
              createMoonPhase(input: $input) {
                success
                message
                moonPhase {
                  _id
                  phase
                  status
                }
              }
            }
          `,
        variables: {
          input: {
            phase: 'Waning Gibbous',
            status: 'active',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.createMoonPhase.success).toBe(true);
      expect(response.body.data.createMoonPhase.moonPhase.phase).toBe(
        'Waning Gibbous'
      );
    });

    it('should fail without authentication', async () => {
      const response = await global.testRequest.post('/graphql').send({
        query: `
            mutation CreateMoonPhase($input: CreateMoonPhaseInput!) {
              createMoonPhase(input: $input) {
                success
                message
              }
            }
          `,
        variables: {
          input: {
            phase: 'Waning Crescent',
            status: 'active',
          },
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });

    it('should fail with invalid asset ID', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: `
            mutation CreateMoonPhase($input: CreateMoonPhaseInput!) {
              createMoonPhase(input: $input) {
                success
              }
            }
          `,
        variables: {
          input: {
            phase: 'Test Moon',
            status: 'active',
            primaryAsset: 'invalid-id',
          },
        },
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain(
        'Invalid primary asset ID'
      );
    });
  });

  describe('moonPhases', () => {
    it('should get all moon phases', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: moonPhasesQuery,
        variables: {
          limit: 10,
          offset: 0,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.moonPhases).toBeDefined();
      expect(Array.isArray(response.body.data.moonPhases.records)).toBe(true);
      expect(response.body.data.moonPhases.records.length).toBeGreaterThan(0);
      expect(response.body.data.moonPhases.totalCount).toBeGreaterThan(0);
      expect(response.body.data.moonPhases.limit).toBe(10);
      expect(response.body.data.moonPhases.offset).toBe(0);
    });

    it('should filter moon phases by locale', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: moonPhasesQuery,
        variables: {
          locale: 'en_US',
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.moonPhases).toBeDefined();
      expect(
        response.body.data.moonPhases.records.every(
          (mp: { locale?: string }) => mp.locale === 'en_US'
        )
      ).toBe(true);
    });

    it('should filter moon phases by status', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: moonPhasesQuery,
        variables: {
          status: 'active',
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.moonPhases).toBeDefined();
      expect(
        response.body.data.moonPhases.records.every(
          (mp: { status: string }) => mp.status === 'active'
        )
      ).toBe(true);
    });

    it('should respect pagination limits', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: moonPhasesQuery,
        variables: {
          limit: 2,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.moonPhases.records.length).toBeLessThanOrEqual(
        2
      );
    });

    it('should fail with invalid limit', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: moonPhasesQuery,
        variables: {
          limit: 200,
        },
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain(
        'Limit must be between 1 and 100'
      );
    });
  });

  describe('moonPhase', () => {
    it('should get a single moon phase by ID', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: `
            query GetMoonPhase($id: ID!) {
              moonPhase(id: $id) {
                _id
                locale
                description
                number
                phase
                phaseLocal
                status
              }
            }
          `,
        variables: {
          id: testMoonPhaseId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.moonPhase).toBeDefined();
      expect(response.body.data.moonPhase._id).toBe(testMoonPhaseId);
      expect(response.body.data.moonPhase.phase).toBe('new moon');
    });

    it('should fail with invalid moon phase ID', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: `
            query GetMoonPhase($id: ID!) {
              moonPhase(id: $id) {
                _id
              }
            }
          `,
        variables: {
          id: 'invalid-id',
        },
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain(
        'Invalid moon phase ID format'
      );
    });

    it('should fail when moon phase not found', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: `
            query GetMoonPhase($id: ID!) {
              moonPhase(id: $id) {
                _id
              }
            }
          `,
        variables: {
          id: '507f1f77bcf86cd799439011',
        },
      });

      expect(response.status).toBe(404);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Moon phase not found');
    });
  });

  describe('updateMoonPhase', () => {
    it('should update a moon phase', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: `
            mutation UpdateMoonPhase($id: ID!, $input: UpdateMoonPhaseInput!) {
              updateMoonPhase(id: $id, input: $input) {
                success
                message
                moonPhase {
                  _id
                  phase
                  phaseLocal
                  description
                  status
                }
              }
            }
          `,
        variables: {
          id: testMoonPhaseId,
          input: {
            phase: 'new moon',
            phaseLocal: 'new moon',
            description: 'Updated description for the new moon phase.',
            status: 'active',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.updateMoonPhase.success).toBe(true);
      expect(response.body.data.updateMoonPhase.moonPhase.phase).toBe(
        'new moon'
      );
    });

    it('should fail with invalid moon phase ID', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: `
            mutation UpdateMoonPhase($id: ID!, $input: UpdateMoonPhaseInput!) {
              updateMoonPhase(id: $id, input: $input) {
                success
              }
            }
          `,
        variables: {
          id: 'invalid-id',
          input: {
            phase: 'Test',
          },
        },
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain(
        'Invalid moon phase ID format'
      );
    });

    it('should fail without authentication', async () => {
      const response = await global.testRequest.post('/graphql').send({
        query: `
            mutation UpdateMoonPhase($id: ID!, $input: UpdateMoonPhaseInput!) {
              updateMoonPhase(id: $id, input: $input) {
                success
              }
            }
          `,
        variables: {
          id: testMoonPhaseId,
          input: {
            phase: 'Test',
          },
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });
  });

  describe('softDeleteMoonPhase', () => {
    it('should soft delete a moon phase', async () => {
      // First create a moon phase to delete
      const createResponse = await global.adminUserAdminAppTestRequest().send({
        query: `
            mutation CreateMoonPhase($input: CreateMoonPhaseInput!) {
              createMoonPhase(input: $input) {
                moonPhase {
                  _id
                }
              }
            }
          `,
        variables: {
          input: {
            phase: 'To Be Soft Deleted',
            status: 'active',
          },
        },
      });

      const moonPhaseId =
        createResponse.body.data.createMoonPhase.moonPhase._id;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: `
            mutation SoftDeleteMoonPhase($id: ID!) {
              softDeleteMoonPhase(id: $id) {
                success
                message
              }
            }
          `,
        variables: {
          id: moonPhaseId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.softDeleteMoonPhase.success).toBe(true);

      const moonPhase = await MoonPhase.findById(moonPhaseId);
      expect(moonPhase?.status).toBe('deleted');
    });

    it('should fail with invalid ID', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: `
            mutation SoftDeleteMoonPhase($id: ID!) {
              softDeleteMoonPhase(id: $id) {
                success
              }
            }
          `,
        variables: {
          id: 'invalid-id',
        },
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain(
        'Invalid moon phase ID format'
      );
    });
  });

  describe('hardDeleteMoonPhase', () => {
    it('should permanently delete a moon phase', async () => {
      // First create a moon phase to delete
      const createResponse = await global.adminUserAdminAppTestRequest().send({
        query: `
            mutation CreateMoonPhase($input: CreateMoonPhaseInput!) {
              createMoonPhase(input: $input) {
                moonPhase {
                  _id
                }
              }
            }
          `,
        variables: {
          input: {
            phase: 'To Be Hard Deleted',
            status: 'active',
          },
        },
      });

      const moonPhaseId =
        createResponse.body.data.createMoonPhase.moonPhase._id;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: `
            mutation HardDeleteMoonPhase($id: ID!) {
              hardDeleteMoonPhase(id: $id) {
                success
                message
              }
            }
          `,
        variables: {
          id: moonPhaseId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.hardDeleteMoonPhase.success).toBe(true);

      // Verify moon phase was deleted
      const moonPhase = await MoonPhase.findById(moonPhaseId);
      expect(moonPhase).toBeNull();
    });

    it('should fail when moon phase not found', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: `
            mutation HardDeleteMoonPhase($id: ID!) {
              hardDeleteMoonPhase(id: $id) {
                success
              }
            }
          `,
        variables: {
          id: '507f1f77bcf86cd799439011',
        },
      });

      expect(response.status).toBe(404);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Moon phase not found');
    });

    it('should fail without authentication', async () => {
      const query = `
        mutation HardDeleteMoonPhase($id: ID!) {
          hardDeleteMoonPhase(id: $id) {
            success
          }
        }
      `;

      const response = await global.testRequest.post('/graphql').send({
        query,
        variables: {
          id: testMoonPhaseId,
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });
  });
});
