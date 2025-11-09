import { Types } from 'mongoose';
import { Coven } from '../models/Coven';
import { CovenRoster } from '../models/CovenRoster';

describe('CovenResolver GraphQL Endpoints', () => {
  let testCovenId: string;
  let privateCovenId: string;
  let basicUserCovenId: string;

  beforeAll(async () => {
    // Create test covens
    const coven1 = await Coven.create({
      locale: 'en-US',
      name: 'Test Coven 1',
      description: 'A public test coven',
      shortDescription: 'Public coven for testing',
      meta: ['nature', 'beginner'],
      privacy: 'public',
      status: 'active',
      user: global.adminUserId,
      tradition: 'Wiccan',
      structure: 'Hierarchical',
      practice: 'Traditional',
      maxMembers: 50,
      primaryColor: '#FF5733',
      secondaryColor: '#33FF57',
    });
    testCovenId = (coven1._id as Types.ObjectId).toString();

    const coven2 = await Coven.create({
      locale: 'en-US',
      name: 'Private Test Coven',
      description: 'A private test coven',
      shortDescription: 'Private coven',
      privacy: 'private',
      status: 'active',
      user: global.adminUserId,
      tradition: 'Eclectic',
      maxMembers: 20,
    });
    privateCovenId = (coven2._id as Types.ObjectId).toString();

    const coven3 = await Coven.create({
      locale: 'en-US',
      name: 'Basic User Coven',
      description: 'Coven owned by basic user',
      privacy: 'public',
      status: 'active',
      user: global.basicUserId,
      tradition: 'Druidic',
    });
    basicUserCovenId = (coven3._id as Types.ObjectId).toString();

    // Create roster entries
    await CovenRoster.create({
      coven: coven1._id,
      user: global.adminUserId,
      userRole: 'owner',
      userTitle: 'High Priestess',
      lastActive: new Date(),
    });

    await CovenRoster.create({
      coven: coven2._id,
      user: global.adminUserId,
      userRole: 'owner',
      lastActive: new Date(),
    });

    await CovenRoster.create({
      coven: coven3._id,
      user: global.basicUserId,
      userRole: 'owner',
      lastActive: new Date(),
    });
  });

  describe('Mutation: createCoven', () => {
    it('should create a coven with authenticated user', async () => {
      const mutation = `
        mutation CreateCoven($input: CreateCovenInput!) {
          createCoven(input: $input) {
            success
            message
            coven {
              id
              name
              description
              privacy
              status
              tradition
              user {
                id
              }
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            locale: 'en-US',
            name: 'New Test Coven',
            description: 'A newly created coven',
            shortDescription: 'New coven',
            privacy: 'public',
            tradition: 'Celtic',
            structure: 'Democratic',
            practice: 'Modern',
            maxMembers: 30,
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.createCoven.success).toBe(true);
      expect(response.body.data.createCoven.coven.name).toBe('New Test Coven');
      expect(response.body.data.createCoven.coven.status).toBe('active');
      expect(response.body.data.createCoven.coven.user.id).toBe(
        global.basicUserId
      );

      // Verify roster entry was created
      const roster = await CovenRoster.findOne({
        coven: new Types.ObjectId(response.body.data.createCoven.coven.id),
        user: new Types.ObjectId(global.basicUserId),
      });
      expect(roster).toBeDefined();
      expect(roster?.userRole).toBe('owner');
    });

    it('should fail without authentication', async () => {
      const mutation = `
        mutation CreateCoven($input: CreateCovenInput!) {
          createCoven(input: $input) {
            success
          }
        }
      `;

      const response = await global.testRequest.post('/graphql').send({
        query: mutation,
        variables: {
          input: {
            name: 'Unauthenticated Coven',
            privacy: 'public',
          },
        },
      });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });

    it('should validate privacy field', async () => {
      const mutation = `
        mutation CreateCoven($input: CreateCovenInput!) {
          createCoven(input: $input) {
            success
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            name: 'Invalid Privacy Coven',
            privacy: 'invalid',
          },
        },
      });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Mutation: updateCoven', () => {
    it('should allow owner to update their coven', async () => {
      const mutation = `
        mutation UpdateCoven($input: UpdateCovenInput!) {
          updateCoven(input: $input) {
            success
            message
            coven {
              id
              name
              description
              tradition
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            id: basicUserCovenId,
            name: 'Updated Coven Name',
            description: 'Updated description',
            tradition: 'Updated Tradition',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.updateCoven.success).toBe(true);
      expect(response.body.data.updateCoven.coven.name).toBe(
        'Updated Coven Name'
      );
      expect(response.body.data.updateCoven.coven.tradition).toBe(
        'Updated Tradition'
      );
    });

    it('should allow admin to update any coven', async () => {
      const mutation = `
        mutation UpdateCoven($input: UpdateCovenInput!) {
          updateCoven(input: $input) {
            success
            coven {
              name
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            id: basicUserCovenId,
            name: 'Admin Updated Name',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.updateCoven.success).toBe(true);
    });

    it('should not allow non-owner to update coven', async () => {
      const mutation = `
        mutation UpdateCoven($input: UpdateCovenInput!) {
          updateCoven(input: $input) {
            success
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            id: testCovenId, // Admin's coven
            name: 'Unauthorized Update',
          },
        },
      });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Mutation: softDeleteCoven', () => {
    it('should soft delete coven by owner', async () => {
      const coven = await Coven.create({
        name: 'To Be Deleted',
        privacy: 'public',
        status: 'active',
        user: global.basicUserId,
      });

      const mutation = `
        mutation SoftDeleteCoven($id: ID!) {
          softDeleteCoven(id: $id) {
            success
            message
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          id: (coven._id as Types.ObjectId).toString(),
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.softDeleteCoven.success).toBe(true);

      const updated = await Coven.findById(coven._id);
      expect(updated?.status).toBe('deleted');
    });
  });

  describe('Mutation: hardDeleteCoven', () => {
    it('should hard delete coven and its roster', async () => {
      const coven = await Coven.create({
        name: 'To Be Hard Deleted',
        privacy: 'public',
        status: 'active',
        user: global.basicUserId,
      });

      await CovenRoster.create({
        coven: coven._id,
        user: global.basicUserId,
        userRole: 'owner',
      });

      const mutation = `
        mutation HardDeleteCoven($id: ID!) {
          hardDeleteCoven(id: $id) {
            success
            message
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          id: (coven._id as Types.ObjectId).toString(),
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.hardDeleteCoven.success).toBe(true);

      const deleted = await Coven.findById(coven._id);
      expect(deleted).toBeNull();

      const rosterDeleted = await CovenRoster.findOne({ coven: coven._id });
      expect(rosterDeleted).toBeNull();
    });
  });

  describe('Mutation: joinCoven', () => {
    it('should allow user to join a coven', async () => {
      const mutation = `
        mutation JoinCoven($covenId: ID!) {
          joinCoven(covenId: $covenId) {
            success
            message
            rosterEntry {
              id
              userRole
              user {
                id
              }
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          covenId: testCovenId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.joinCoven.success).toBe(true);
      expect(response.body.data.joinCoven.rosterEntry.userRole).toBe('basic');
      expect(response.body.data.joinCoven.rosterEntry.user.id).toBe(
        global.basicUserId
      );
    });

    it('should prevent duplicate membership', async () => {
      const mutation = `
        mutation JoinCoven($covenId: ID!) {
          joinCoven(covenId: $covenId) {
            success
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          covenId: testCovenId,
        },
      });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('VALIDATION_ERROR');
      expect(response.body.errors[0].message).toContain('already a member');
    });

    it('should enforce max members limit', async () => {
      const smallCoven = await Coven.create({
        name: 'Small Coven',
        privacy: 'public',
        status: 'active',
        user: global.adminUserId,
        maxMembers: 1,
      });

      await CovenRoster.create({
        coven: smallCoven._id,
        user: global.adminUserId,
        userRole: 'owner',
      });

      const mutation = `
        mutation JoinCoven($covenId: ID!) {
          joinCoven(covenId: $covenId) {
            success
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          covenId: (smallCoven._id as Types.ObjectId).toString(),
        },
      });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('VALIDATION_ERROR');
      expect(response.body.errors[0].message).toContain(
        'maximum member capacity'
      );
    });
  });

  describe('Mutation: leaveCoven', () => {
    it('should allow member to leave coven', async () => {
      // First join
      await CovenRoster.create({
        coven: new Types.ObjectId(privateCovenId),
        user: new Types.ObjectId(global.basicUserId),
        userRole: 'basic',
      });

      const mutation = `
        mutation LeaveCoven($covenId: ID!) {
          leaveCoven(covenId: $covenId) {
            success
            message
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          covenId: privateCovenId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.leaveCoven.success).toBe(true);

      const roster = await CovenRoster.findOne({
        coven: new Types.ObjectId(privateCovenId),
        user: new Types.ObjectId(global.basicUserId),
      });
      expect(roster).toBeNull();
    });

    it('should prevent owner from leaving', async () => {
      const mutation = `
        mutation LeaveCoven($covenId: ID!) {
          leaveCoven(covenId: $covenId) {
            success
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          covenId: basicUserCovenId,
        },
      });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('VALIDATION_ERROR');
      expect(response.body.errors[0].message).toContain('Owners cannot leave');
    });
  });

  describe('Query: coven', () => {
    it('should get coven by ID', async () => {
      const query = `
        query GetCoven($id: ID!) {
          coven(id: $id) {
            id
            name
            description
            privacy
            status
            tradition
            structure
            practice
            user {
              id
              handle
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
        variables: {
          id: testCovenId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.coven).toBeDefined();
      expect(response.body.data.coven.id).toBe(testCovenId);
      expect(response.body.data.coven.name).toBe('Test Coven 1');
    });

    it('should return error for non-existent coven', async () => {
      const query = `
        query GetCoven($id: ID!) {
          coven(id: $id) {
            id
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
        variables: {
          id: '507f1f77bcf86cd799439011',
        },
      });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');
    });
  });

  describe('Query: covens', () => {
    it('should get all active covens with pagination', async () => {
      const query = `
        query GetCovens($limit: Int, $offset: Int, $status: String) {
          covens(limit: $limit, offset: $offset, status: $status) {
            id
            name
            privacy
            status
            tradition
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
      expect(response.body.data.covens).toBeDefined();
      expect(Array.isArray(response.body.data.covens)).toBe(true);
      expect(response.body.data.covens.length).toBeGreaterThan(0);
      expect(
        response.body.data.covens.every(
          (c: { status: string }) => c.status === 'active'
        )
      ).toBe(true);
    });

    it('should filter covens by tradition', async () => {
      const query = `
        query GetCovens($tradition: String) {
          covens(tradition: $tradition) {
            id
            tradition
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
        variables: {
          tradition: 'Wiccan',
        },
      });

      expect(response.status).toBe(200);
      expect(
        response.body.data.covens.every(
          (c: { tradition: string }) => c.tradition === 'Wiccan'
        )
      ).toBe(true);
    });

    it('should filter covens by user', async () => {
      const query = `
        query GetCovens($userId: ID) {
          covens(userId: $userId) {
            id
            user {
              id
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
        variables: {
          userId: global.basicUserId,
        },
      });

      expect(response.status).toBe(200);
      expect(
        response.body.data.covens.every(
          (c: { user: { id: string } }) => c.user.id === global.basicUserId
        )
      ).toBe(true);
    });

    it('should validate pagination limits', async () => {
      const query = `
        query GetCovens($limit: Int) {
          covens(limit: $limit) {
            id
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
        variables: {
          limit: 200,
        },
      });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Query: myCovenMemberships', () => {
    it('should get current user covens', async () => {
      const query = `
        query MyCovenMemberships {
          myCovenMemberships {
            id
            name
            user {
              id
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query,
      });

      expect(response.status).toBe(200);
      expect(response.body.data.myCovenMemberships).toBeDefined();
      expect(Array.isArray(response.body.data.myCovenMemberships)).toBe(true);
    });
  });

  describe('Query: covenRoster', () => {
    it('should get coven roster', async () => {
      const query = `
        query GetCovenRoster($covenId: ID!) {
          covenRoster(covenId: $covenId) {
            id
            userRole
            userTitle
            user {
              id
              handle
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
        variables: {
          covenId: testCovenId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.covenRoster).toBeDefined();
      expect(Array.isArray(response.body.data.covenRoster)).toBe(true);
      expect(response.body.data.covenRoster.length).toBeGreaterThan(0);
    });
  });

  describe('Mutation: updateCovenRoster', () => {
    it('should allow owner to update roster entry', async () => {
      const mutation = `
        mutation UpdateCovenRoster($input: UpdateCovenRosterInput!) {
          updateCovenRoster(input: $input) {
            success
            message
            rosterEntry {
              userTitle
              userCovenName
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            covenId: testCovenId,
            userId: global.adminUserId,
            userTitle: 'Supreme Leader',
            userCovenName: 'The Grand Master',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.updateCovenRoster.success).toBe(true);
      expect(response.body.data.updateCovenRoster.rosterEntry.userTitle).toBe(
        'Supreme Leader'
      );
    });

    it('should allow user to update their own entry', async () => {
      const mutation = `
        mutation UpdateCovenRoster($input: UpdateCovenRosterInput!) {
          updateCovenRoster(input: $input) {
            success
            rosterEntry {
              userCovenBio
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            covenId: testCovenId,
            userId: global.basicUserId,
            userCovenBio: 'My personal bio',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.updateCovenRoster.success).toBe(true);
    });

    it('should not allow non-owner to change roles', async () => {
      const mutation = `
        mutation UpdateCovenRoster($input: UpdateCovenRosterInput!) {
          updateCovenRoster(input: $input) {
            success
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            covenId: testCovenId,
            userId: global.basicUserId,
            userRole: 'owner',
          },
        },
      });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });
  });
});
