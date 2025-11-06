import { Types } from 'mongoose';
import { Spellbook } from '../models/Spellbook';
import { SpellbookPage } from '../models/SpellbookPage';

describe('SpellbookResolver GraphQL Endpoints', () => {
  beforeAll(async () => {
    // Create some test spellbooks
    await Spellbook.create([
      {
        title: 'Test Spellbook 1',
        description: 'A test spellbook',
        primaryAsset: '68ff7ebe04e43ae41ca0fc59',
        backgroundAsset: '68ff7ebe04e43ae41ca0fc59',
        user: global.adminUserId,
        primaryColor: '#FF5733',
        textColor: '#000000',
        font: 'Arial',
        status: 'active',
        visibility: 'public',
        meta: ['magic', 'beginner'],
        allowedUsers: [],
        pages: [],
      },
      {
        title: 'Test Spellbook 2',
        description: 'Another test spellbook',
        primaryAsset: '68ff7ebe04e43ae41ca0fc59',
        backgroundAsset: '68ff7ebe04e43ae41ca0fc59',
        user: global.adminUserId,
        primaryColor: '#33FF57',
        textColor: '#FFFFFF',
        font: 'Georgia',
        status: 'pending',
        visibility: 'private',
        meta: ['advanced', 'dark'],
        allowedUsers: [],
        pages: [],
      },
      {
        title: 'Test Spellbook 3 Deleted',
        description: 'A deleted test spellbook',
        primaryAsset: '68ff7ebe04e43ae41ca0fc59',
        backgroundAsset: '68ff7ebe04e43ae41ca0fc59',
        user: global.adminUserId,
        primaryColor: '#3357FF',
        textColor: '#000000',
        font: 'Times New Roman',
        status: 'deleted',
        visibility: 'private',
        meta: [],
        allowedUsers: [],
        pages: [],
      },
    ]);
  });

  describe('Query: spellbooks', () => {
    it('should return active spellbooks by default', async () => {
      const query = `
        query {
          spellbooks(status: "active") {
            id
            title
            description
            primaryAsset {
              s3Key
            }
            backgroundAsset {
              s3Key
            }
            user {
              id
              handle
            }
            primaryColor
            textColor
            font
            status
            visibility
            meta
            allowedUsers
            pages
          }
        }
      `;

      const response = await global
        .adminUserAdminAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.spellbooks).toBeDefined();

      const spellbooks = response.body.data.spellbooks;
      expect(spellbooks[0].status).toBe('active');

      // Check that all required fields are present
      expect(spellbooks[0]).toHaveProperty('title');
      expect(spellbooks[0]).toHaveProperty('status');
      expect(spellbooks[0]).toHaveProperty('visibility');
    });

    it('should return pending spellbooks when status is pending', async () => {
      const query = `
        query {
          spellbooks(status: "pending") {
            id
            title
            status
          }
        }
      `;
      const response = await global
        .adminUserAdminAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.spellbooks).toHaveLength(1);
      expect(response.body.data.spellbooks[0].status).toBe('pending');
    });

    it('should filter by visibility', async () => {
      const query = `
        query {
          spellbooks(visibility: "public") {
            id
            title
            visibility
          }
        }
      `;
      const response = await global
        .adminUserAdminAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.spellbooks[0].visibility).toBe('public');
    });

    it('should respect pagination parameters', async () => {
      const query = `
        query {
          spellbooks(limit: 1, offset: 0) {
            id
            title
          }
        }
      `;

      const response = await global
        .adminUserAdminAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.spellbooks).toHaveLength(1);
    });

    it('should reject unauthorized requests', async () => {
      const query = `
        query {
          spellbooks {
            id
            title
          }
        }
      `;

      const response = await global
        .basicUserBasicAppTestRequest()
        .send({ query });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Query: spellbook', () => {
    let testSpellbookId: string;

    beforeEach(async () => {
      const spellbook = await Spellbook.create({
        title: 'Test Single Spellbook',
        description: 'A single test spellbook',
        primaryAsset: '68ff7ebe04e43ae41ca0fc59',
        backgroundAsset: '68ff7ebe04e43ae41ca0fc59',
        user: global.adminUserId,
        primaryColor: '#FF5733',
        textColor: '#000000',
        font: 'Arial',
        status: 'active',
        visibility: 'public',
        meta: ['test'],
        allowedUsers: [],
        pages: [],
      });
      testSpellbookId = (spellbook._id as string).toString();
    });

    it('should return a single spellbook by ID', async () => {
      const query = `
        query {
          spellbook(id: "${testSpellbookId}") {
            id
            title
            description
            primaryAsset {
              s3Key
            }
            backgroundAsset {
              s3Key
            }
            user {
              id
              handle
            }
            primaryColor
            textColor
            font
            status
            visibility
            meta
          }
        }
      `;

      const response = await global
        .adminUserAdminAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.spellbook).toBeDefined();
      expect(response.body.data.spellbook.title).toBe('Test Single Spellbook');
      expect(response.body.data.spellbook.status).toBe('active');
    });

    it('should return error for non-existent spellbook', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const query = `
        query {
          spellbook(id: "${fakeId}") {
            id
            title
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

  describe('Query: spellbookPage', () => {
    let testSpellbookId: string;
    let testPageId: string;

    beforeEach(async () => {
      const spellbook = await Spellbook.create({
        title: 'Spellbook for Single Page',
        description: 'Test spellbook',
        user: global.adminUserId,
        status: 'active',
        visibility: 'public',
      });
      testSpellbookId = (spellbook._id as string).toString();

      const page = await SpellbookPage.create({
        title: 'Single Test Page',
        richText: 'Rich text content for single page',
        shortDescription: 'A single test page',
        user: global.adminUserId,
        spellbook: testSpellbookId,
        status: 'active',
        visibility: 'public',
      });
      testPageId = (page._id as string).toString();
    });

    it('should return a single spellbook page by ID', async () => {
      const query = `
        query {
          spellbookPage(id: "${testPageId}") {
            id
            title
            richText
            shortDescription
            user {
              id
              handle
            }
            spellbook
            status
            visibility
          }
        }
      `;

      const response = await global
        .adminUserAdminAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.spellbookPage).toBeDefined();
      expect(response.body.data.spellbookPage.title).toBe('Single Test Page');
      expect(response.body.data.spellbookPage.spellbook).toBe(testSpellbookId);
      expect(response.body.data.spellbookPage.status).toBe('active');
    });

    it('should return error for non-existent page', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const query = `
        query {
          spellbookPage(id: "${fakeId}") {
            id
            title
          }
        }
      `;

      const response = await global
        .adminUserAdminAppTestRequest()
        .send({ query });

      expect(response.status).toBe(404);
      expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');
    });

    it('should require admin access', async () => {
      const query = `
        query {
          spellbookPage(id: "${testPageId}") {
            id
            title
          }
        }
      `;

      const response = await global
        .basicUserBasicAppTestRequest()
        .send({ query });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Query: spellbookPages', () => {
    let testSpellbookId: string;

    beforeEach(async () => {
      const spellbook = await Spellbook.create({
        title: 'Spellbook with Pages',
        description: 'Test spellbook',
        user: global.adminUserId,
        status: 'active',
        visibility: 'public',
      });
      testSpellbookId = (spellbook._id as string).toString();

      const page = await SpellbookPage.create({
        title: 'Test Page 1',
        richText: 'Some rich text content',
        shortDescription: 'A test page',
        user: global.adminUserId,
        spellbook: testSpellbookId,
        status: 'active',
        visibility: 'public',
      });

      spellbook.pages = [page._id as Types.ObjectId];
      await spellbook.save();
    });

    it('should return pages for a spellbook', async () => {
      const query = `
        query {
          spellbookPages(spellbookId: "${testSpellbookId}") {
            id
            title
            richText
            shortDescription
            status
            visibility
            spellbook
          }
        }
      `;

      const response = await global
        .adminUserAdminAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.spellbookPages).toBeDefined();
      expect(response.body.data.spellbookPages).toHaveLength(1);
      expect(response.body.data.spellbookPages[0].title).toBe('Test Page 1');
    });

    it('should filter pages by status', async () => {
      await SpellbookPage.create({
        title: 'Test Page 2',
        richText: 'More content',
        user: global.adminUserId,
        spellbook: testSpellbookId,
        status: 'pending',
        visibility: 'public',
      });

      const query = `
        query {
          spellbookPages(spellbookId: "${testSpellbookId}", status: "pending") {
            id
            title
            status
          }
        }
      `;

      const response = await global
        .adminUserAdminAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.spellbookPages[0].status).toBe('pending');
    });

    it('should return error for non-existent spellbook', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const query = `
        query {
          spellbookPages(spellbookId: "${fakeId}") {
            id
            title
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

  describe('Mutation: createSpellbook', () => {
    const validSpellbookData = {
      title: 'Test Creation Spellbook',
      description: 'A spellbook for testing creation',
      primaryAsset: '68ff7ebe04e43ae41ca0fc59',
      backgroundAsset: '68ff7ebe04e43ae41ca0fc59',
      primaryColor: '#FF5733',
      textColor: '#000000',
      font: 'Arial',
      status: 'active',
      visibility: 'public',
      meta: ['creation', 'test'],
      allowedUsers: [],
    };

    it('should require admin access for spellbook creation', async () => {
      const mutation = `
        mutation CreateSpellbook($input: CreateSpellbookInput!) {
          createSpellbook(input: $input) {
            success
            message
            spellbook {
              id
              title
              description
              status
              visibility
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: validSpellbookData,
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
      expect(response.body.errors[0].message).toContain(
        'Admin session access required'
      );
    });

    it('should create a spellbook with valid data', async () => {
      const mutation = `
        mutation CreateSpellbook($input: CreateSpellbookInput!) {
          createSpellbook(input: $input) {
            success
            message
            spellbook {
              id
              title
              description
              primaryColor
              textColor
              font
              status
              visibility
              meta
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: validSpellbookData,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.createSpellbook.success).toBe(true);
      expect(response.body.data.createSpellbook.spellbook.title).toBe(
        'Test Creation Spellbook'
      );
      expect(response.body.data.createSpellbook.spellbook.status).toBe(
        'active'
      );
    });

    it('should create spellbook with default values', async () => {
      const minimalData = {
        title: 'Minimal Spellbook',
        description: 'Minimal description',
      };

      const mutation = `
        mutation CreateSpellbook($input: CreateSpellbookInput!) {
          createSpellbook(input: $input) {
            success
            spellbook {
              title
              status
              visibility
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: minimalData,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.createSpellbook.success).toBe(true);
      expect(response.body.data.createSpellbook.spellbook.status).toBe(
        'pending'
      );
      expect(response.body.data.createSpellbook.spellbook.visibility).toBe(
        'private'
      );
    });
  });

  describe('Mutation: updateSpellbook', () => {
    let testSpellbookId: string;

    beforeEach(async () => {
      const spellbook = await Spellbook.create({
        title: 'Original Title',
        description: 'Original description',
        user: global.adminUserId,
        status: 'pending',
        visibility: 'private',
      });
      testSpellbookId = (spellbook._id as string).toString();
    });

    it('should require admin access for updating', async () => {
      const mutation = `
        mutation UpdateSpellbook($id: ID!, $input: UpdateSpellbookInput!) {
          updateSpellbook(id: $id, input: $input) {
            success
            message
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          id: testSpellbookId,
          input: { title: 'Updated Title' },
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });

    it('should update spellbook fields', async () => {
      const mutation = `
        mutation UpdateSpellbook($id: ID!, $input: UpdateSpellbookInput!) {
          updateSpellbook(id: $id, input: $input) {
            success
            message
            spellbook {
              id
              title
              description
              status
              visibility
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          id: testSpellbookId,
          input: {
            title: 'Updated Title',
            description: 'Updated description',
            status: 'active',
            visibility: 'public',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.updateSpellbook.success).toBe(true);
      expect(response.body.data.updateSpellbook.spellbook.title).toBe(
        'Updated Title'
      );
      expect(response.body.data.updateSpellbook.spellbook.status).toBe(
        'active'
      );
    });

    it('should return error for non-existent spellbook', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const mutation = `
        mutation UpdateSpellbook($id: ID!, $input: UpdateSpellbookInput!) {
          updateSpellbook(id: $id, input: $input) {
            success
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          id: fakeId,
          input: { title: 'Updated' },
        },
      });

      expect(response.status).toBe(404);
      expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');
    });
  });

  describe('Mutation: createSpellbookPage', () => {
    let testSpellbookId: string;

    beforeEach(async () => {
      const spellbook = await Spellbook.create({
        title: 'Spellbook for Pages',
        description: 'Test spellbook',
        user: global.adminUserId,
        status: 'active',
        visibility: 'public',
      });
      testSpellbookId = (spellbook._id as string).toString();
    });

    const validPageData = {
      title: 'Test Page',
      richText: 'Some rich text content here',
      shortDescription: 'A test page description',
      primaryAsset: '68ff7ebe04e43ae41ca0fc59',
      backgroundAsset: '68ff7ebe04e43ae41ca0fc59',
      font: 'Arial',
      backgroundColor: '#FFFFFF',
      textColor: '#000000',
      primaryColor: '#FF5733',
      status: 'active',
      visibility: 'public',
      meta: ['test', 'page'],
    };

    it('should require admin access for page creation', async () => {
      const mutation = `
        mutation CreateSpellbookPage($input: CreateSpellbookPageInput!) {
          createSpellbookPage(input: $input) {
            success
            message
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            ...validPageData,
            spellbook: testSpellbookId,
          },
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });

    it('should create a page with required spellbook', async () => {
      const mutation = `
        mutation CreateSpellbookPage($input: CreateSpellbookPageInput!) {
          createSpellbookPage(input: $input) {
            success
            message
            spellbookPage {
              id
              title
              richText
              shortDescription
              spellbook
              status
              visibility
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            ...validPageData,
            spellbook: testSpellbookId,
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.createSpellbookPage.success).toBe(true);
      expect(response.body.data.createSpellbookPage.spellbookPage.title).toBe(
        'Test Page'
      );
      expect(
        response.body.data.createSpellbookPage.spellbookPage.spellbook
      ).toBe(testSpellbookId);
    });

    it('should return error for non-existent spellbook', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const mutation = `
        mutation CreateSpellbookPage($input: CreateSpellbookPageInput!) {
          createSpellbookPage(input: $input) {
            success
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            ...validPageData,
            spellbook: fakeId,
          },
        },
      });

      expect(response.status).toBe(404);
      expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');
    });

    it('should add page to spellbook pages array', async () => {
      const mutation = `
        mutation CreateSpellbookPage($input: CreateSpellbookPageInput!) {
          createSpellbookPage(input: $input) {
            success
            spellbookPage {
              id
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            ...validPageData,
            spellbook: testSpellbookId,
          },
        },
      });

      expect(response.status).toBe(200);

      // Verify page was added to spellbook
      const spellbook = await Spellbook.findById(testSpellbookId);
      expect(spellbook?.pages).toHaveLength(1);
    });
  });

  describe('Mutation: updateSpellbookPage', () => {
    let testSpellbookId: string;
    let testPageId: string;

    beforeEach(async () => {
      const spellbook = await Spellbook.create({
        title: 'Spellbook for Page Updates',
        user: global.adminUserId,
        status: 'active',
        visibility: 'public',
      });
      testSpellbookId = (spellbook._id as string).toString();

      const page = await SpellbookPage.create({
        title: 'Original Page Title',
        richText: 'Original content',
        user: global.adminUserId,
        spellbook: testSpellbookId,
        status: 'pending',
        visibility: 'private',
      });
      testPageId = (page._id as string).toString();
    });

    it('should require admin access for updating', async () => {
      const mutation = `
        mutation UpdateSpellbookPage($id: ID!, $input: UpdateSpellbookPageInput!) {
          updateSpellbookPage(id: $id, input: $input) {
            success
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          id: testPageId,
          input: { title: 'Updated Title' },
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });

    it('should update page fields', async () => {
      const mutation = `
        mutation UpdateSpellbookPage($id: ID!, $input: UpdateSpellbookPageInput!) {
          updateSpellbookPage(id: $id, input: $input) {
            success
            message
            spellbookPage {
              id
              title
              richText
              status
              visibility
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          id: testPageId,
          input: {
            title: 'Updated Page Title',
            richText: 'Updated content',
            status: 'active',
            visibility: 'public',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.updateSpellbookPage.success).toBe(true);
      expect(response.body.data.updateSpellbookPage.spellbookPage.title).toBe(
        'Updated Page Title'
      );
      expect(response.body.data.updateSpellbookPage.spellbookPage.status).toBe(
        'active'
      );
    });

    it('should return error for non-existent page', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const mutation = `
        mutation UpdateSpellbookPage($id: ID!, $input: UpdateSpellbookPageInput!) {
          updateSpellbookPage(id: $id, input: $input) {
            success
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          id: fakeId,
          input: { title: 'Updated' },
        },
      });

      expect(response.status).toBe(404);
      expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');
    });
  });

  describe('Mutation: softDeleteSpellbook', () => {
    let testSpellbookId: string;

    beforeEach(async () => {
      const spellbook = await Spellbook.create({
        title: 'Spellbook to Soft Delete',
        user: global.adminUserId,
        status: 'active',
        visibility: 'public',
      });
      testSpellbookId = (spellbook._id as string).toString();
    });

    it('should require admin access', async () => {
      const mutation = `
        mutation SoftDeleteSpellbook($id: ID!) {
          softDeleteSpellbook(id: $id) {
            success
            message
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: { id: testSpellbookId },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });

    it('should set status to deleted', async () => {
      const mutation = `
        mutation SoftDeleteSpellbook($id: ID!) {
          softDeleteSpellbook(id: $id) {
            success
            message
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: { id: testSpellbookId },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.softDeleteSpellbook.success).toBe(true);

      // Verify status changed
      const spellbook = await Spellbook.findById(testSpellbookId);
      expect(spellbook?.status).toBe('deleted');
    });
  });

  describe('Mutation: hardDeleteSpellbook', () => {
    let testSpellbookId: string;
    let testPageId: string;

    beforeEach(async () => {
      const spellbook = await Spellbook.create({
        title: 'Spellbook to Hard Delete',
        user: global.adminUserId,
        status: 'active',
        visibility: 'public',
      });
      testSpellbookId = (spellbook._id as string).toString();

      const page = await SpellbookPage.create({
        title: 'Page to be deleted',
        user: global.adminUserId,
        spellbook: testSpellbookId,
        status: 'active',
        visibility: 'public',
      });
      testPageId = (page._id as Types.ObjectId).toString();

      spellbook.pages = [page._id as Types.ObjectId];
      await spellbook.save();
    });

    it('should require admin access', async () => {
      const mutation = `
        mutation HardDeleteSpellbook($id: ID!) {
          hardDeleteSpellbook(id: $id) {
            success
            message
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: { id: testSpellbookId },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });

    it('should permanently delete spellbook and all pages', async () => {
      const mutation = `
        mutation HardDeleteSpellbook($id: ID!) {
          hardDeleteSpellbook(id: $id) {
            success
            message
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: { id: testSpellbookId },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.hardDeleteSpellbook.success).toBe(true);

      // Verify spellbook was deleted
      const spellbook = await Spellbook.findById(testSpellbookId);
      expect(spellbook).toBeNull();

      // Verify pages were deleted
      const page = await SpellbookPage.findById(testPageId);
      expect(page).toBeNull();
    });
  });

  describe('Mutation: softDeleteSpellbookPage', () => {
    let testSpellbookId: string;
    let testPageId: string;

    beforeEach(async () => {
      const spellbook = await Spellbook.create({
        title: 'Spellbook',
        user: global.adminUserId,
        status: 'active',
        visibility: 'public',
      });
      testSpellbookId = (spellbook._id as string).toString();

      const page = await SpellbookPage.create({
        title: 'Page to Soft Delete',
        user: global.adminUserId,
        spellbook: testSpellbookId,
        status: 'active',
        visibility: 'public',
      });
      testPageId = (page._id as string).toString();
    });

    it('should require admin access', async () => {
      const mutation = `
        mutation SoftDeleteSpellbookPage($id: ID!) {
          softDeleteSpellbookPage(id: $id) {
            success
            message
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: { id: testPageId },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });

    it('should set status to deleted', async () => {
      const mutation = `
        mutation SoftDeleteSpellbookPage($id: ID!) {
          softDeleteSpellbookPage(id: $id) {
            success
            message
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: { id: testPageId },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.softDeleteSpellbookPage.success).toBe(true);

      // Verify status changed
      const page = await SpellbookPage.findById(testPageId);
      expect(page?.status).toBe('deleted');
    });
  });

  describe('Mutation: hardDeleteSpellbookPage', () => {
    let testSpellbookId: string;
    let testPageId: string;

    beforeEach(async () => {
      const spellbook = await Spellbook.create({
        title: 'Spellbook',
        user: global.adminUserId,
        status: 'active',
        visibility: 'public',
      });
      testSpellbookId = (spellbook._id as string).toString();

      const page = await SpellbookPage.create({
        title: 'Page to Hard Delete',
        user: global.adminUserId,
        spellbook: testSpellbookId,
        status: 'active',
        visibility: 'public',
      });
      testPageId = (page._id as Types.ObjectId).toString();

      spellbook.pages = [page._id as Types.ObjectId];
      await spellbook.save();
    });

    it('should require admin access', async () => {
      const mutation = `
        mutation HardDeleteSpellbookPage($id: ID!) {
          hardDeleteSpellbookPage(id: $id) {
            success
            message
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: { id: testPageId },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });

    it('should permanently delete page and remove from spellbook', async () => {
      const mutation = `
        mutation HardDeleteSpellbookPage($id: ID!) {
          hardDeleteSpellbookPage(id: $id) {
            success
            message
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: { id: testPageId },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.hardDeleteSpellbookPage.success).toBe(true);

      // Verify page was deleted
      const page = await SpellbookPage.findById(testPageId);
      expect(page).toBeNull();

      // Verify page was removed from spellbook
      const spellbook = await Spellbook.findById(testSpellbookId);
      expect(spellbook?.pages).toHaveLength(0);
    });
  });
});
