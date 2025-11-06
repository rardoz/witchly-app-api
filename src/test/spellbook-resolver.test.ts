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

      const response = await global.testRequest
        .post('/graphql')
        .send({ query });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });

    it('should allow admin users to see all spellbooks', async () => {
      const query = `
        query {
          spellbooks(limit: 100) {
            id
            title
            visibility
            user {
              id
            }
          }
        }
      `;

      const response = await global
        .adminUserAdminAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.spellbooks).toBeDefined();
      // Admin should see both public and private spellbooks
      const spellbooks = response.body.data.spellbooks;
      expect(spellbooks.length).toBeGreaterThan(0);
      const hasPrivate = spellbooks.some(
        (s: { visibility: string }) => s.visibility === 'private'
      );
      const hasPublic = spellbooks.some(
        (s: { visibility: string }) => s.visibility === 'public'
      );
      expect(hasPrivate || hasPublic).toBe(true);
    });

    it('should only show public spellbooks to non-admin users', async () => {
      // Create a public spellbook
      await Spellbook.create({
        title: 'Public Spellbook for Basic User',
        description: 'A public spellbook',
        user: global.adminUserId,
        status: 'active',
        visibility: 'public',
      });

      // Create a private spellbook owned by admin (should not be visible to basic user)
      await Spellbook.create({
        title: 'Private Spellbook Admin Owned',
        description: 'A private spellbook',
        user: global.adminUserId,
        status: 'active',
        visibility: 'private',
        allowedUsers: [],
      });

      const query = `
        query {
          spellbooks(limit: 100) {
            id
            title
            visibility
            user {
              id
            }
          }
        }
      `;

      const response = await global
        .basicUserBasicAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.spellbooks).toBeDefined();

      const spellbooks = response.body.data.spellbooks;
      // Non-admin should only see public spellbooks
      spellbooks.forEach((s: { visibility: string }) => {
        expect(s.visibility).toBe('public');
      });
    });

    it('should allow non-admin users to see their own private spellbooks', async () => {
      // Create a private spellbook owned by the basic user
      await Spellbook.create({
        title: 'My Private Spellbook',
        description: 'A private spellbook I own',
        user: global.basicUserId,
        status: 'active',
        visibility: 'private',
        allowedUsers: [],
      });

      const query = `
        query {
          spellbooks(limit: 100, visibility: "private") {
            id
            title
            visibility
            user {
              id
            }
          }
        }
      `;

      const response = await global
        .basicUserBasicAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.spellbooks).toBeDefined();

      const spellbooks = response.body.data.spellbooks;
      // Should find at least one private spellbook they own
      const ownedPrivate = spellbooks.find(
        (s: { user: { id: string }; visibility: string }) =>
          s.user.id === global.basicUserId && s.visibility === 'private'
      );
      expect(ownedPrivate).toBeDefined();
    });

    it('should allow non-admin users to see private spellbooks they are allowed to access', async () => {
      // Create a private spellbook with basic user in allowedUsers
      await Spellbook.create({
        title: 'Shared Private Spellbook',
        description: 'A private spellbook shared with basic user',
        user: global.adminUserId,
        status: 'active',
        visibility: 'private',
        allowedUsers: [new Types.ObjectId(global.basicUserId)],
      });

      const query = `
        query {
          spellbooks(limit: 100) {
            id
            title
            visibility
            allowedUsers
            user {
              id
            }
          }
        }
      `;

      const response = await global
        .basicUserBasicAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.spellbooks).toBeDefined();

      const spellbooks = response.body.data.spellbooks;
      // Should find the shared private spellbook
      const sharedSpellbook = spellbooks.find(
        (s: { title: string; visibility: string; allowedUsers: string[] }) =>
          s.title === 'Shared Private Spellbook' &&
          s.visibility === 'private' &&
          s.allowedUsers.includes(global.basicUserId)
      );
      expect(sharedSpellbook).toBeDefined();
    });

    it('should not allow non-admin users to see private spellbooks they do not own or have access to', async () => {
      // Create a private spellbook owned by admin without basic user in allowedUsers
      await Spellbook.create({
        title: 'Restricted Private Spellbook',
        description: 'A private spellbook basic user should not see',
        user: global.adminUserId,
        status: 'active',
        visibility: 'private',
        allowedUsers: [],
      });

      const query = `
        query {
          spellbooks(limit: 100) {
            id
            title
            visibility
            user {
              id
            }
          }
        }
      `;

      const response = await global
        .basicUserBasicAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.spellbooks).toBeDefined();

      const spellbooks = response.body.data.spellbooks;
      // Should NOT find the restricted private spellbook
      const restrictedSpellbook = spellbooks.find(
        (s: { title: string }) => s.title === 'Restricted Private Spellbook'
      );
      expect(restrictedSpellbook).toBeUndefined();
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

    it('should allow admin users to view any spellbook by ID', async () => {
      // Create a private spellbook owned by basic user
      const privateSpellbook = await Spellbook.create({
        title: 'Private Admin Test Spellbook',
        description: 'A private spellbook',
        user: global.basicUserId,
        status: 'active',
        visibility: 'private',
        allowedUsers: [],
      });

      const query = `
        query {
          spellbook(id: "${privateSpellbook._id}") {
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
      expect(response.body.data.spellbook).toBeDefined();
      expect(response.body.data.spellbook.title).toBe(
        'Private Admin Test Spellbook'
      );
    });

    it('should allow non-admin users to view public spellbooks by ID', async () => {
      const query = `
        query {
          spellbook(id: "${testSpellbookId}") {
            id
            title
            visibility
          }
        }
      `;

      const response = await global
        .basicUserBasicAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.spellbook).toBeDefined();
      expect(response.body.data.spellbook.visibility).toBe('public');
    });

    it('should allow non-admin users to view their own private spellbooks by ID', async () => {
      // Create a private spellbook owned by basic user
      const ownSpellbook = await Spellbook.create({
        title: 'My Own Private Spellbook',
        description: 'A private spellbook I own',
        user: global.basicUserId,
        status: 'active',
        visibility: 'private',
        allowedUsers: [],
      });

      const query = `
        query {
          spellbook(id: "${ownSpellbook._id}") {
            id
            title
            visibility
            user {
              id
            }
          }
        }
      `;

      const response = await global
        .basicUserBasicAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.spellbook).toBeDefined();
      expect(response.body.data.spellbook.title).toBe(
        'My Own Private Spellbook'
      );
      expect(response.body.data.spellbook.user.id).toBe(global.basicUserId);
    });

    it('should allow non-admin users to view private spellbooks they have access to', async () => {
      // Create a private spellbook with basic user in allowedUsers
      const sharedSpellbook = await Spellbook.create({
        title: 'Shared Private Spellbook',
        description: 'A private spellbook shared with me',
        user: global.adminUserId,
        status: 'active',
        visibility: 'private',
        allowedUsers: [new Types.ObjectId(global.basicUserId)],
      });

      const query = `
        query {
          spellbook(id: "${sharedSpellbook._id}") {
            id
            title
            visibility
            allowedUsers
          }
        }
      `;

      const response = await global
        .basicUserBasicAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.spellbook).toBeDefined();
      expect(response.body.data.spellbook.title).toBe(
        'Shared Private Spellbook'
      );
      expect(response.body.data.spellbook.allowedUsers).toContain(
        global.basicUserId
      );
    });

    it('should not allow non-admin users to view private spellbooks they do not own or have access to', async () => {
      // Create a private spellbook owned by admin without basic user in allowedUsers
      const restrictedSpellbook = await Spellbook.create({
        title: 'Restricted Private Spellbook',
        description: 'A private spellbook basic user should not see',
        user: global.adminUserId,
        status: 'active',
        visibility: 'private',
        allowedUsers: [],
      });

      const query = `
        query {
          spellbook(id: "${restrictedSpellbook._id}") {
            id
            title
            visibility
          }
        }
      `;

      const response = await global
        .basicUserBasicAppTestRequest()
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

    it('should allow admin users to view any spellbook page', async () => {
      // Create a private spellbook owned by basic user
      const privateSpellbook = await Spellbook.create({
        title: 'Private Spellbook',
        description: 'Private spellbook',
        user: global.basicUserId,
        status: 'active',
        visibility: 'private',
      });

      const privatePage = await SpellbookPage.create({
        title: 'Private Page',
        richText: 'Private content',
        user: global.basicUserId,
        spellbook: privateSpellbook._id,
        status: 'active',
        visibility: 'private',
      });

      const query = `
        query {
          spellbookPage(id: "${privatePage._id}") {
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
      expect(response.body.data.spellbookPage).toBeDefined();
      expect(response.body.data.spellbookPage.title).toBe('Private Page');
    });

    it('should allow non-admin users to view pages from public spellbooks', async () => {
      const query = `
        query {
          spellbookPage(id: "${testPageId}") {
            id
            title
            visibility
          }
        }
      `;

      const response = await global
        .basicUserBasicAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.spellbookPage).toBeDefined();
      expect(response.body.data.spellbookPage.title).toBe('Single Test Page');
    });

    it('should allow non-admin users to view pages from their own private spellbooks', async () => {
      // Create a private spellbook owned by basic user
      const ownSpellbook = await Spellbook.create({
        title: 'Own Private Spellbook',
        description: 'Own private spellbook',
        user: global.basicUserId,
        status: 'active',
        visibility: 'private',
      });

      const ownPage = await SpellbookPage.create({
        title: 'Own Private Page',
        richText: 'Own private content',
        user: global.basicUserId,
        spellbook: ownSpellbook._id,
        status: 'active',
        visibility: 'private',
      });

      const query = `
        query {
          spellbookPage(id: "${ownPage._id}") {
            id
            title
            visibility
          }
        }
      `;

      const response = await global
        .basicUserBasicAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.spellbookPage).toBeDefined();
      expect(response.body.data.spellbookPage.title).toBe('Own Private Page');
    });

    it('should allow non-admin users to view pages from private spellbooks they have access to', async () => {
      // Create a private spellbook with basic user in allowedUsers
      const sharedSpellbook = await Spellbook.create({
        title: 'Shared Private Spellbook',
        description: 'Shared private spellbook',
        user: global.adminUserId,
        status: 'active',
        visibility: 'private',
        allowedUsers: [new Types.ObjectId(global.basicUserId)],
      });

      const sharedPage = await SpellbookPage.create({
        title: 'Shared Private Page',
        richText: 'Shared private content',
        user: global.adminUserId,
        spellbook: sharedSpellbook._id,
        status: 'active',
        visibility: 'private',
        allowedUsers: [new Types.ObjectId(global.basicUserId)],
      });

      const query = `
        query {
          spellbookPage(id: "${sharedPage._id}") {
            id
            title
            visibility
          }
        }
      `;

      const response = await global
        .basicUserBasicAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.spellbookPage).toBeDefined();
      expect(response.body.data.spellbookPage.title).toBe(
        'Shared Private Page'
      );
    });

    it('should not allow non-admin users to view pages from private spellbooks they do not own or have access to', async () => {
      // Create a private spellbook owned by admin without basic user in allowedUsers
      const restrictedSpellbook = await Spellbook.create({
        title: 'Restricted Private Spellbook',
        description: 'Restricted spellbook',
        user: global.adminUserId,
        status: 'active',
        visibility: 'private',
        allowedUsers: [],
      });

      const restrictedPage = await SpellbookPage.create({
        title: 'Restricted Private Page',
        richText: 'Restricted content',
        user: global.adminUserId,
        spellbook: restrictedSpellbook._id,
        status: 'active',
        visibility: 'private',
      });

      const query = `
        query {
          spellbookPage(id: "${restrictedPage._id}") {
            id
            title
            visibility
          }
        }
      `;

      const response = await global
        .basicUserBasicAppTestRequest()
        .send({ query });

      expect(response.status).toBe(404);
      expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');
    });

    it('should not allow non-admin to view private page even if spellbook is public', async () => {
      // Create a public spellbook
      const publicSpellbook = await Spellbook.create({
        title: 'Public Spellbook',
        description: 'Public spellbook',
        user: global.adminUserId,
        status: 'active',
        visibility: 'public',
      });

      // Create a private page not owned by basic user and not in allowedUsers
      const privatePage = await SpellbookPage.create({
        title: 'Private Page in Public Spellbook',
        richText: 'Private content',
        user: global.adminUserId,
        spellbook: publicSpellbook._id,
        status: 'active',
        visibility: 'private',
        allowedUsers: [],
      });

      const query = `
        query {
          spellbookPage(id: "${privatePage._id}") {
            id
            title
            visibility
          }
        }
      `;

      const response = await global
        .basicUserBasicAppTestRequest()
        .send({ query });

      expect(response.status).toBe(404);
      expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');
    });

    it('should allow non-admin to view private page they own in public spellbook', async () => {
      // Create a public spellbook owned by admin
      const publicSpellbook = await Spellbook.create({
        title: 'Public Spellbook',
        description: 'Public spellbook',
        user: global.adminUserId,
        status: 'active',
        visibility: 'public',
      });

      // Create a private page owned by basic user
      const ownPrivatePage = await SpellbookPage.create({
        title: 'My Private Page in Public Spellbook',
        richText: 'My private content',
        user: global.basicUserId,
        spellbook: publicSpellbook._id,
        status: 'active',
        visibility: 'private',
      });

      const query = `
        query {
          spellbookPage(id: "${ownPrivatePage._id}") {
            id
            title
            visibility
          }
        }
      `;

      const response = await global
        .basicUserBasicAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.spellbookPage).toBeDefined();
      expect(response.body.data.spellbookPage.title).toBe(
        'My Private Page in Public Spellbook'
      );
    });

    it('should allow non-admin to view private page they have access to via page allowedUsers', async () => {
      // Create a public spellbook
      const publicSpellbook = await Spellbook.create({
        title: 'Public Spellbook',
        description: 'Public spellbook',
        user: global.adminUserId,
        status: 'active',
        visibility: 'public',
      });

      // Create a private page with basic user in page-level allowedUsers
      const sharedPage = await SpellbookPage.create({
        title: 'Shared Private Page',
        richText: 'Shared content',
        user: global.adminUserId,
        spellbook: publicSpellbook._id,
        status: 'active',
        visibility: 'private',
        allowedUsers: [new Types.ObjectId(global.basicUserId)],
      });

      const query = `
        query {
          spellbookPage(id: "${sharedPage._id}") {
            id
            title
            visibility
          }
        }
      `;

      const response = await global
        .basicUserBasicAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.spellbookPage).toBeDefined();
      expect(response.body.data.spellbookPage.title).toBe(
        'Shared Private Page'
      );
    });

    it('should not allow access if spellbook allows but page does not', async () => {
      // Create a private spellbook with basic user in spellbook allowedUsers
      const spellbook = await Spellbook.create({
        title: 'Accessible Spellbook',
        description: 'User has access to spellbook',
        user: global.adminUserId,
        status: 'active',
        visibility: 'private',
        allowedUsers: [new Types.ObjectId(global.basicUserId)],
      });

      // Create a private page WITHOUT basic user in page allowedUsers
      const restrictedPage = await SpellbookPage.create({
        title: 'Restricted Page in Accessible Spellbook',
        richText: 'Page user cannot see',
        user: global.adminUserId,
        spellbook: spellbook._id,
        status: 'active',
        visibility: 'private',
        allowedUsers: [], // Basic user NOT included
      });

      const query = `
        query {
          spellbookPage(id: "${restrictedPage._id}") {
            id
            title
            visibility
          }
        }
      `;

      const response = await global
        .basicUserBasicAppTestRequest()
        .send({ query });

      expect(response.status).toBe(404);
      expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');
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

    it('should allow admin users to view pages from any spellbook', async () => {
      // Create a private spellbook owned by basic user
      const privateSpellbook = await Spellbook.create({
        title: 'Private Spellbook',
        description: 'Private spellbook',
        user: global.basicUserId,
        status: 'active',
        visibility: 'private',
      });

      await SpellbookPage.create({
        title: 'Private Page',
        richText: 'Private content',
        user: global.basicUserId,
        spellbook: privateSpellbook._id,
        status: 'active',
        visibility: 'private',
      });

      const query = `
        query {
          spellbookPages(spellbookId: "${privateSpellbook._id}") {
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
      expect(response.body.data.spellbookPages).toBeDefined();
      expect(response.body.data.spellbookPages).toHaveLength(1);
      expect(response.body.data.spellbookPages[0].title).toBe('Private Page');
    });

    it('should allow non-admin users to view pages from public spellbooks', async () => {
      const query = `
        query {
          spellbookPages(spellbookId: "${testSpellbookId}") {
            id
            title
            visibility
          }
        }
      `;

      const response = await global
        .basicUserBasicAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.spellbookPages).toBeDefined();
      expect(response.body.data.spellbookPages).toHaveLength(1);
      expect(response.body.data.spellbookPages[0].title).toBe('Test Page 1');
    });

    it('should allow non-admin users to view pages from their own private spellbooks', async () => {
      // Create a private spellbook owned by basic user
      const ownSpellbook = await Spellbook.create({
        title: 'Own Private Spellbook',
        description: 'Own private spellbook',
        user: global.basicUserId,
        status: 'active',
        visibility: 'private',
      });

      await SpellbookPage.create({
        title: 'Own Private Page',
        richText: 'Own private content',
        user: global.basicUserId,
        spellbook: ownSpellbook._id,
        status: 'active',
        visibility: 'private',
      });

      const query = `
        query {
          spellbookPages(spellbookId: "${ownSpellbook._id}") {
            id
            title
            visibility
          }
        }
      `;

      const response = await global
        .basicUserBasicAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.spellbookPages).toBeDefined();
      expect(response.body.data.spellbookPages).toHaveLength(1);
      expect(response.body.data.spellbookPages[0].title).toBe(
        'Own Private Page'
      );
    });

    it('should allow non-admin users to view pages from private spellbooks they have access to', async () => {
      // Create a private spellbook with basic user in allowedUsers
      const sharedSpellbook = await Spellbook.create({
        title: 'Shared Private Spellbook',
        description: 'Shared private spellbook',
        user: global.adminUserId,
        status: 'active',
        visibility: 'private',
        allowedUsers: [new Types.ObjectId(global.basicUserId)],
      });

      await SpellbookPage.create({
        title: 'Shared Private Page',
        richText: 'Shared private content',
        user: global.adminUserId,
        spellbook: sharedSpellbook._id,
        status: 'active',
        visibility: 'private',
        allowedUsers: [new Types.ObjectId(global.basicUserId)],
      });

      const query = `
        query {
          spellbookPages(spellbookId: "${sharedSpellbook._id}") {
            id
            title
            visibility
          }
        }
      `;

      const response = await global
        .basicUserBasicAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.spellbookPages).toBeDefined();
      expect(response.body.data.spellbookPages).toHaveLength(1);
      expect(response.body.data.spellbookPages[0].title).toBe(
        'Shared Private Page'
      );
    });

    it('should not allow non-admin users to view pages from private spellbooks they do not own or have access to', async () => {
      // Create a private spellbook owned by admin without basic user in allowedUsers
      const restrictedSpellbook = await Spellbook.create({
        title: 'Restricted Private Spellbook',
        description: 'Restricted spellbook',
        user: global.adminUserId,
        status: 'active',
        visibility: 'private',
        allowedUsers: [],
      });

      await SpellbookPage.create({
        title: 'Restricted Private Page',
        richText: 'Restricted content',
        user: global.adminUserId,
        spellbook: restrictedSpellbook._id,
        status: 'active',
        visibility: 'private',
      });

      const query = `
        query {
          spellbookPages(spellbookId: "${restrictedSpellbook._id}") {
            id
            title
            visibility
          }
        }
      `;

      const response = await global
        .basicUserBasicAppTestRequest()
        .send({ query });

      expect(response.status).toBe(404);
      expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');
    });

    it('should filter out private pages even if spellbook is public', async () => {
      // Create a public spellbook
      const publicSpellbook = await Spellbook.create({
        title: 'Public Spellbook with Mixed Pages',
        description: 'Public spellbook',
        user: global.adminUserId,
        status: 'active',
        visibility: 'public',
      });

      // Create one public page and one private page
      await SpellbookPage.create({
        title: 'Public Page in Public Spellbook',
        richText: 'Public content',
        user: global.adminUserId,
        spellbook: publicSpellbook._id,
        status: 'active',
        visibility: 'public',
      });

      await SpellbookPage.create({
        title: 'Private Page in Public Spellbook',
        richText: 'Private content',
        user: global.adminUserId,
        spellbook: publicSpellbook._id,
        status: 'active',
        visibility: 'private',
        allowedUsers: [],
      });

      const query = `
        query {
          spellbookPages(spellbookId: "${publicSpellbook._id}") {
            id
            title
            visibility
          }
        }
      `;

      const response = await global
        .basicUserBasicAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.spellbookPages).toBeDefined();
      expect(response.body.data.spellbookPages).toHaveLength(1);
      expect(response.body.data.spellbookPages[0].title).toBe(
        'Public Page in Public Spellbook'
      );
    });

    it('should allow non-admin to see private pages they own in public spellbook', async () => {
      // Create a public spellbook owned by admin
      const publicSpellbook = await Spellbook.create({
        title: 'Public Spellbook',
        description: 'Public spellbook',
        user: global.adminUserId,
        status: 'active',
        visibility: 'public',
      });

      // Create a private page owned by basic user
      await SpellbookPage.create({
        title: 'My Private Page in Public Spellbook',
        richText: 'My private content',
        user: global.basicUserId,
        spellbook: publicSpellbook._id,
        status: 'active',
        visibility: 'private',
      });

      const query = `
        query {
          spellbookPages(spellbookId: "${publicSpellbook._id}") {
            id
            title
            visibility
          }
        }
      `;

      const response = await global
        .basicUserBasicAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.spellbookPages).toBeDefined();
      expect(response.body.data.spellbookPages).toHaveLength(1);
      expect(response.body.data.spellbookPages[0].title).toBe(
        'My Private Page in Public Spellbook'
      );
    });

    it('should allow non-admin to see private pages they have access to via allowedUsers', async () => {
      // Create a public spellbook
      const publicSpellbook = await Spellbook.create({
        title: 'Public Spellbook',
        description: 'Public spellbook',
        user: global.adminUserId,
        status: 'active',
        visibility: 'public',
      });

      // Create a private page with basic user in allowedUsers
      await SpellbookPage.create({
        title: 'Shared Private Page',
        richText: 'Shared content',
        user: global.adminUserId,
        spellbook: publicSpellbook._id,
        status: 'active',
        visibility: 'private',
        allowedUsers: [new Types.ObjectId(global.basicUserId)],
      });

      const query = `
        query {
          spellbookPages(spellbookId: "${publicSpellbook._id}") {
            id
            title
            visibility
          }
        }
      `;

      const response = await global
        .basicUserBasicAppTestRequest()
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.spellbookPages).toBeDefined();
      expect(response.body.data.spellbookPages).toHaveLength(1);
      expect(response.body.data.spellbookPages[0].title).toBe(
        'Shared Private Page'
      );
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

    it('should require write access for spellbook creation', async () => {
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

      expect(response.status).toBe(200);
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

    it('should allow non-admin users to update their own spellbooks', async () => {
      // Create a spellbook owned by basic user
      const ownSpellbook = await Spellbook.create({
        title: 'Own Spellbook',
        description: 'My spellbook',
        user: global.basicUserId,
        status: 'pending',
        visibility: 'private',
      });

      const mutation = `
        mutation UpdateSpellbook($id: ID!, $input: UpdateSpellbookInput!) {
          updateSpellbook(id: $id, input: $input) {
            success
            message
            spellbook {
              id
              title
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          id: (ownSpellbook._id as string).toString(),
          input: { title: 'Updated Own Spellbook' },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.updateSpellbook.success).toBe(true);
      expect(response.body.data.updateSpellbook.spellbook.title).toBe(
        'Updated Own Spellbook'
      );
    });

    it('should not allow non-admin users to update spellbooks they do not own', async () => {
      const mutation = `
        mutation UpdateSpellbook($id: ID!, $input: UpdateSpellbookInput!) {
          updateSpellbook(id: $id, input: $input) {
            success
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          id: testSpellbookId,
          input: { title: 'Trying to Update' },
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });

    it('should allow non-admin users to update their own spellbooks', async () => {
      // Create a spellbook owned by basic user
      const ownSpellbook = await Spellbook.create({
        title: 'Own Spellbook',
        description: 'My spellbook',
        user: global.basicUserId,
        status: 'pending',
        visibility: 'private',
      });

      const mutation = `
        mutation UpdateSpellbook($id: ID!, $input: UpdateSpellbookInput!) {
          updateSpellbook(id: $id, input: $input) {
            success
            message
            spellbook {
              id
              title
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          id: (ownSpellbook._id as string).toString(),
          input: { title: 'Updated Own Spellbook' },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.updateSpellbook.success).toBe(true);
      expect(response.body.data.updateSpellbook.spellbook.title).toBe(
        'Updated Own Spellbook'
      );
    });

    it('should not allow non-admin users to update spellbooks they do not own', async () => {
      const mutation = `
        mutation UpdateSpellbook($id: ID!, $input: UpdateSpellbookInput!) {
          updateSpellbook(id: $id, input: $input) {
            success
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          id: testSpellbookId,
          input: { title: 'Trying to Update' },
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
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

    it('should allow non-admin users to create pages in their own spellbooks', async () => {
      // Create a spellbook owned by basic user
      const ownSpellbook = await Spellbook.create({
        title: 'Own Spellbook',
        user: global.basicUserId,
        status: 'active',
        visibility: 'public',
      });

      const mutation = `
        mutation CreateSpellbookPage($input: CreateSpellbookPageInput!) {
          createSpellbookPage(input: $input) {
            success
            message
            spellbookPage {
              id
              title
              spellbook
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            ...validPageData,
            spellbook: (ownSpellbook._id as string).toString(),
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.createSpellbookPage.success).toBe(true);
      expect(response.body.data.createSpellbookPage.spellbookPage.title).toBe(
        'Test Page'
      );
    });

    it('should not allow non-admin users to create pages in spellbooks they do not own', async () => {
      const mutation = `
        mutation CreateSpellbookPage($input: CreateSpellbookPageInput!) {
          createSpellbookPage(input: $input) {
            success
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

    it('should allow non-admin users to update their own pages', async () => {
      // Create a spellbook and page owned by basic user
      const ownSpellbook = await Spellbook.create({
        title: 'Own Spellbook',
        user: global.basicUserId,
        status: 'active',
        visibility: 'public',
      });

      const ownPage = await SpellbookPage.create({
        title: 'Own Page',
        richText: 'My content',
        user: global.basicUserId,
        spellbook: ownSpellbook._id,
        status: 'pending',
        visibility: 'private',
      });

      const mutation = `
        mutation UpdateSpellbookPage($id: ID!, $input: UpdateSpellbookPageInput!) {
          updateSpellbookPage(id: $id, input: $input) {
            success
            message
            spellbookPage {
              id
              title
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          id: (ownPage._id as string).toString(),
          input: { title: 'Updated Own Page' },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.updateSpellbookPage.success).toBe(true);
      expect(response.body.data.updateSpellbookPage.spellbookPage.title).toBe(
        'Updated Own Page'
      );
    });

    it('should not allow non-admin users to update pages they do not own', async () => {
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
          input: { title: 'Trying to Update' },
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
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

    it('should allow non-admin users to soft delete their own spellbooks', async () => {
      const ownSpellbook = await Spellbook.create({
        title: 'Own Spellbook to Delete',
        user: global.basicUserId,
        status: 'active',
        visibility: 'public',
      });

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
        variables: { id: (ownSpellbook._id as string).toString() },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.softDeleteSpellbook.success).toBe(true);

      const deletedSpellbook = await Spellbook.findById(ownSpellbook._id);
      expect(deletedSpellbook?.status).toBe('deleted');
    });

    it('should not allow non-admin users to soft delete spellbooks they do not own', async () => {
      const mutation = `
        mutation SoftDeleteSpellbook($id: ID!) {
          softDeleteSpellbook(id: $id) {
            success
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

    it('should allow non-admin users to hard delete their own spellbooks', async () => {
      const ownSpellbook = await Spellbook.create({
        title: 'Own Spellbook to Hard Delete',
        user: global.basicUserId,
        status: 'active',
        visibility: 'public',
      });

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
        variables: { id: (ownSpellbook._id as string).toString() },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.hardDeleteSpellbook.success).toBe(true);

      const deletedSpellbook = await Spellbook.findById(ownSpellbook._id);
      expect(deletedSpellbook).toBeNull();
    });

    it('should not allow non-admin users to hard delete spellbooks they do not own', async () => {
      const mutation = `
        mutation HardDeleteSpellbook($id: ID!) {
          hardDeleteSpellbook(id: $id) {
            success
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

    it('should allow non-admin users to soft delete their own pages', async () => {
      const ownSpellbook = await Spellbook.create({
        title: 'Spellbook',
        user: global.basicUserId,
        status: 'active',
        visibility: 'public',
      });

      const ownPage = await SpellbookPage.create({
        title: 'Own Page to Soft Delete',
        user: global.basicUserId,
        spellbook: ownSpellbook._id,
        status: 'active',
        visibility: 'public',
      });

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
        variables: { id: (ownPage._id as string).toString() },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.softDeleteSpellbookPage.success).toBe(true);

      const deletedPage = await SpellbookPage.findById(ownPage._id);
      expect(deletedPage?.status).toBe('deleted');
    });

    it('should not allow non-admin users to soft delete pages they do not own', async () => {
      const mutation = `
        mutation SoftDeleteSpellbookPage($id: ID!) {
          softDeleteSpellbookPage(id: $id) {
            success
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

    it('should allow non-admin users to hard delete their own pages', async () => {
      const ownSpellbook = await Spellbook.create({
        title: 'Spellbook',
        user: global.basicUserId,
        status: 'active',
        visibility: 'public',
      });

      const ownPage = await SpellbookPage.create({
        title: 'Own Page to Hard Delete',
        user: global.basicUserId,
        spellbook: ownSpellbook._id,
        status: 'active',
        visibility: 'public',
      });

      ownSpellbook.pages = [ownPage._id as Types.ObjectId];
      await ownSpellbook.save();

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
        variables: { id: (ownPage._id as string).toString() },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.hardDeleteSpellbookPage.success).toBe(true);

      const deletedPage = await SpellbookPage.findById(ownPage._id);
      expect(deletedPage).toBeNull();

      const updatedSpellbook = await Spellbook.findById(ownSpellbook._id);
      expect(updatedSpellbook?.pages).toHaveLength(0);
    });

    it('should not allow non-admin users to hard delete pages they do not own', async () => {
      const mutation = `
        mutation HardDeleteSpellbookPage($id: ID!) {
          hardDeleteSpellbookPage(id: $id) {
            success
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
  });
});
