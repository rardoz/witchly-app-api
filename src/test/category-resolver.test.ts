import { Types } from 'mongoose';
import { Category } from '../models/Category';

describe('CategoryResolver GraphQL Endpoints', () => {
  let testCategoryId: string;
  let secondCategoryId: string;
  let pausedCategoryId: string;

  beforeAll(async () => {
    // Create test categories
    const category1 = await Category.create({
      entityId: new Types.ObjectId(),
      entityType: 'market',
      locale: 'en-US',
      categoryName: 'Crystals & Stones',
      categoryShortDescription: 'Beautiful crystals and healing stones',
      priority: 1,
      status: 'active',
      user: global.adminUserId,
    });
    testCategoryId = (category1._id as Types.ObjectId).toString();

    const category2 = await Category.create({
      entityId: new Types.ObjectId(),
      entityType: 'market',
      locale: 'en-US',
      categoryName: 'Tarot Decks',
      categoryShortDescription: 'Unique and beautiful tarot card decks',
      priority: 2,
      status: 'active',
      user: global.adminUserId,
    });
    secondCategoryId = (category2._id as Types.ObjectId).toString();

    const category3 = await Category.create({
      entityId: new Types.ObjectId(),
      entityType: 'market',
      locale: 'en-US',
      categoryName: 'Paused Category',
      categoryShortDescription: 'This category is paused',
      priority: 3,
      status: 'paused',
      user: global.adminUserId,
    });
    pausedCategoryId = (category3._id as Types.ObjectId).toString();
  });

  describe('Mutation: createCategory', () => {
    it('should create a category with admin user', async () => {
      const mutation = `
        mutation CreateCategory($input: CreateCategoryInput!) {
          createCategory(input: $input) {
            success
            message
            category {
              id
              entityType
              locale
              categoryName
              categoryShortDescription
              priority
              status
              user {
                id
              }
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            entityId: new Types.ObjectId().toString(),
            entityType: 'market',
            locale: 'en-US',
            categoryName: 'Herbs & Botanicals',
            categoryShortDescription: 'Fresh and dried magical herbs',
            priority: 3,
            status: 'active',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.createCategory.success).toBe(true);
      expect(response.body.data.createCategory.category.categoryName).toBe(
        'Herbs & Botanicals'
      );
      expect(response.body.data.createCategory.category.priority).toBe(3);
      expect(response.body.data.createCategory.category.status).toBe('active');
      expect(response.body.data.createCategory.category.user.id).toBe(
        global.adminUserId
      );
    });

    it('should create a category with color fields', async () => {
      const mutation = `
        mutation CreateCategory($input: CreateCategoryInput!) {
          createCategory(input: $input) {
            success
            message
            category {
              id
              categoryName
              primaryColor
              textColor
              backgroundColor
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            entityId: new Types.ObjectId().toString(),
            entityType: 'market',
            locale: 'en-US',
            categoryName: 'Colorful Category',
            priority: 1,
            primaryColor: '#FF5733',
            textColor: '#FFFFFF',
            backgroundColor: '#000000',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.createCategory.success).toBe(true);
      expect(response.body.data.createCategory.category.primaryColor).toBe(
        '#FF5733'
      );
      expect(response.body.data.createCategory.category.textColor).toBe(
        '#FFFFFF'
      );
      expect(response.body.data.createCategory.category.backgroundColor).toBe(
        '#000000'
      );
    });

    it('should accept 3-digit hex color codes', async () => {
      const mutation = `
        mutation CreateCategory($input: CreateCategoryInput!) {
          createCategory(input: $input) {
            success
            category {
              primaryColor
              textColor
              backgroundColor
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            entityId: new Types.ObjectId().toString(),
            entityType: 'market',
            locale: 'en-US',
            categoryName: 'Short Hex Colors',
            priority: 1,
            primaryColor: '#F53',
            textColor: '#FFF',
            backgroundColor: '#000',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.createCategory.success).toBe(true);
      expect(response.body.data.createCategory.category.primaryColor).toBe(
        '#F53'
      );
      expect(response.body.data.createCategory.category.textColor).toBe('#FFF');
      expect(response.body.data.createCategory.category.backgroundColor).toBe(
        '#000'
      );
    });

    it('should reject invalid primaryColor format', async () => {
      const mutation = `
        mutation CreateCategory($input: CreateCategoryInput!) {
          createCategory(input: $input) {
            success
            category {
              primaryColor
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            entityId: null,
            entityType: 'market',
            locale: 'en-US',
            categoryName: 'Invalid Color',
            priority: 1,
            primaryColor: 'red',
          },
        },
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain(
        'Primary color must be a valid hex color'
      );
    });

    it('should reject invalid textColor format', async () => {
      const mutation = `
        mutation CreateCategory($input: CreateCategoryInput!) {
          createCategory(input: $input) {
            success
            category {
              textColor
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            entityId: new Types.ObjectId().toString(),
            entityType: 'market',
            locale: 'en-US',
            categoryName: 'Invalid Text Color',
            priority: 1,
            textColor: '#GGGGGG',
          },
        },
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain(
        'Text color must be a valid hex color'
      );
    });

    it('should reject invalid backgroundColor format', async () => {
      const mutation = `
        mutation CreateCategory($input: CreateCategoryInput!) {
          createCategory(input: $input) {
            success
            category {
              backgroundColor
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            entityId: new Types.ObjectId().toString(),
            entityType: 'market',
            locale: 'en-US',
            categoryName: 'Invalid Background Color',
            priority: 1,
            backgroundColor: 'blue',
          },
        },
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain(
        'Background color must be a valid hex color'
      );
    });

    it('should create a category with paused status', async () => {
      const mutation = `
        mutation CreateCategory($input: CreateCategoryInput!) {
          createCategory(input: $input) {
            success
            message
            category {
              id
              categoryName
              status
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            entityId: new Types.ObjectId().toString(),
            entityType: 'market',
            locale: 'en-US',
            categoryName: 'Paused Herbs',
            priority: 4,
            status: 'paused',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.createCategory.success).toBe(true);
      expect(response.body.data.createCategory.category.status).toBe('paused');
    });

    it('should validate status must be valid value', async () => {
      const mutation = `
        mutation CreateCategory($input: CreateCategoryInput!) {
          createCategory(input: $input) {
            success
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            entityId: new Types.ObjectId().toString(),
            entityType: 'market',
            locale: 'en-US',
            categoryName: 'Invalid Status',
            priority: 1,
            status: 'invalid',
          },
        },
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Status must be');
    });

    it('should fail without admin scope', async () => {
      const mutation = `
        mutation CreateCategory($input: CreateCategoryInput!) {
          createCategory(input: $input) {
            success
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            entityId: new Types.ObjectId().toString(),
            entityType: 'market',
            locale: 'en-US',
            categoryName: 'Unauthorized Category',
            priority: 1,
          },
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });

    it('should validate priority must be at least 1', async () => {
      const mutation = `
        mutation CreateCategory($input: CreateCategoryInput!) {
          createCategory(input: $input) {
            success
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            entityId: new Types.ObjectId().toString(),
            entityType: 'market',
            locale: 'en-US',
            categoryName: 'Invalid Priority',
            priority: 0,
          },
        },
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Priority must be');
    });
  });

  describe('Mutation: updateCategory', () => {
    it('should update a category with admin user', async () => {
      const mutation = `
        mutation UpdateCategory($input: UpdateCategoryInput!) {
          updateCategory(input: $input) {
            success
            message
            category {
              id
              categoryName
              priority
              status
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            id: testCategoryId,
            categoryName: 'Updated Crystals & Gems',
            priority: 5,
            status: 'paused',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.updateCategory.success).toBe(true);
      expect(response.body.data.updateCategory.category.categoryName).toBe(
        'Updated Crystals & Gems'
      );
      expect(response.body.data.updateCategory.category.priority).toBe(5);
      expect(response.body.data.updateCategory.category.status).toBe('paused');
    });

    it('should update category color fields', async () => {
      const mutation = `
        mutation UpdateCategory($input: UpdateCategoryInput!) {
          updateCategory(input: $input) {
            success
            category {
              id
              primaryColor
              textColor
              backgroundColor
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            id: testCategoryId,
            primaryColor: '#00FF00',
            textColor: '#333333',
            backgroundColor: '#F0F0F0',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.updateCategory.success).toBe(true);
      expect(response.body.data.updateCategory.category.primaryColor).toBe(
        '#00FF00'
      );
      expect(response.body.data.updateCategory.category.textColor).toBe(
        '#333333'
      );
      expect(response.body.data.updateCategory.category.backgroundColor).toBe(
        '#F0F0F0'
      );
    });

    it('should validate primaryColor on update', async () => {
      const mutation = `
        mutation UpdateCategory($input: UpdateCategoryInput!) {
          updateCategory(input: $input) {
            success
            category {
              primaryColor
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            id: testCategoryId,
            primaryColor: 'not-a-color',
          },
        },
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain(
        'Primary color must be a valid hex color'
      );
    });

    it('should update category status to deleted', async () => {
      const mutation = `
        mutation UpdateCategory($input: UpdateCategoryInput!) {
          updateCategory(input: $input) {
            success
            message
            category {
              id
              status
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            id: testCategoryId,
            status: 'deleted',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.updateCategory.success).toBe(true);
      expect(response.body.data.updateCategory.category.status).toBe('deleted');
    });

    it('should validate status on update', async () => {
      const mutation = `
        mutation UpdateCategory($input: UpdateCategoryInput!) {
          updateCategory(input: $input) {
            success
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            id: testCategoryId,
            status: 'invalid-status',
          },
        },
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Status must be');
    });

    it('should fail without admin scope', async () => {
      const mutation = `
        mutation UpdateCategory($input: UpdateCategoryInput!) {
          updateCategory(input: $input) {
            success
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            id: testCategoryId,
            categoryName: 'Unauthorized Update',
          },
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });

    it('should return error for non-existent category', async () => {
      const mutation = `
        mutation UpdateCategory($input: UpdateCategoryInput!) {
          updateCategory(input: $input) {
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
            categoryName: 'Non-existent',
          },
        },
      });

      expect(response.status).toBe(404);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('not found');
    });
  });

  describe('Mutation: deleteCategory', () => {
    it('should delete a category with admin user', async () => {
      const mutation = `
        mutation DeleteCategory($id: ID!) {
          deleteCategory(id: $id) {
            success
            message
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          id: secondCategoryId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.deleteCategory.success).toBe(true);

      // Verify deletion
      const deleted = await Category.findById(secondCategoryId);
      expect(deleted).toBeNull();
    });

    it('should fail without admin scope', async () => {
      const mutation = `
        mutation DeleteCategory($id: ID!) {
          deleteCategory(id: $id) {
            success
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          id: testCategoryId,
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Query: categories', () => {
    it('should retrieve only active categories for non-admin users', async () => {
      const query = `
        query GetCategories($limit: Int, $offset: Int) {
          categories(limit: $limit, offset: $offset) {
            id
            categoryName
            status
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
      expect(response.body.data.categories).toBeDefined();
      expect(Array.isArray(response.body.data.categories)).toBe(true);

      // All categories should be active
      response.body.data.categories.forEach((category: { status: string }) => {
        expect(category.status).toBe('active');
      });

      // Should not include paused category
      const pausedCategory = response.body.data.categories.find(
        (c: { id: string }) => c.id === pausedCategoryId
      );
      expect(pausedCategory).toBeUndefined();
    });

    it('should allow admin users to filter by status', async () => {
      const query = `
        query GetCategories($status: String) {
          categories(status: $status) {
            id
            categoryName
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
      expect(response.body.data.categories).toBeDefined();

      // All returned categories should be paused
      response.body.data.categories.forEach((category: { status: string }) => {
        expect(category.status).toBe('paused');
      });

      // Should include the paused category
      const pausedCategory = response.body.data.categories.find(
        (c: { id: string }) => c.id === pausedCategoryId
      );
      expect(pausedCategory).toBeDefined();
    });

    it('should retrieve categories ordered by priority', async () => {
      const query = `
        query GetCategories($limit: Int, $offset: Int, $locale: String) {
          categories(limit: $limit, offset: $offset, locale: $locale) {
            id
            categoryName
            priority
            locale
            entityType
            status
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query,
        variables: {
          limit: 10,
          offset: 0,
          locale: 'en-US',
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.categories).toBeDefined();
      expect(Array.isArray(response.body.data.categories)).toBe(true);
      expect(response.body.data.categories.length).toBeGreaterThan(0);

      // Verify ordering by priority
      const priorities = response.body.data.categories.map(
        (c: { priority: number }) => c.priority
      );
      const sortedPriorities = [...priorities].sort((a, b) => a - b);
      expect(priorities).toEqual(sortedPriorities);
    });

    it('should return color fields in category query', async () => {
      // Create a category with colors
      const createMutation = `
        mutation CreateCategory($input: CreateCategoryInput!) {
          createCategory(input: $input) {
            success
            category {
              id
            }
          }
        }
      `;

      const createResponse = await global.adminUserAdminAppTestRequest().send({
        query: createMutation,
        variables: {
          input: {
            entityId: new Types.ObjectId().toString(),
            entityType: 'market',
            locale: 'en-US',
            categoryName: 'Test Color Query',
            priority: 1,
            status: 'active',
            primaryColor: '#FF5733',
            textColor: '#FFFFFF',
            backgroundColor: '#000000',
          },
        },
      });

      const categoryId = createResponse.body.data.createCategory.category.id;

      // Query for the category with color fields
      const query = `
        query GetCategories {
          categories {
            id
            categoryName
            primaryColor
            textColor
            backgroundColor
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query,
      });

      expect(response.status).toBe(200);
      const category = response.body.data.categories.find(
        (c: { id: string }) => c.id === categoryId
      );
      expect(category).toBeDefined();
      expect(category.primaryColor).toBe('#FF5733');
      expect(category.textColor).toBe('#FFFFFF');
      expect(category.backgroundColor).toBe('#000000');
    });

    it('should filter by locale', async () => {
      const query = `
        query GetCategories($locale: String) {
          categories(locale: $locale) {
            id
            locale
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query,
        variables: {
          locale: 'en-US',
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.categories).toBeDefined();
      response.body.data.categories.forEach((category: { locale: string }) => {
        expect(category.locale).toBe('en-us'); // Lowercased in DB
      });
    });

    it('should validate pagination limits', async () => {
      const query = `
        query GetCategories($limit: Int) {
          categories(limit: $limit) {
            id
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query,
        variables: {
          limit: 150,
        },
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('between 1 and 100');
    });
  });
});
