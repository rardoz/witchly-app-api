import { Types } from 'mongoose';
import { Category } from '../models/Category';
import { Market } from '../models/Market';

describe('MarketResolver GraphQL Endpoints', () => {
  let testCategoryId: string;
  let testMarketId: string;
  let secondMarketId: string;
  let pausedMarketId: string;

  beforeAll(async () => {
    // Create test category
    const category = await Category.create({
      entityId: new Types.ObjectId(),
      entityType: 'market',
      locale: 'en-US',
      categoryName: 'Test Category',
      categoryShortDescription: 'Category for market testing',
      priority: 1,
      user: global.adminUserId,
    });
    testCategoryId = (category._id as Types.ObjectId).toString();

    // Create active market product
    const market1 = await Market.create({
      name: 'Rose Quartz Crystal',
      shortDescription: 'Beautiful pink rose quartz',
      price: 19.99,
      currency: 'USD',
      status: 'active',
      category: testCategoryId,
      priority: 1,
      user: global.adminUserId,
      likes: [],
    });
    testMarketId = (market1._id as Types.ObjectId).toString();

    // Create second active market product
    const market2 = await Market.create({
      name: 'Amethyst Geode',
      shortDescription: 'Stunning purple amethyst geode',
      price: 45.0,
      currency: 'USD',
      status: 'active',
      category: testCategoryId,
      priority: 2,
      user: global.adminUserId,
      likes: [],
    });
    secondMarketId = (market2._id as Types.ObjectId).toString();

    // Create paused market product (should be hidden from non-admins)
    const market3 = await Market.create({
      name: 'Paused Product',
      shortDescription: 'This product is paused',
      price: 10.0,
      currency: 'USD',
      status: 'paused',
      category: testCategoryId,
      priority: 3,
      user: global.adminUserId,
      likes: [],
    });
    pausedMarketId = (market3._id as Types.ObjectId).toString();
  });

  describe('Mutation: createMarket', () => {
    it('should create a market product with admin user', async () => {
      const mutation = `
        mutation CreateMarket($input: CreateMarketInput!) {
          createMarket(input: $input) {
            success
            message
            market {
              id
              name
              shortDescription
              price
              currency
              status
              priority
              category {
                id
                categoryName
              }
              user {
                id
              }
              likes
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            name: 'Clear Quartz Point',
            shortDescription: 'Powerful clear quartz crystal point',
            price: 15.99,
            currency: 'USD',
            status: 'active',
            category: testCategoryId,
            priority: 10,
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.createMarket.success).toBe(true);
      expect(response.body.data.createMarket.market.name).toBe(
        'Clear Quartz Point'
      );
      expect(response.body.data.createMarket.market.price).toBe(15.99);
      expect(response.body.data.createMarket.market.status).toBe('active');
      expect(response.body.data.createMarket.market.category.id).toBe(
        testCategoryId
      );
      expect(response.body.data.createMarket.market.likes).toEqual([]);
    });

    it('should fail without admin scope', async () => {
      const mutation = `
        mutation CreateMarket($input: CreateMarketInput!) {
          createMarket(input: $input) {
            success
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            name: 'Unauthorized Product',
            price: 10.0,
            currency: 'USD',
            category: testCategoryId,
            priority: 1,
          },
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });

    it('should validate category exists', async () => {
      const mutation = `
        mutation CreateMarket($input: CreateMarketInput!) {
          createMarket(input: $input) {
            success
          }
        }
      `;

      const fakeCategory = new Types.ObjectId().toString();
      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            name: 'Invalid Category Product',
            price: 10.0,
            currency: 'USD',
            category: fakeCategory,
            priority: 1,
          },
        },
      });

      expect(response.status).toBe(404);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('not found');
    });

    it('should validate priority must be at least 1', async () => {
      const mutation = `
        mutation CreateMarket($input: CreateMarketInput!) {
          createMarket(input: $input) {
            success
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            name: 'Invalid Priority Product',
            price: 10.0,
            currency: 'USD',
            category: testCategoryId,
            priority: 0,
          },
        },
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Priority must be');
    });
  });

  describe('Mutation: updateMarket', () => {
    it('should update a market product with admin user', async () => {
      const mutation = `
        mutation UpdateMarket($input: UpdateMarketInput!) {
          updateMarket(input: $input) {
            success
            message
            market {
              id
              name
              price
              status
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            id: testMarketId,
            name: 'Updated Rose Quartz',
            price: 24.99,
            status: 'paused',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.updateMarket.success).toBe(true);
      expect(response.body.data.updateMarket.market.name).toBe(
        'Updated Rose Quartz'
      );
      expect(response.body.data.updateMarket.market.price).toBe(24.99);
      expect(response.body.data.updateMarket.market.status).toBe('paused');
    });

    it('should fail without admin scope', async () => {
      const mutation = `
        mutation UpdateMarket($input: UpdateMarketInput!) {
          updateMarket(input: $input) {
            success
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            id: testMarketId,
            name: 'Unauthorized Update',
          },
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });

    it('should return error for non-existent market product', async () => {
      const mutation = `
        mutation UpdateMarket($input: UpdateMarketInput!) {
          updateMarket(input: $input) {
            success
          }
        }
      `;

      const fakeId = new Types.ObjectId().toString();
      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            id: fakeId,
            name: 'Non-existent',
          },
        },
      });

      expect(response.status).toBe(404);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('not found');
    });
  });

  describe('Mutation: softDeleteMarket', () => {
    it('should soft delete a market product with admin user', async () => {
      const mutation = `
        mutation SoftDeleteMarket($id: ID!) {
          softDeleteMarket(id: $id) {
            success
            message
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          id: secondMarketId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.softDeleteMarket.success).toBe(true);

      // Verify soft deletion
      const product = await Market.findById(secondMarketId);
      expect(product).not.toBeNull();
      expect(product?.status).toBe('deleted');
    });

    it('should fail without admin scope', async () => {
      const mutation = `
        mutation SoftDeleteMarket($id: ID!) {
          softDeleteMarket(id: $id) {
            success
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          id: testMarketId,
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Mutation: hardDeleteMarket', () => {
    it('should hard delete a market product with admin user', async () => {
      const mutation = `
        mutation HardDeleteMarket($id: ID!) {
          hardDeleteMarket(id: $id) {
            success
            message
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          id: secondMarketId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.hardDeleteMarket.success).toBe(true);

      // Verify hard deletion
      const product = await Market.findById(secondMarketId);
      expect(product).toBeNull();
    });

    it('should fail without admin scope', async () => {
      const mutation = `
        mutation HardDeleteMarket($id: ID!) {
          hardDeleteMarket(id: $id) {
            success
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          id: testMarketId,
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Mutation: likeMarket', () => {
    it('should toggle like on a market product (add like)', async () => {
      const mutation = `
        mutation LikeMarket($marketId: ID!) {
          likeMarket(marketId: $marketId) {
            success
            message
            market {
              id
              likes
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          marketId: testMarketId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.likeMarket.success).toBe(true);
      expect(response.body.data.likeMarket.market.likes).toContain(
        global.basicUserId
      );
      expect(response.body.data.likeMarket.message).toContain('liked');
    });

    it('should toggle like on a market product (remove like)', async () => {
      const mutation = `
        mutation LikeMarket($marketId: ID!) {
          likeMarket(marketId: $marketId) {
            success
            message
            market {
              id
              likes
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          marketId: testMarketId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.likeMarket.success).toBe(true);
      expect(response.body.data.likeMarket.market.likes).not.toContain(
        global.basicUserId
      );
      expect(response.body.data.likeMarket.message).toContain('unliked');
    });

    it('should fail without authentication', async () => {
      const mutation = `
        mutation LikeMarket($marketId: ID!) {
          likeMarket(marketId: $marketId) {
            success
          }
        }
      `;

      const response = await global.testRequest.post('/graphql').send({
        query: mutation,
        variables: {
          marketId: testMarketId,
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Query: markets', () => {
    it('should retrieve only active products for non-admin users', async () => {
      const query = `
        query GetMarkets($limit: Int, $offset: Int, $categoryId: ID) {
          markets(limit: $limit, offset: $offset, categoryId: $categoryId) {
            id
            name
            status
            priority
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query,
        variables: {
          limit: 10,
          offset: 0,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.markets).toBeDefined();
      expect(Array.isArray(response.body.data.markets)).toBe(true);

      // All products should be active
      response.body.data.markets.forEach((product: { status: string }) => {
        expect(product.status).toBe('active');
      });

      // Should not include paused product
      const pausedProduct = response.body.data.markets.find(
        (p: { id: string }) => p.id === pausedMarketId
      );
      expect(pausedProduct).toBeUndefined();
    });

    it('should allow admin users to filter by status', async () => {
      const query = `
        query GetMarkets($status: String) {
          markets(status: $status) {
            id
            name
            status
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
        variables: {
          status: 'paused',
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.markets).toBeDefined();

      // All returned products should be paused
      response.body.data.markets.forEach((product: { status: string }) => {
        expect(product.status).toBe('paused');
      });

      // Should include the paused product
      const pausedProduct = response.body.data.markets.find(
        (p: { id: string }) => p.id === pausedMarketId
      );
      expect(pausedProduct).toBeDefined();
    });

    it('should filter by category', async () => {
      const query = `
        query GetMarkets($categoryId: ID) {
          markets(categoryId: $categoryId) {
            id
            category {
              id
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query,
        variables: {
          categoryId: testCategoryId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.markets).toBeDefined();
      response.body.data.markets.forEach(
        (product: { category: { id: string } }) => {
          expect(product.category.id).toBe(testCategoryId);
        }
      );
    });

    it('should order by priority ascending then createdAt descending', async () => {
      const query = `
        query GetMarkets {
          markets {
            id
            priority
            createdAt
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query,
      });

      expect(response.status).toBe(200);
      expect(response.body.data.markets).toBeDefined();
      expect(response.body.data.markets.length).toBeGreaterThan(0);

      // Verify ordering (priority ASC, then createdAt DESC)
      const products = response.body.data.markets;
      for (let i = 0; i < products.length - 1; i++) {
        const current = products[i];
        const next = products[i + 1];

        if (current.priority === next.priority) {
          // Same priority, createdAt should be descending
          expect(new Date(current.createdAt).getTime()).toBeGreaterThanOrEqual(
            new Date(next.createdAt).getTime()
          );
        } else {
          // Priority should be ascending
          expect(current.priority).toBeLessThanOrEqual(next.priority);
        }
      }
    });

    it('should validate pagination limits', async () => {
      const query = `
        query GetMarkets($limit: Int) {
          markets(limit: $limit) {
            id
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query,
        variables: {
          limit: 200,
        },
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('between 1 and 100');
    });
  });
});
