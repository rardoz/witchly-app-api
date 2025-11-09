import { Types } from 'mongoose';
import { Coven } from '../models/Coven';
import { Event } from '../models/Event';

describe('EventResolver GraphQL Endpoints', () => {
  let testCovenId: string;
  let testEventId: string;
  let basicUserEventId: string;

  beforeAll(async () => {
    // Create test coven for entity linking
    const coven = await Coven.create({
      name: 'Event Test Coven',
      privacy: 'public',
      status: 'active',
      user: global.adminUserId,
    });
    testCovenId = (coven._id as Types.ObjectId).toString();

    // Create test events
    const event1 = await Event.create({
      startDateTime: new Date('2025-12-01T10:00:00Z'),
      startTimezone: 'America/New_York',
      endDateTime: new Date('2025-12-01T12:00:00Z'),
      endTimezone: 'America/New_York',
      user: global.adminUserId,
      entityId: coven._id,
      entityType: 'coven',
      name: 'Test Event 1',
      description: 'A test event',
      shortDescription: 'Test event',
      rsvpUsers: [],
      interestedUsers: [],
    });
    testEventId = (event1._id as Types.ObjectId).toString();

    const event2 = await Event.create({
      startDateTime: new Date('2025-12-15T14:00:00Z'),
      startTimezone: 'UTC',
      endDateTime: new Date('2025-12-15T16:00:00Z'),
      endTimezone: 'UTC',
      user: global.basicUserId,
      entityId: coven._id,
      entityType: 'coven',
      name: 'Basic User Event',
      description: 'Event by basic user',
      rsvpUsers: [],
      interestedUsers: [],
    });
    basicUserEventId = (event2._id as Types.ObjectId).toString();
  });

  describe('Mutation: createEvent', () => {
    it('should create an event', async () => {
      const mutation = `
        mutation CreateEvent($input: CreateEventInput!) {
          createEvent(input: $input) {
            success
            message
            event {
              id
              name
              description
              startDateTime
              endDateTime
              startTimezone
              endTimezone
              entityId
              entityType
              user {
                id
              }
              rsvpUsers
              interestedUsers
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            name: 'New Test Event',
            description: 'A newly created event',
            shortDescription: 'New event',
            startDateTime: '2025-12-20T10:00:00Z',
            startTimezone: 'America/Los_Angeles',
            endDateTime: '2025-12-20T12:00:00Z',
            endTimezone: 'America/Los_Angeles',
            entityId: testCovenId,
            entityType: 'coven',
            primaryColor: '#FF5733',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.createEvent.success).toBe(true);
      expect(response.body.data.createEvent.event.name).toBe('New Test Event');
      expect(response.body.data.createEvent.event.user.id).toBe(
        global.basicUserId
      );
      expect(response.body.data.createEvent.event.rsvpUsers).toEqual([]);
      expect(response.body.data.createEvent.event.interestedUsers).toEqual([]);
    });

    it('should fail without authentication', async () => {
      const mutation = `
        mutation CreateEvent($input: CreateEventInput!) {
          createEvent(input: $input) {
            success
          }
        }
      `;

      const response = await global.testRequest.post('/graphql').send({
        query: mutation,
        variables: {
          input: {
            name: 'Unauthenticated Event',
            startDateTime: '2025-12-20T10:00:00Z',
            endDateTime: '2025-12-20T12:00:00Z',
            entityId: testCovenId,
            entityType: 'coven',
          },
        },
      });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });

    it('should validate date order', async () => {
      const mutation = `
        mutation CreateEvent($input: CreateEventInput!) {
          createEvent(input: $input) {
            success
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            name: 'Invalid Date Event',
            startDateTime: '2025-12-20T12:00:00Z',
            endDateTime: '2025-12-20T10:00:00Z', // End before start
            entityId: testCovenId,
            entityType: 'coven',
          },
        },
      });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('VALIDATION_ERROR');
      expect(response.body.errors[0].message).toContain(
        'End date must be after start date'
      );
    });
  });

  describe('Mutation: updateEvent', () => {
    it('should allow owner to update their event', async () => {
      const mutation = `
        mutation UpdateEvent($input: UpdateEventInput!) {
          updateEvent(input: $input) {
            success
            message
            event {
              id
              name
              description
              primaryColor
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            id: basicUserEventId,
            name: 'Updated Event Name',
            description: 'Updated description',
            primaryColor: '#33FF57',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.updateEvent.success).toBe(true);
      expect(response.body.data.updateEvent.event.name).toBe(
        'Updated Event Name'
      );
      expect(response.body.data.updateEvent.event.primaryColor).toBe('#33FF57');
    });

    it('should allow admin to update any event', async () => {
      const mutation = `
        mutation UpdateEvent($input: UpdateEventInput!) {
          updateEvent(input: $input) {
            success
            event {
              name
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            id: basicUserEventId,
            name: 'Admin Updated Event',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.updateEvent.success).toBe(true);
    });

    it('should not allow non-owner to update event', async () => {
      const mutation = `
        mutation UpdateEvent($input: UpdateEventInput!) {
          updateEvent(input: $input) {
            success
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            id: testEventId, // Admin's event
            name: 'Unauthorized Update',
          },
        },
      });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });

    it('should validate dates on update', async () => {
      const mutation = `
        mutation UpdateEvent($input: UpdateEventInput!) {
          updateEvent(input: $input) {
            success
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            id: basicUserEventId,
            startDateTime: '2025-12-20T12:00:00Z',
            endDateTime: '2025-12-20T10:00:00Z',
          },
        },
      });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Mutation: deleteEvent', () => {
    it('should allow owner to delete their event', async () => {
      const event = await Event.create({
        startDateTime: new Date('2025-12-25T10:00:00Z'),
        endDateTime: new Date('2025-12-25T12:00:00Z'),
        user: global.basicUserId,
        entityId: new Types.ObjectId(testCovenId),
        entityType: 'coven',
        name: 'Event to Delete',
        rsvpUsers: [],
        interestedUsers: [],
      });

      const mutation = `
        mutation DeleteEvent($id: ID!) {
          deleteEvent(id: $id) {
            success
            message
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          id: (event._id as Types.ObjectId).toString(),
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.deleteEvent.success).toBe(true);

      const deleted = await Event.findById(event._id);
      expect(deleted).toBeNull();
    });

    it('should not allow non-owner to delete event', async () => {
      const mutation = `
        mutation DeleteEvent($id: ID!) {
          deleteEvent(id: $id) {
            success
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          id: testEventId, // Admin's event
        },
      });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Mutation: rsvpEvent', () => {
    it('should add RSVP to event', async () => {
      const mutation = `
        mutation RsvpEvent($eventId: ID!) {
          rsvpEvent(eventId: $eventId) {
            success
            message
            event {
              id
              rsvpUsers
              interestedUsers
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          eventId: testEventId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.rsvpEvent.success).toBe(true);
      expect(response.body.data.rsvpEvent.message).toBe('RSVP added');
      expect(response.body.data.rsvpEvent.event.rsvpUsers).toContain(
        global.basicUserId
      );
    });

    it('should remove RSVP from event', async () => {
      const event = await Event.create({
        startDateTime: new Date('2025-12-30T10:00:00Z'),
        endDateTime: new Date('2025-12-30T12:00:00Z'),
        user: global.adminUserId,
        entityId: new Types.ObjectId(testCovenId),
        entityType: 'coven',
        name: 'RSVP Test Event',
        rsvpUsers: [new Types.ObjectId(global.basicUserId)],
        interestedUsers: [],
      });

      const mutation = `
        mutation RsvpEvent($eventId: ID!) {
          rsvpEvent(eventId: $eventId) {
            success
            message
            event {
              rsvpUsers
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          eventId: (event._id as Types.ObjectId as Types.ObjectId).toString(),
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.rsvpEvent.message).toBe('RSVP removed');
      expect(response.body.data.rsvpEvent.event.rsvpUsers).not.toContain(
        global.basicUserId
      );
    });

    it('should remove from interested when RSVPing', async () => {
      const event = await Event.create({
        startDateTime: new Date('2026-01-05T10:00:00Z'),
        endDateTime: new Date('2026-01-05T12:00:00Z'),
        user: global.adminUserId,
        entityId: new Types.ObjectId(testCovenId),
        entityType: 'coven',
        name: 'Interest to RSVP Event',
        rsvpUsers: [],
        interestedUsers: [new Types.ObjectId(global.basicUserId)],
      });

      const mutation = `
        mutation RsvpEvent($eventId: ID!) {
          rsvpEvent(eventId: $eventId) {
            success
            event {
              rsvpUsers
              interestedUsers
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          eventId: (event._id as Types.ObjectId).toString(),
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.rsvpEvent.event.rsvpUsers).toContain(
        global.basicUserId
      );
      expect(response.body.data.rsvpEvent.event.interestedUsers).not.toContain(
        global.basicUserId
      );
    });
  });

  describe('Mutation: interestedEvent', () => {
    it('should add interest to event', async () => {
      const mutation = `
        mutation InterestedEvent($eventId: ID!) {
          interestedEvent(eventId: $eventId) {
            success
            message
            event {
              id
              interestedUsers
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          eventId: basicUserEventId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.interestedEvent.success).toBe(true);
      expect(response.body.data.interestedEvent.message).toBe('Interest added');
      expect(
        response.body.data.interestedEvent.event.interestedUsers
      ).toContain(global.basicUserId);
    });

    it('should remove interest from event', async () => {
      const event = await Event.create({
        startDateTime: new Date('2026-01-10T10:00:00Z'),
        endDateTime: new Date('2026-01-10T12:00:00Z'),
        user: global.adminUserId,
        entityId: new Types.ObjectId(testCovenId),
        entityType: 'coven',
        name: 'Interest Test Event',
        rsvpUsers: [],
        interestedUsers: [new Types.ObjectId(global.basicUserId)],
      });

      const mutation = `
        mutation InterestedEvent($eventId: ID!) {
          interestedEvent(eventId: $eventId) {
            success
            message
            event {
              interestedUsers
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          eventId: (event._id as Types.ObjectId).toString(),
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.interestedEvent.message).toBe(
        'Interest removed'
      );
      expect(
        response.body.data.interestedEvent.event.interestedUsers
      ).not.toContain(global.basicUserId);
    });
  });

  describe('Query: events', () => {
    beforeAll(async () => {
      // Create multiple events for testing
      await Event.create([
        {
          startDateTime: new Date('2026-02-01T10:00:00Z'),
          endDateTime: new Date('2026-02-01T12:00:00Z'),
          user: global.adminUserId,
          entityId: new Types.ObjectId(testCovenId),
          entityType: 'coven',
          name: 'Future Event 1',
          rsvpUsers: [],
          interestedUsers: [],
        },
        {
          startDateTime: new Date('2026-02-15T10:00:00Z'),
          endDateTime: new Date('2026-02-15T12:00:00Z'),
          user: global.basicUserId,
          entityId: new Types.ObjectId(testCovenId),
          entityType: 'coven',
          name: 'Future Event 2',
          rsvpUsers: [],
          interestedUsers: [],
        },
      ]);
    });

    it('should get events by entity', async () => {
      const query = `
        query GetEvents($entityId: ID!, $entityType: String!, $limit: Int, $offset: Int) {
          events(entityId: $entityId, entityType: $entityType, limit: $limit, offset: $offset) {
            id
            name
            description
            startDateTime
            endDateTime
            entityId
            entityType
            user {
              id
              handle
            }
            rsvpUsers
            interestedUsers
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
        variables: {
          entityId: testCovenId,
          entityType: 'coven',
          limit: 10,
          offset: 0,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.events).toBeDefined();
      expect(Array.isArray(response.body.data.events)).toBe(true);
      expect(response.body.data.events.length).toBeGreaterThan(0);
      expect(
        response.body.data.events.every((e: any) => e.entityType === 'coven')
      ).toBe(true);
    });

    it('should filter events by date range', async () => {
      const startDate = '2026-02-01T00:00:00.000Z';
      const endDate = '2026-02-28T23:59:59.999Z';

      const query = `
        query {
          events(
            entityId: "${testCovenId}"
            entityType: "coven"
            startDate: "${startDate}"
            endDate: "${endDate}"
          ) {
            id
            name
            startDateTime
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
      });

      expect(response.status).toBe(200);
      expect(response.body.data.events).toBeDefined();
      expect(response.body.data.events.length).toBeGreaterThan(0);
    });

    it('should validate pagination limits', async () => {
      const query = `
        query GetEvents($entityId: ID!, $entityType: String!, $limit: Int) {
          events(entityId: $entityId, entityType: $entityType, limit: $limit) {
            id
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
        variables: {
          entityId: testCovenId,
          entityType: 'coven',
          limit: 200,
        },
      });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Query: myEvents', () => {
    beforeAll(async () => {
      // Create events with current user
      await Event.create({
        startDateTime: new Date('2026-03-01T10:00:00Z'),
        endDateTime: new Date('2026-03-01T12:00:00Z'),
        user: global.basicUserId,
        entityId: new Types.ObjectId(testCovenId),
        entityType: 'coven',
        name: 'My Created Event',
        rsvpUsers: [],
        interestedUsers: [],
      });

      await Event.create({
        startDateTime: new Date('2026-03-15T10:00:00Z'),
        endDateTime: new Date('2026-03-15T12:00:00Z'),
        user: global.adminUserId,
        entityId: new Types.ObjectId(testCovenId),
        entityType: 'coven',
        name: 'Event I RSVPed',
        rsvpUsers: [new Types.ObjectId(global.basicUserId)],
        interestedUsers: [],
      });
    });

    it('should get current user events', async () => {
      const query = `
        query MyEvents($limit: Int, $offset: Int) {
          myEvents(limit: $limit, offset: $offset) {
            id
            name
            user {
              id
            }
            rsvpUsers
            interestedUsers
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query,
        variables: {
          limit: 20,
          offset: 0,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.myEvents).toBeDefined();
      expect(Array.isArray(response.body.data.myEvents)).toBe(true);
      expect(response.body.data.myEvents.length).toBeGreaterThan(0);
    });

    it('should filter by date range', async () => {
      const startDate = '2026-03-01T00:00:00.000Z';
      const endDate = '2026-03-31T23:59:59.999Z';

      const query = `
        query {
          myEvents(startDate: "${startDate}", endDate: "${endDate}") {
            id
            name
            startDateTime
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query,
      });

      expect(response.status).toBe(200);
      expect(response.body.data.myEvents).toBeDefined();
    });
  });

  describe('Query: eventsByUser', () => {
    it('should get events by specific user', async () => {
      const query = `
        query EventsByUser($userId: ID!, $limit: Int, $offset: Int) {
          eventsByUser(userId: $userId, limit: $limit, offset: $offset) {
            id
            name
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
          limit: 10,
          offset: 0,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.eventsByUser).toBeDefined();
      expect(Array.isArray(response.body.data.eventsByUser)).toBe(true);
      expect(
        response.body.data.eventsByUser.every(
          (e: any) => e.user.id === global.basicUserId
        )
      ).toBe(true);
    });

    it('should filter by date range', async () => {
      const startDate = '2026-03-01T00:00:00.000Z';
      const endDate = '2026-03-31T23:59:59.999Z';

      const query = `
        query {
          eventsByUser(
            userId: "${global.basicUserId}"
            startDate: "${startDate}"
            endDate: "${endDate}"
          ) {
            id
            name
            startDateTime
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
      });

      expect(response.status).toBe(200);
      expect(response.body.data.eventsByUser).toBeDefined();
    });
  });
});
