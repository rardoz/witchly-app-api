import { TarotDeck } from '../models/TarotDeck';

describe('TarotDeckResolver GraphQL Endpoints', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    // Create some test decks
    await TarotDeck.create([
      {
        name: 'Test Deck 1',
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
      },
      {
        name: 'Test Deck 2',
        locale: 'en',
        primaryAsset: '68ff7ebe04e43ae41ca0fc59',
        cardBackgroundAsset: '68ff7ebe04e43ae41ca0fc59',
        primaryColor: '#33FF57',
        description: 'Another test tarot deck',
        author: 'Another Author',
        meta: ['advanced', 'spiritual'],
        layoutType: 'custom',
        layoutCount: 3,
        status: 'paused',
      },
      {
        name: 'Test Deck 3 Inactive',
        locale: 'en',
        primaryAsset: '68ff7ebe04e43ae41ca0fc59',
        cardBackgroundAsset: '68ff7ebe04e43ae41ca0fc59',
        primaryColor: '#3357FF',
        description: 'An inactive test deck',
        author: 'Test Author',
        meta: [],
        layoutType: 'default',
        layoutCount: 1,
        status: 'paused',
      },
    ]);
  });

  describe('Query: tarotDecks', () => {
    it('should return active tarot decks by default', async () => {
      const query = `
        query {
          tarotDecks(status: "active") {
            _id
            name
            locale
            primaryAsset {
              s3Key
            }
            cardBackgroundAsset {
              s3Key
            }
            user {
              id
              handle
            }
            primaryColor
            description
            author
            meta
            layoutType
            layoutCount
            status
          }
        }
      `;

      const response = await global
        .adminUserAdminAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.tarotDecks).toBeDefined();
      expect(response.body.data.tarotDecks).toHaveLength(1); // Only decks with status='active'

      const decks = response.body.data.tarotDecks;
      expect(decks[0].status).toBe('active');

      // Check that all required fields are present
      expect(decks[0]).toHaveProperty('layoutType');
      expect(decks[0]).toHaveProperty('layoutCount');
      expect(decks[0]).toHaveProperty('status');
    });

    it('should return paused decks when status is paused', async () => {
      const query = `
        query {
          tarotDecks(status: "paused") {
            _id
            locale
            name
            status
          }
        }
      `;
      const response = await global
        .adminUserAdminAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.tarotDecks).toHaveLength(2); // Two paused decks
      expect(response.body.data.tarotDecks[0].status).toBe('paused');
    });

    it('should respect pagination parameters', async () => {
      const query = `
        query {
          tarotDecks(limit: 1, offset: 0) {
            _id
            name
            locale
          }
        }
      `;

      const response = await global
        .adminUserAdminAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.tarotDecks).toHaveLength(1);
    });

    it('should reject unauthorized requests', async () => {
      const query = `
        query {
          tarotDecks {
            _id
            name
            locale
          }
        }
      `;

      const response = await testRequest.post('/graphql').send({ query });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Query: tarotDeck', () => {
    let testDeckId: string;

    beforeEach(async () => {
      const deck = await TarotDeck.create({
        name: 'Test Single Deck',
        locale: 'en',
        primaryAsset: '68ff7ebe04e43ae41ca0fc59',
        cardBackgroundAsset: '68ff7ebe04e43ae41ca0fc59',
        primaryColor: '#FF5733',
        description: 'A single test deck',
        author: 'Test Author',
        meta: ['test'],
        layoutType: 'default',
        layoutCount: 1,
        status: 'active',
        isActive: true,
      });
      testDeckId = (deck._id as string).toString();
    });

    it('should return a single tarot deck by ID', async () => {
      const query = `
        query {
          tarotDeck(id: "${testDeckId}") {
            _id
            name
            locale
            primaryAsset {
              s3Key
            }
            cardBackgroundAsset {
              s3Key
            }
            user {
              id
              handle
            }
            primaryColor
            description
            author
            meta
            layoutType
            layoutCount
            status
          }
        }
      `;

      const response = await global
        .adminUserAdminAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.tarotDeck).toBeDefined();
      expect(response.body.data.tarotDeck.name).toBe('Test Single Deck');
      expect(response.body.data.tarotDeck.layoutType).toBe('default');
      expect(response.body.data.tarotDeck.layoutCount).toBe(1);
      expect(response.body.data.tarotDeck.status).toBe('active');
    });

    it('should return error for non-existent deck', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const query = `
        query {
          tarotDeck(id: "${fakeId}") {
            _id
            name
            locale
          }
        }
      `;

      const response = await global
        .adminUserAdminAppTestRequest()
        .send({ query });

      expect(response.status).toBe(404);
      expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');
    });
  });

  describe('Mutation: createTarotDeck', () => {
    const validDeckData = {
      name: 'Test Creation Deck',
      locale: 'en',
      primaryAsset: '68ff7ebe04e43ae41ca0fc59',
      cardBackgroundAsset: '68ff7ebe04e43ae41ca0fc59',
      primaryColor: '#FF5733',
      description: 'A deck for testing creation',
      author: 'Test Creator',
      meta: ['creation', 'test'],
      layoutType: 'custom',
      layoutCount: 2,
      status: 'active',
    };

    it('should require admin session scope for deck creation', async () => {
      const mutation = `
        mutation CreateTarotDeck($input: CreateTarotDeckInput!) {
          createTarotDeck(input: $input) {
            success
            message
            deck {
              _id
              name
              locale
              primaryAsset {
                s3Key
              }
              cardBackgroundAsset {
                s3Key
              }
              user {
                id
                handle
              }
              primaryColor
              description
              author
              meta
              layoutType
              layoutCount
              status
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: validDeckData,
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
      expect(response.body.errors[0].message).toContain(
        'Admin session access required'
      );
    });

    it('should require admin session scope for deck creation with default values', async () => {
      const minimalDeckData = {
        name: 'Test Minimal Deck',
        locale: 'en',
        primaryAsset: '68ff7ebe04e43ae41ca0fc59',
        cardBackgroundAsset: '68ff7ebe04e43ae41ca0fc59',
        primaryColor: '#FF5733',
        description: 'A minimal deck',
        author: 'Minimal Author',
      };

      const mutation = `
        mutation CreateTarotDeck($input: CreateTarotDeckInput!) {
          createTarotDeck(input: $input) {
            success
            deck {
              name
              meta
              locale
              primaryAsset {
                s3Key
              }
              cardBackgroundAsset {
                s3Key
              }
              user {
                id
                handle
              }
              layoutType
              layoutCount
              status
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: minimalDeckData,
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
      expect(response.body.errors[0].message).toContain(
        'Admin session access required'
      );
    });

    it('should require admin session scope before validating deck data', async () => {
      const invalidDeckData = {
        ...validDeckData,
        primaryColor: 'not-a-hex-color',
        name: 'Test Invalid Color Deck',
      };

      const mutation = `
        mutation CreateTarotDeck($input: CreateTarotDeckInput!) {
          createTarotDeck(input: $input) {
            success
            deck {
              _id
              name
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: invalidDeckData,
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
      expect(response.body.errors[0].message).toContain(
        'Admin session access required'
      );
    });

    it('should require admin session scope for all deck creation attempts', async () => {
      const invalidDeckData = {
        ...validDeckData,
        cardBackgroundAsset: '68ff7ebe04e43ae41ca0fc59',
        name: 'Test Invalid Card Background URL Deck',
      };

      const mutation = `
        mutation CreateTarotDeck($input: CreateTarotDeckInput!) {
          createTarotDeck(input: $input) {
            success
            deck {
              _id
              name
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: invalidDeckData,
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
      expect(response.body.errors[0].message).toContain(
        'Admin session access required'
      );
    });

    it('should reject deck creation with duplicate name', async () => {
      // Create first deck
      await TarotDeck.create(validDeckData);

      const mutation = `
        mutation CreateTarotDeck($input: CreateTarotDeckInput!) {
          createTarotDeck(input: $input) {
            success
            deck {
              _id
              name
              locale
           }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: validDeckData,
        },
      });

      expect(response.status).toBe(409);
      expect(response.body.errors[0].extensions.code).toBe('CONFLICT');
      expect(response.body.errors[0].message).toContain(
        'A tarot deck with this name already exists'
      );
    });

    it('should reject unauthorized deck creation', async () => {
      const mutation = `
        mutation CreateTarotDeck($input: CreateTarotDeckInput!) {
          createTarotDeck(input: $input) {
            success
            deck {
              _id
              locale
              name
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: validDeckData,
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });
  });
});
