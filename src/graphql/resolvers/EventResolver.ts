import 'reflect-metadata';
import { Types } from 'mongoose';
import { Arg, Ctx, ID, Int, Mutation, Query, Resolver } from 'type-graphql';
import { GraphQLContext } from '../../middleware/auth.middleware';
import { Event } from '../../models/Event';
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../utils/errors';
import { CreateEventInput, UpdateEventInput } from '../inputs/EventInput';
import { EventResponse, EventType } from '../types/EventTypes';

@Resolver(() => EventType)
export class EventResolver {
  // Mutation: Create an event
  @Mutation(() => EventResponse)
  async createEvent(
    @Ctx() context: GraphQLContext,
    @Arg('input') input: CreateEventInput
  ): Promise<EventResponse> {
    context.hasUserWriteAppWriteScope(context);

    // Validate dates
    if (new Date(input.startDateTime) >= new Date(input.endDateTime)) {
      throw new ValidationError('End date must be after start date');
    }

    // Create event
    const event = new Event({
      ...input,
      user: new Types.ObjectId(context.userId),
      entityId: new Types.ObjectId(input.entityId),
      entityType: input.entityType.toLowerCase(),
      heroAsset: input.heroAsset
        ? new Types.ObjectId(input.heroAsset)
        : undefined,
      backgroundAsset: input.backgroundAsset
        ? new Types.ObjectId(input.backgroundAsset)
        : undefined,
      primaryAsset: input.primaryAsset
        ? new Types.ObjectId(input.primaryAsset)
        : undefined,
      rsvpUsers: [],
      interestedUsers: [],
    });

    await event.save();
    await event.populate('user');
    await event.populate('heroAsset');
    await event.populate('backgroundAsset');
    await event.populate('primaryAsset');

    return {
      success: true,
      message: 'Event created successfully',
      event: event as unknown as EventType,
    };
  }

  // Mutation: Update an event
  @Mutation(() => EventResponse)
  async updateEvent(
    @Ctx() context: GraphQLContext,
    @Arg('input') input: UpdateEventInput
  ): Promise<EventResponse> {
    context.hasUserWriteAppWriteScope(context);

    const event = await Event.findById(input.id).populate('user');

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    // Only event creator or admin can update
    const isAdmin = context.hasUserScope('admin');
    const isOwner = event.user._id.equals(new Types.ObjectId(context.userId));

    if (!isAdmin && !isOwner) {
      throw new UnauthorizedError(
        'You do not have permission to update this event'
      );
    }

    // Validate dates if both are provided
    const startDate = input.startDateTime || event.startDateTime;
    const endDate = input.endDateTime || event.endDateTime;

    if (new Date(startDate) >= new Date(endDate)) {
      throw new ValidationError('End date must be after start date');
    }

    // Update fields
    const updateData = { ...input };
    delete (updateData as { id?: string }).id;

    Object.assign(event, updateData);

    if (input.heroAsset !== undefined) {
      if (input.heroAsset) {
        event.heroAsset = new Types.ObjectId(input.heroAsset);
      } else {
        delete event.heroAsset;
      }
    }
    if (input.backgroundAsset !== undefined) {
      if (input.backgroundAsset) {
        event.backgroundAsset = new Types.ObjectId(input.backgroundAsset);
      } else {
        delete event.backgroundAsset;
      }
    }
    if (input.primaryAsset !== undefined) {
      if (input.primaryAsset) {
        event.primaryAsset = new Types.ObjectId(input.primaryAsset);
      } else {
        delete event.primaryAsset;
      }
    }

    await event.save();
    await event.populate('user');
    await event.populate('heroAsset');
    await event.populate('backgroundAsset');
    await event.populate('primaryAsset');

    return {
      success: true,
      message: 'Event updated successfully',
      event: event as unknown as EventType,
    };
  }

  // Mutation: Delete an event
  @Mutation(() => EventResponse)
  async deleteEvent(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string
  ): Promise<EventResponse> {
    context.hasUserWriteAppWriteScope(context);

    const event = await Event.findById(id).populate('user');

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    // Only event creator or admin can delete
    const isAdmin = context.hasUserScope('admin');
    const isOwner = event.user._id.equals(new Types.ObjectId(context.userId));

    if (!isAdmin && !isOwner) {
      throw new UnauthorizedError(
        'You do not have permission to delete this event'
      );
    }

    await Event.findByIdAndDelete(id);

    return {
      success: true,
      message: 'Event deleted successfully',
    };
  }

  // Mutation: RSVP to an event
  @Mutation(() => EventResponse)
  async rsvpEvent(
    @Ctx() context: GraphQLContext,
    @Arg('eventId', () => ID) eventId: string
  ): Promise<EventResponse> {
    context.hasUserWriteAppWriteScope(context);

    const event = await Event.findById(eventId);

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    const userId = new Types.ObjectId(context.userId);

    // Check if user already RSVPed
    const alreadyRsvped = event.rsvpUsers.some((id) => id.equals(userId));

    if (alreadyRsvped) {
      // Remove RSVP
      event.rsvpUsers = event.rsvpUsers.filter((id) => !id.equals(userId));
    } else {
      // Add RSVP and remove from interested if present
      event.rsvpUsers.push(userId);
      event.interestedUsers = event.interestedUsers.filter(
        (id) => !id.equals(userId)
      );
    }

    await event.save();
    await event.populate('user');
    await event.populate('heroAsset');
    await event.populate('backgroundAsset');
    await event.populate('primaryAsset');

    return {
      success: true,
      message: alreadyRsvped ? 'RSVP removed' : 'RSVP added',
      event: event as unknown as EventType,
    };
  }

