import { TarotCard } from '../models/TarotCard';
import { TarotDeck } from '../models/TarotDeck';

describe('TarotCardResolver GraphQL Endpoints', () => {
  let testDeckId: string;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    // Create a test deck for cards to belong to
    const deck = await TarotDeck.create({
      name: 'Test Deck for Cards',
      locale: 'en',
      primaryAsset: '68ff7ebe04e43ae41ca0fc59',
      cardBackgroundAsset: '68ff7ebe04e43ae41ca0fc59',
      primaryColor: '#FF5733',
      description: 'A test tarot deck',
      author: 'Test Author',
      meta: ['mystical', 'beginner'],
      layoutType: 'default',
      layoutCount: 1,
      status: 'active',
    });
    testDeckId = (deck._id as string).toString();

    // Create test cards
    await TarotCard.create([
      {
        name: 'The Fool',
        tarotCardNumber: '0',
        primaryAsset: '68ff7ebe04e43ae41ca0fc59',
        description: 'New beginnings and innocence',
        locale: 'en',
        meta: ['major arcana', 'beginnings'],
        status: 'active',
        tarotDeck: testDeckId,
      },
      {
        name: 'The Magician',
        tarotCardNumber: '1',
        primaryAsset: '68ff7ebe04e43ae41ca0fc59',
        description: 'Manifestation and power',
        locale: 'en',
        meta: ['major arcana', 'power'],
        status: 'active',
        tarotDeck: testDeckId,
      },
      {
        name: 'The High Priestess',
        tarotCardNumber: '2',
        primaryAsset: '68ff7ebe04e43ae41ca0fc59',
        description: 'Intuition and mystery',
        locale: 'en',
        meta: ['major arcana', 'intuition'],
        status: 'paused',
        tarotDeck: testDeckId,
      },
      {
        name: 'The Empress',
        tarotCardNumber: '3',
        primaryAsset: '68ff7ebe04e43ae41ca0fc59',
        description: 'Abundance and nurturing',
        locale: 'en',
        meta: ['major arcana', 'abundance'],
        status: 'deleted',
        tarotDeck: testDeckId,
      },
    ]);
  });

  describe('Query: tarotCards', () => {
    const query = `
        query GetTarotCards($tarotDeckId: ID!, $status: String, $limit: Int, $offset: Int) {
          tarotCards(tarotDeckId: $tarotDeckId, status: $status, limit: $limit, offset: $offset) {
              records {
                  _id
                  name
                  tarotCardNumber
                  primaryAsset {
                      id
                      s3Key
                  }
                  description
                  locale
                  meta
                  status
                  user {
                      id
                      handle
                  }
                  tarotDeck {
                      _id
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

    it('should return all tarot cards for a deck without status filter', async () => {
      const response = await global
        .adminUserAdminAppTestRequest()
        .send({ query, variables: { tarotDeckId: testDeckId } });

      expect(response.status).toBe(200);
      expect(response.body.data.tarotCards).toBeDefined();
      expect(
        response.body.data.tarotCards.records.length
      ).toBeGreaterThanOrEqual(4); // All cards regardless of status

      const cards = response.body.data.tarotCards.records;
      expect(cards[0]).toHaveProperty('name');
      expect(cards[0]).toHaveProperty('tarotCardNumber');
      expect(cards[0]).toHaveProperty('description');
      expect(cards[0]).toHaveProperty('status');
      expect(response.body.data.tarotCards.totalCount).toBeGreaterThan(1);
      expect(response.body.data.tarotCards.limit).toBe(10);
      expect(response.body.data.tarotCards.offset).toBe(0);
    });

    it('should return only active tarot cards when status filter is applied', async () => {
      const variables = { tarotDeckId: testDeckId, status: 'active' };

      const response = await global
        .adminUserAdminAppTestRequest()
        .send({ query, variables });
      expect(response.status).toBe(200);
      expect(response.body.data.tarotCards).toBeDefined();
      expect(response.body.data.tarotCards.records).toHaveLength(2); // Only active cards

      const cards = response.body.data.tarotCards.records;
      cards.forEach((card: { status: string }) => {
        expect(card.status).toBe('active');
      });
    });

    it('should return paused cards when status filter is paused', async () => {
      const variables = { tarotDeckId: testDeckId, status: 'paused' };

      const response = await global
        .adminUserAdminAppTestRequest()
        .send({ query, variables });
      expect(response.status).toBe(200);
      expect(response.body.data.tarotCards.records).toHaveLength(1);
      expect(response.body.data.tarotCards.records[0].status).toBe('paused');
      expect(response.body.data.tarotCards.records[0].name).toBe(
        'The High Priestess'
      );
    });

    it('should return deleted cards when status filter is deleted', async () => {
      const variables = { tarotDeckId: testDeckId, status: 'deleted' };

      const response = await global
        .adminUserAdminAppTestRequest()
        .send({ query, variables });
      expect(response.status).toBe(200);
      expect(response.body.data.tarotCards.records).toHaveLength(1);
      expect(response.body.data.tarotCards.records[0].status).toBe('deleted');
      expect(response.body.data.tarotCards.records[0].name).toBe('The Empress');
    });

    it('should respect pagination parameters', async () => {
      const variables = { tarotDeckId: testDeckId, limit: 2, offset: 0 };

      const response = await global
        .adminUserAdminAppTestRequest()
        .send({ query, variables });
      expect(response.status).toBe(200);
      expect(response.body.data.tarotCards.records).toHaveLength(2);
    });

    it('should handle offset pagination', async () => {
      const variables = { tarotDeckId: testDeckId, limit: 2, offset: 2 };

      const response = await global
        .adminUserAdminAppTestRequest()
        .send({ query, variables });
      expect(response.status).toBe(200);
      expect(response.body.data.tarotCards.records.length).toBeLessThanOrEqual(
        2
      );
    });

    it('should reject invalid limit values', async () => {
      const variables = { tarotDeckId: testDeckId, limit: 101 };

      const response = await global
        .adminUserAdminAppTestRequest()
        .send({ query, variables });
      expect(response.status).toBe(400);
      expect(response.body.errors[0].extensions.code).toBe('VALIDATION_ERROR');
      expect(response.body.errors[0].message).toContain(
        'Limit must be between 1 and 100'
      );
    });

    it('should reject negative offset values', async () => {
      const variables = { tarotDeckId: testDeckId, offset: -1 };

      const response = await global
        .adminUserAdminAppTestRequest()
        .send({ query, variables });
      expect(response.status).toBe(400);
      expect(response.body.errors[0].extensions.code).toBe('VALIDATION_ERROR');
      expect(response.body.errors[0].message).toContain(
        'Offset must be non-negative'
      );
    });

    it('should reject unauthorized requests', async () => {
      const variables = { tarotDeckId: testDeckId };

      const response = await testRequest
        .post('/graphql')
        .send({ query, variables });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Query: tarotCard', () => {
    let testCardId: string;

    beforeEach(async () => {
      const card = await TarotCard.create({
        name: 'Test Single Card',
        tarotCardNumber: '99',
        primaryAsset: '68ff7ebe04e43ae41ca0fc59',
        description: 'A single test card',
        locale: 'en',
        meta: ['test'],
        status: 'active',
        tarotDeck: testDeckId,
      });
      testCardId = (card._id as string).toString();
    });

    it('should return a single tarot card by ID', async () => {
      const query = `
        query {
          tarotCard(id: "${testCardId}") {
            _id
            name
            tarotCardNumber
            primaryAsset {
              s3Key
            }
            description
            locale
            meta
            status
            user {
              id
              handle
            }
            tarotDeck {
                _id
            }
          }
        }
      `;

      const response = await global
        .adminUserAdminAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.tarotCard).toBeDefined();
      expect(response.body.data.tarotCard.name).toBe('Test Single Card');
      expect(response.body.data.tarotCard.tarotCardNumber).toBe('99');
      expect(response.body.data.tarotCard.status).toBe('active');
    });

    it('should return error for non-existent card', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const query = `
        query {
          tarotCard(id: "${fakeId}") {
            _id
            name
          }
        }
      `;

      const response = await global
        .adminUserAdminAppTestRequest()
        .send({ query });

      expect(response.status).toBe(404);
      expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');
      expect(response.body.errors[0].message).toContain('Tarot card not found');
    });

    it('should reject unauthorized requests', async () => {
      const query = `
        query {
          tarotCard(id: "${testCardId}") {
            _id
            name
          }
        }
      `;

      const response = await testRequest.post('/graphql').send({ query });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Mutation: createTarotCard', () => {
    const validCardData = {
      name: 'The Tower',
      tarotCardNumber: '16',
      primaryAsset: '68ff7ebe04e43ae41ca0fc59',
      description: 'Sudden change and upheaval',
      locale: 'en',
      meta: ['major arcana', 'change'],
      status: 'active',
    };

    it('should create a tarot card with valid data', async () => {
      const mutation = `
        mutation CreateTarotCard($input: CreateTarotCardInput!) {
          createTarotCard(input: $input) {
            success
            message
            card {
              _id
              name
              tarotCardNumber
              primaryAsset {
                s3Key
              }
              description
              locale
              meta
              status
              user {
                id
                handle
              }
              tarotDeck {
                _id
              }
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            ...validCardData,
            tarotDeck: testDeckId,
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.createTarotCard.success).toBe(true);
      expect(response.body.data.createTarotCard.message).toBe(
        'Tarot card created successfully'
      );
      expect(response.body.data.createTarotCard.card.name).toBe('The Tower');
      expect(response.body.data.createTarotCard.card.tarotCardNumber).toBe(
        '16'
      );
      expect(response.body.data.createTarotCard.card.status).toBe('active');
    });

    it('should create a card with minimal data', async () => {
      const minimalCardData = {
        name: 'Minimal Card',
        tarotDeck: testDeckId,
      };

      const mutation = `
        mutation CreateTarotCard($input: CreateTarotCardInput!) {
          createTarotCard(input: $input) {
            success
            card {
              name
              status
              meta
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: minimalCardData,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.createTarotCard.success).toBe(true);
      expect(response.body.data.createTarotCard.card.name).toBe('Minimal Card');
      expect(response.body.data.createTarotCard.card.status).toBe('active'); // Default value
      expect(response.body.data.createTarotCard.card.meta).toEqual([]); // Default value
    });

    it('should require admin scope for card creation', async () => {
      const mutation = `
        mutation CreateTarotCard($input: CreateTarotCardInput!) {
          createTarotCard(input: $input) {
            success
            card {
              _id
              name
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            ...validCardData,
            tarotDeck: testDeckId,
          },
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
      expect(response.body.errors[0].message).toContain(
        'Admin session access required'
      );
    });

    it('should reject unauthorized card creation', async () => {
      const mutation = `
        mutation CreateTarotCard($input: CreateTarotCardInput!) {
          createTarotCard(input: $input) {
            success
            card {
              _id
              name
            }
          }
        }
      `;

      const response = await testRequest.post('/graphql').send({
        query: mutation,
        variables: {
          input: {
            ...validCardData,
            tarotDeck: testDeckId,
          },
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Mutation: updateTarotCard', () => {
    let testCardId: string;

    beforeEach(async () => {
      const card = await TarotCard.create({
        name: 'Card to Update',
        tarotCardNumber: '50',
        primaryAsset: '68ff7ebe04e43ae41ca0fc59',
        description: 'Original description',
        locale: 'en',
        meta: ['original'],
        status: 'active',
        tarotDeck: testDeckId,
      });
      testCardId = (card._id as string).toString();
    });

    it('should update a tarot card with valid data', async () => {
      const mutation = `
        mutation UpdateTarotCard($id: ID!, $input: UpdateTarotCardInput!) {
          updateTarotCard(id: $id, input: $input) {
            success
            message
            card {
              _id
              name
              tarotCardNumber
              description
              meta
              status
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          id: testCardId,
          input: {
            name: 'Updated Card Name',
            description: 'Updated description',
            meta: ['updated', 'modified'],
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.updateTarotCard.success).toBe(true);
      expect(response.body.data.updateTarotCard.message).toBe(
        'Tarot card updated successfully'
      );
      expect(response.body.data.updateTarotCard.card.name).toBe(
        'Updated Card Name'
      );
      expect(response.body.data.updateTarotCard.card.description).toBe(
        'Updated description'
      );
      expect(response.body.data.updateTarotCard.card.meta).toEqual([
        'updated',
        'modified',
      ]);
    });

    it('should update only provided fields', async () => {
      const mutation = `
        mutation UpdateTarotCard($id: ID!, $input: UpdateTarotCardInput!) {
          updateTarotCard(id: $id, input: $input) {
            success
            card {
              name
              tarotCardNumber
              description
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          id: testCardId,
          input: {
            name: 'Partially Updated',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.updateTarotCard.card.name).toBe(
        'Partially Updated'
      );
      expect(response.body.data.updateTarotCard.card.tarotCardNumber).toBe(
        '50'
      ); // Unchanged
      expect(response.body.data.updateTarotCard.card.description).toBe(
        'Original description'
      ); // Unchanged
    });

    it('should return error for non-existent card', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const mutation = `
        mutation UpdateTarotCard($id: ID!, $input: UpdateTarotCardInput!) {
          updateTarotCard(id: $id, input: $input) {
            success
            card {
              name
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          id: fakeId,
          input: {
            name: 'Updated',
          },
        },
      });

      expect(response.status).toBe(404);
      expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');
      expect(response.body.errors[0].message).toContain('Tarot card not found');
    });

    it('should require admin scope for card update', async () => {
      const mutation = `
        mutation UpdateTarotCard($id: ID!, $input: UpdateTarotCardInput!) {
          updateTarotCard(id: $id, input: $input) {
            success
            card {
              name
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          id: testCardId,
          input: {
            name: 'Updated',
          },
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Mutation: softDeleteTarotCard', () => {
    let testCardId: string;

    beforeEach(async () => {
      const card = await TarotCard.create({
        name: 'Card to Soft Delete',
        tarotCardNumber: '60',
        description: 'Will be soft deleted',
        locale: 'en',
        status: 'active',
        tarotDeck: testDeckId,
      });
      testCardId = (card._id as string).toString();
    });

    it('should soft delete a tarot card', async () => {
      const mutation = `
        mutation SoftDeleteTarotCard($id: ID!) {
          softDeleteTarotCard(id: $id) {
            success
            message
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          id: testCardId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.softDeleteTarotCard.success).toBe(true);
      expect(response.body.data.softDeleteTarotCard.message).toBe(
        'Tarot card soft deleted successfully'
      );

      // Verify card still exists but status is deleted
      const card = await TarotCard.findById(testCardId);
      expect(card).toBeDefined();
      expect(card?.status).toBe('deleted');
    });

    it('should return error for non-existent card', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const mutation = `
        mutation SoftDeleteTarotCard($id: ID!) {
          softDeleteTarotCard(id: $id) {
            success
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          id: fakeId,
        },
      });

      expect(response.status).toBe(404);
      expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');
    });

    it('should require admin scope for soft delete', async () => {
      const mutation = `
        mutation SoftDeleteTarotCard($id: ID!) {
          softDeleteTarotCard(id: $id) {
            success
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          id: testCardId,
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Mutation: hardDeleteTarotCard', () => {
    let testCardId: string;

    beforeEach(async () => {
      const card = await TarotCard.create({
        name: 'Card to Hard Delete',
        tarotCardNumber: '70',
        description: 'Will be permanently deleted',
        locale: 'en',
        status: 'active',
        tarotDeck: testDeckId,
      });
      testCardId = (card._id as string).toString();
    });

    it('should permanently delete a tarot card', async () => {
      const mutation = `
        mutation HardDeleteTarotCard($id: ID!) {
          hardDeleteTarotCard(id: $id) {
            success
            message
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          id: testCardId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.hardDeleteTarotCard.success).toBe(true);
      expect(response.body.data.hardDeleteTarotCard.message).toBe(
        'Tarot card permanently deleted'
      );

      // Verify card no longer exists
      const card = await TarotCard.findById(testCardId);
      expect(card).toBeNull();
    });

    it('should return error for non-existent card', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const mutation = `
        mutation HardDeleteTarotCard($id: ID!) {
          hardDeleteTarotCard(id: $id) {
            success
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          id: fakeId,
        },
      });

      expect(response.status).toBe(404);
      expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');
    });

    it('should require admin scope for hard delete', async () => {
      const mutation = `
        mutation HardDeleteTarotCard($id: ID!) {
          hardDeleteTarotCard(id: $id) {
            success
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          id: testCardId,
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });
  });
});
