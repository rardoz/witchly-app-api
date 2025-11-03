import { MagicEightBall } from '../models/MagicEightBall';

describe('MagicEightBallResolver GraphQL Endpoints', () => {
  let testSideId: string;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    // Create test magic eight ball sides
    const side = await MagicEightBall.create({
      name: 'It is certain',
      locale: 'en_US',
      description: 'A positive response',
      diceNumber: 1,
      primaryColor: '#00FF00',
      primaryAsset: '68ff7ebe04e43ae41ca0fc59',
      backgroundAsset: '68ff7ebe04e43ae41ca0fc59',
      status: 'active',
    });
    testSideId = (side._id as string).toString();

    await MagicEightBall.create([
      {
        name: 'It is decidedly so',
        locale: 'en_US',
        diceNumber: 2,
        status: 'active',
      },
      {
        name: 'Without a doubt',
        locale: 'en_US',
        diceNumber: 3,
        status: 'active',
      },
      {
        name: 'Reply hazy try again',
        locale: 'es_ES',
        diceNumber: 4,
        status: 'paused',
      },
    ]);
  });

  describe('createMagicEightBallSide', () => {
    it('should create a magic eight ball side with all fields', async () => {
      const query = `
        mutation CreateMagicEightBallSide($input: CreateMagicEightBallInput!) {
          createMagicEightBallSide(input: $input) {
            success
            message
            side {
              _id
              name
              locale
              description
              diceNumber
              primaryColor
              status
              primaryAsset {
                id
              }
              backgroundAsset {
                id
              }
              user {
                id
              }
              createdAt
              updatedAt
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
        variables: {
          input: {
            name: 'Yes definitely',
            locale: 'en_US',
            description: 'A very positive answer',
            diceNumber: 5,
            primaryColor: '#00FF00',
            primaryAsset: '68ff7ebe04e43ae41ca0fc59',
            backgroundAsset: '68ff7ebe04e43ae41ca0fc59',
            status: 'active',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.createMagicEightBallSide.success).toBe(true);
      expect(response.body.data.createMagicEightBallSide.side.name).toBe(
        'Yes definitely'
      );
      expect(response.body.data.createMagicEightBallSide.side.diceNumber).toBe(
        5
      );
    });

    it('should create a side with only required fields', async () => {
      const query = `
        mutation CreateMagicEightBallSide($input: CreateMagicEightBallInput!) {
          createMagicEightBallSide(input: $input) {
            success
            message
            side {
              _id
              diceNumber
              status
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
        variables: {
          input: {
            diceNumber: 6,
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.createMagicEightBallSide.success).toBe(true);
      expect(response.body.data.createMagicEightBallSide.side.diceNumber).toBe(
        6
      );
    });

    it('should fail without authentication', async () => {
      const query = `
        mutation CreateMagicEightBallSide($input: CreateMagicEightBallInput!) {
          createMagicEightBallSide(input: $input) {
            success
          }
        }
      `;

      const response = await global.testRequest.post('/graphql').send({
        query,
        variables: {
          input: {
            diceNumber: 7,
          },
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });

    it('should fail with duplicate diceNumber and locale', async () => {
      const query = `
        mutation CreateMagicEightBallSide($input: CreateMagicEightBallInput!) {
          createMagicEightBallSide(input: $input) {
            success
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
        variables: {
          input: {
            name: 'Duplicate',
            diceNumber: 1,
            locale: 'en_US',
          },
        },
      });

      expect(response.status).toBe(409);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('already exists');
    });

    it('should fail with invalid diceNumber', async () => {
      const query = `
        mutation CreateMagicEightBallSide($input: CreateMagicEightBallInput!) {
          createMagicEightBallSide(input: $input) {
            success
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
        variables: {
          input: {
            diceNumber: 25,
          },
        },
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Dice number');
    });
  });

  describe('magicEightBallSides', () => {
    it('should get all magic eight ball sides', async () => {
      const query = `
        query GetMagicEightBallSides($limit: Int, $offset: Int, $status: String) {
          magicEightBallSides(limit: $limit, offset: $offset, status: $status) {
            _id
            name
            locale
            diceNumber
            status
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
        variables: {
          limit: 10,
          offset: 0,
          status: 'active',
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.magicEightBallSides).toBeDefined();
      expect(Array.isArray(response.body.data.magicEightBallSides)).toBe(true);
      expect(response.body.data.magicEightBallSides.length).toBeGreaterThan(0);
    });

    it('should filter sides by locale', async () => {
      const query = `
        query GetMagicEightBallSides($locale: String) {
          magicEightBallSides(locale: $locale) {
            _id
            name
            locale
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
        variables: {
          locale: 'en_US',
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.magicEightBallSides).toBeDefined();
      expect(
        response.body.data.magicEightBallSides.every(
          (side: { locale?: string }) => side.locale === 'en_US'
        )
      ).toBe(true);
    });

    it('should filter sides by status', async () => {
      const query = `
        query GetMagicEightBallSides($status: String) {
          magicEightBallSides(status: $status) {
            _id
            name
            status
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
        variables: {
          status: 'active',
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.magicEightBallSides).toBeDefined();
      expect(
        response.body.data.magicEightBallSides.every(
          (side: { status: string }) => side.status === 'active'
        )
      ).toBe(true);
    });

    it('should respect pagination limits', async () => {
      const query = `
        query GetMagicEightBallSides($limit: Int) {
          magicEightBallSides(limit: $limit) {
            _id
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
        variables: {
          limit: 2,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.magicEightBallSides.length).toBeLessThanOrEqual(
        2
      );
    });

    it('should fail with invalid limit', async () => {
      const query = `
        query GetMagicEightBallSides($limit: Int) {
          magicEightBallSides(limit: $limit) {
            _id
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
        variables: {
          limit: 200,
        },
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Limit must be');
    });
  });

  describe('magicEightBallSide', () => {
    it('should get a single side by ID', async () => {
      const query = `
        query GetMagicEightBallSide($id: ID) {
          magicEightBallSide(id: $id) {
            _id
            name
            locale
            description
            diceNumber
            status
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
        variables: {
          id: testSideId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.magicEightBallSide).toBeDefined();
      expect(response.body.data.magicEightBallSide._id).toBe(testSideId);
      expect(response.body.data.magicEightBallSide.name).toBe('It is certain');
    });

    it('should get a single side by diceNumber and locale', async () => {
      const query = `
        query GetMagicEightBallSide($diceNumber: Int, $locale: String) {
          magicEightBallSide(diceNumber: $diceNumber, locale: $locale) {
            _id
            name
            locale
            diceNumber
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
        variables: {
          diceNumber: 1,
          locale: 'en_US',
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.magicEightBallSide).toBeDefined();
      expect(response.body.data.magicEightBallSide.diceNumber).toBe(1);
      expect(response.body.data.magicEightBallSide.name).toBe('It is certain');
    });

    it('should fail with invalid ID', async () => {
      const query = `
        query GetMagicEightBallSide($id: ID) {
          magicEightBallSide(id: $id) {
            _id
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
        variables: {
          id: 'invalid-id',
        },
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Invalid');
    });

    it('should fail when side not found', async () => {
      const query = `
        query GetMagicEightBallSide($id: ID) {
          magicEightBallSide(id: $id) {
            _id
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
        variables: {
          id: '507f1f77bcf86cd799439011',
        },
      });

      expect(response.status).toBe(404);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('not found');
    });

    it('should fail without id or diceNumber+locale', async () => {
      const query = `
        query GetMagicEightBallSide {
          magicEightBallSide {
            _id
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Must provide');
    });
  });

  describe('updateMagicEightBallSide', () => {
    it('should update a magic eight ball side', async () => {
      const query = `
        mutation UpdateMagicEightBallSide($id: ID!, $input: UpdateMagicEightBallInput!) {
          updateMagicEightBallSide(id: $id, input: $input) {
            success
            message
            side {
              _id
              name
              description
              diceNumber
              status
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
        variables: {
          id: testSideId,
          input: {
            name: 'It is certain - Updated',
            description: 'Updated description',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.updateMagicEightBallSide.success).toBe(true);
      expect(response.body.data.updateMagicEightBallSide.side.name).toBe(
        'It is certain - Updated'
      );
    });

    it('should fail with invalid ID', async () => {
      const query = `
        mutation UpdateMagicEightBallSide($id: ID!, $input: UpdateMagicEightBallInput!) {
          updateMagicEightBallSide(id: $id, input: $input) {
            success
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
        variables: {
          id: 'invalid-id',
          input: {
            name: 'Test',
          },
        },
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Invalid');
    });

    it('should fail without authentication', async () => {
      const query = `
        mutation UpdateMagicEightBallSide($id: ID!, $input: UpdateMagicEightBallInput!) {
          updateMagicEightBallSide(id: $id, input: $input) {
            success
          }
        }
      `;

      const response = await global.testRequest.post('/graphql').send({
        query,
        variables: {
          id: testSideId,
          input: {
            name: 'Test',
          },
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });
  });

  describe('softDeleteMagicEightBallSide', () => {
    it('should soft delete a magic eight ball side', async () => {
      const createQuery = `
        mutation CreateMagicEightBallSide($input: CreateMagicEightBallInput!) {
          createMagicEightBallSide(input: $input) {
            side {
              _id
            }
          }
        }
      `;

      const createResponse = await global.adminUserAdminAppTestRequest().send({
        query: createQuery,
        variables: {
          input: {
            name: 'To Be Soft Deleted',
            diceNumber: 10,
            status: 'active',
          },
        },
      });

      const sideId = createResponse.body.data.createMagicEightBallSide.side._id;

      const deleteQuery = `
        mutation SoftDeleteMagicEightBallSide($id: ID!) {
          softDeleteMagicEightBallSide(id: $id) {
            success
            message
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: deleteQuery,
        variables: {
          id: sideId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.softDeleteMagicEightBallSide.success).toBe(
        true
      );

      const side = await MagicEightBall.findById(sideId);
      expect(side?.status).toBe('deleted');
    });

    it('should fail with invalid ID', async () => {
      const query = `
        mutation SoftDeleteMagicEightBallSide($id: ID!) {
          softDeleteMagicEightBallSide(id: $id) {
            success
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
        variables: {
          id: 'invalid-id',
        },
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Invalid');
    });
  });

  describe('hardDeleteMagicEightBallSide', () => {
    it('should permanently delete a magic eight ball side', async () => {
      const createQuery = `
        mutation CreateMagicEightBallSide($input: CreateMagicEightBallInput!) {
          createMagicEightBallSide(input: $input) {
            side {
              _id
            }
          }
        }
      `;

      const createResponse = await global.adminUserAdminAppTestRequest().send({
        query: createQuery,
        variables: {
          input: {
            name: 'To Be Hard Deleted',
            diceNumber: 11,
            status: 'active',
          },
        },
      });

      const sideId = createResponse.body.data.createMagicEightBallSide.side._id;

      const deleteQuery = `
        mutation HardDeleteMagicEightBallSide($id: ID!) {
          hardDeleteMagicEightBallSide(id: $id) {
            success
            message
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: deleteQuery,
        variables: {
          id: sideId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.hardDeleteMagicEightBallSide.success).toBe(
        true
      );

      const side = await MagicEightBall.findById(sideId);
      expect(side).toBeNull();
    });

    it('should fail when side not found', async () => {
      const query = `
        mutation HardDeleteMagicEightBallSide($id: ID!) {
          hardDeleteMagicEightBallSide(id: $id) {
            success
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
        variables: {
          id: '507f1f77bcf86cd799439011',
        },
      });

      expect(response.status).toBe(404);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('not found');
    });

    it('should fail without authentication', async () => {
      const query = `
        mutation HardDeleteMagicEightBallSide($id: ID!) {
          hardDeleteMagicEightBallSide(id: $id) {
            success
          }
        }
      `;

      const response = await global.testRequest.post('/graphql').send({
        query,
        variables: {
          id: testSideId,
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });
  });
});