  // Mutation: Mark interest in an event
  @Mutation(() => EventResponse)
  async interestedEvent(
    @Ctx() context: GraphQLContext,
    @Arg('eventId', () => ID) eventId: string
  ): Promise<EventResponse> {
    context.hasUserWriteAppWriteScope(context);

    const event = await Event.findById(eventId);

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    const userId = new Types.ObjectId(context.userId);

    // Check if user already marked as interested
    const alreadyInterested = event.interestedUsers.some((id) =>
      id.equals(userId)
    );

    if (alreadyInterested) {
      // Remove interest
      event.interestedUsers = event.interestedUsers.filter(
        (id) => !id.equals(userId)
      );
    } else {
      // Add interest (don't remove RSVP - user can be both)
      event.interestedUsers.push(userId);
    }

    await event.save();
    await event.populate('user');
    await event.populate('heroAsset');
    await event.populate('backgroundAsset');
    await event.populate('primaryAsset');

    return {
      success: true,
      message: alreadyInterested ? 'Interest removed' : 'Interest added',
      event: event as unknown as EventType,
    };
  }

  // Query: Get events by entity
  @Query(() => [EventType])
  async events(
    @Ctx() context: GraphQLContext,
    @Arg('entityId', () => ID) entityId: string,
    @Arg('entityType') entityType: string,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 20 })
    limit: number,
    @Arg('offset', () => Int, { nullable: true, defaultValue: 0 })
    offset: number,
    @Arg('startDate', { nullable: true }) startDate?: Date,
    @Arg('endDate', { nullable: true }) endDate?: Date
  ): Promise<EventType[]> {
    context.hasUserWriteAppWriteScope(context);

    // Validate pagination
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }
    if (offset < 0) {
      throw new ValidationError('Offset must be non-negative');
    }

    // Build query filter
    const filter: Record<string, unknown> = {
      entityId: new Types.ObjectId(entityId),
      entityType: entityType.toLowerCase(),
    };

    // Add date filters if provided
    if (startDate || endDate) {
      filter.startDateTime = {};
      if (startDate) {
        (filter.startDateTime as Record<string, unknown>).$gte = new Date(
          startDate
        );
      }
      if (endDate) {
        (filter.startDateTime as Record<string, unknown>).$lte = new Date(
          endDate
        );
      }
    }

    const events = await Event.find(filter)
      .sort({ startDateTime: 1 })
      .skip(offset)
      .limit(limit)
      .populate('user')
      .populate('heroAsset')
      .populate('backgroundAsset')
      .populate('primaryAsset');

    return events as unknown as EventType[];
  }

  // Query: Get events by current user
  @Query(() => [EventType])
  async myEvents(
    @Ctx() context: GraphQLContext,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 20 })
    limit: number,
    @Arg('offset', () => Int, { nullable: true, defaultValue: 0 })
    offset: number,
    @Arg('startDate', { nullable: true }) startDate?: Date,
    @Arg('endDate', { nullable: true }) endDate?: Date
  ): Promise<EventType[]> {
    context.hasUserWriteAppWriteScope(context);

    // Validate pagination
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }
    if (offset < 0) {
      throw new ValidationError('Offset must be non-negative');
    }

    // Build query - get events where user is creator, RSVPed, or interested
    const userId = new Types.ObjectId(context.userId);
    const filter: Record<string, unknown> = {
      $or: [
        { user: userId },
        { rsvpUsers: userId },
        { interestedUsers: userId },
      ],
    };

    // Add date filters if provided
    if (startDate || endDate) {
      filter.startDateTime = {};
      if (startDate) {
        (filter.startDateTime as Record<string, unknown>).$gte = new Date(
          startDate
        );
      }
      if (endDate) {
        (filter.startDateTime as Record<string, unknown>).$lte = new Date(
          endDate
        );
      }
    }

    const events = await Event.find(filter)
      .sort({ startDateTime: 1 })
      .skip(offset)
      .limit(limit)
      .populate('user')
      .populate('heroAsset')
      .populate('backgroundAsset')
      .populate('primaryAsset');

    return events as unknown as EventType[];
  }

  // Query: Get events created by a specific user
  @Query(() => [EventType])
  async eventsByUser(
    @Ctx() context: GraphQLContext,
    @Arg('userId', () => ID) userId: string,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 20 })
    limit: number,
    @Arg('offset', () => Int, { nullable: true, defaultValue: 0 })
    offset: number,
    @Arg('startDate', { nullable: true }) startDate?: Date,
    @Arg('endDate', { nullable: true }) endDate?: Date
  ): Promise<EventType[]> {
    context.hasUserWriteAppWriteScope(context);

    // Validate pagination
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }
    if (offset < 0) {
      throw new ValidationError('Offset must be non-negative');
    }

    // Build query filter
    const filter: Record<string, unknown> = {
      user: new Types.ObjectId(userId),
    };

    // Add date filters if provided
    if (startDate || endDate) {
      filter.startDateTime = {};
      if (startDate) {
        (filter.startDateTime as Record<string, unknown>).$gte = new Date(
          startDate
        );
      }
      if (endDate) {
        (filter.startDateTime as Record<string, unknown>).$lte = new Date(
          endDate
        );
      }
    }

    const events = await Event.find(filter)
      .sort({ startDateTime: 1 })
      .skip(offset)
      .limit(limit)
      .populate('user')
      .populate('heroAsset')
      .populate('backgroundAsset')
      .populate('primaryAsset');

    return events as unknown as EventType[];
  }
}
