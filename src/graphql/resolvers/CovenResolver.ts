import 'reflect-metadata';
import { Types } from 'mongoose';
import { Arg, Ctx, ID, Int, Mutation, Query, Resolver } from 'type-graphql';
import { GraphQLContext } from '../../middleware/auth.middleware';
import { Coven } from '../../models/Coven';
import { CovenRoster } from '../../models/CovenRoster';
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../utils/errors';
import {
  CreateCovenInput,
  UpdateCovenInput,
  UpdateCovenRosterInput,
} from '../inputs/CovenInput';
import {
  CovenResponse,
  CovenRosterResponse,
  CovenRosterType,
  CovenType,
} from '../types/CovenTypes';

@Resolver(() => CovenType)
export class CovenResolver {
  // Mutation: Create a coven
  @Mutation(() => CovenResponse)
  async createCoven(
    @Ctx() context: GraphQLContext,
    @Arg('input') input: CreateCovenInput
  ): Promise<CovenResponse> {
    context.hasUserWriteAppWriteScope(context);

    // Validate privacy and status
    if (!['public', 'private'].includes(input.privacy)) {
      throw new ValidationError('Privacy must be public or private');
    }

    // Create the coven
    const coven = new Coven({
      ...input,
      user: new Types.ObjectId(context.userId),
    });

    await coven.save();

    // Create the roster entry for the creator as owner
    const rosterEntry = new CovenRoster({
      coven: coven._id,
      user: new Types.ObjectId(context.userId),
      userRole: 'owner',
      lastActive: new Date(),
    });

    await rosterEntry.save();

    // Update coven with roster reference
    coven.rosterId = rosterEntry._id as Types.ObjectId;
    await coven.save();

    await coven.populate('user');
    await coven.populate('primaryAsset');
    await coven.populate('backgroundAsset');
    await coven.populate('headerAsset');
    await coven.populate('avatarAsset');

    return {
      success: true,
      message: 'Coven created successfully',
      coven: coven as unknown as CovenType,
    };
  }

  // Mutation: Update a coven
  @Mutation(() => CovenResponse)
  async updateCoven(
    @Ctx() context: GraphQLContext,
    @Arg('input') input: UpdateCovenInput
  ): Promise<CovenResponse> {
    context.hasUserWriteAppWriteScope(context);

    const coven = await Coven.findById(input.id).populate('user');

    if (!coven) {
      throw new NotFoundError('Coven not found');
    }

    // Check permissions: admin or owner
    const isAdmin = context.hasUserScope('admin');
    const isOwner = coven.user._id.equals(new Types.ObjectId(context.userId));

    if (!isAdmin && !isOwner) {
      throw new UnauthorizedError(
        'You do not have permission to update this coven'
      );
    }

    // Validate status and privacy if provided
    if (
      input.status &&
      !['active', 'paused', 'deleted'].includes(input.status)
    ) {
      throw new ValidationError('Status must be active, paused, or deleted');
    }
    if (input.privacy && !['public', 'private'].includes(input.privacy)) {
      throw new ValidationError('Privacy must be public or private');
    }

    // Update fields
    const updateData = { ...input };
    delete (updateData as { id?: string }).id;

    Object.assign(coven, updateData);
    await coven.save();

    await coven.populate('user');
    await coven.populate('primaryAsset');
    await coven.populate('backgroundAsset');
    await coven.populate('headerAsset');
    await coven.populate('avatarAsset');

    return {
      success: true,
      message: 'Coven updated successfully',
      coven: coven as unknown as CovenType,
    };
  }

  // Mutation: Soft delete (disable) a coven
  @Mutation(() => CovenResponse)
  async softDeleteCoven(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string
  ): Promise<CovenResponse> {
    context.hasUserWriteAppWriteScope(context);

    const coven = await Coven.findById(id).populate('user');

    if (!coven) {
      throw new NotFoundError('Coven not found');
    }

    // Check permissions: admin or owner
    const isAdmin = context.hasUserScope('admin');
    const isOwner = coven.user._id.equals(new Types.ObjectId(context.userId));

    if (!isAdmin && !isOwner) {
      throw new UnauthorizedError(
        'You do not have permission to delete this coven'
      );
    }

    coven.status = 'deleted';
    await coven.save();

    return {
      success: true,
      message: 'Coven disabled successfully',
    };
  }

  // Mutation: Hard delete a coven
  @Mutation(() => CovenResponse)
  async hardDeleteCoven(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string
  ): Promise<CovenResponse> {
    context.hasUserWriteAppWriteScope(context);

    const coven = await Coven.findById(id).populate('user');

    if (!coven) {
      throw new NotFoundError('Coven not found');
    }

    // Check permissions: admin or owner
    const isAdmin = context.hasUserScope('admin');
    const isOwner = coven.user._id.equals(new Types.ObjectId(context.userId));

    if (!isAdmin && !isOwner) {
      throw new UnauthorizedError(
        'You do not have permission to delete this coven'
      );
    }

    // Delete all roster entries for this coven
    await CovenRoster.deleteMany({ coven: coven._id });

    // Delete the coven
    await Coven.findByIdAndDelete(id);

    return {
      success: true,
      message: 'Coven deleted successfully',
    };
  }

  // Mutation: Join a coven
  @Mutation(() => CovenRosterResponse)
  async joinCoven(
    @Ctx() context: GraphQLContext,
    @Arg('covenId', () => ID) covenId: string
  ): Promise<CovenRosterResponse> {
    context.hasUserWriteAppWriteScope(context);

    const coven = await Coven.findById(covenId);

    if (!coven) {
      throw new NotFoundError('Coven not found');
    }

    if (coven.status !== 'active') {
      throw new ValidationError('Cannot join a non-active coven');
    }

    // Check if user is already a member
    const existingEntry = await CovenRoster.findOne({
      coven: new Types.ObjectId(covenId),
      user: new Types.ObjectId(context.userId),
    });

    if (existingEntry) {
      throw new ValidationError('You are already a member of this coven');
    }

    // Check max members limit
    if (coven.maxMembers) {
      const currentMemberCount = await CovenRoster.countDocuments({
        coven: new Types.ObjectId(covenId),
      });

      if (currentMemberCount >= coven.maxMembers) {
        throw new ValidationError('Coven has reached maximum member capacity');
      }
    }

    // Create roster entry with appropriate role based on privacy
    const userRole = coven.privacy === 'private' ? 'pending' : 'basic';
    const rosterEntry = new CovenRoster({
      coven: new Types.ObjectId(covenId),
      user: new Types.ObjectId(context.userId),
      userRole: userRole,
      lastActive: new Date(),
    });

    await rosterEntry.save();
    await rosterEntry.populate('user');
    await rosterEntry.populate('avatarAsset');

    const message =
      coven.privacy === 'private'
        ? 'Join request submitted. Awaiting approval.'
        : 'Joined coven successfully';

    return {
      success: true,
      message: message,
      rosterEntry: rosterEntry as unknown as CovenRosterType,
    };
  }

  // Mutation: Leave a coven
  @Mutation(() => CovenRosterResponse)
  async leaveCoven(
    @Ctx() context: GraphQLContext,
    @Arg('covenId', () => ID) covenId: string
  ): Promise<CovenRosterResponse> {
    context.hasUserWriteAppWriteScope(context);

    const rosterEntry = await CovenRoster.findOne({
      coven: new Types.ObjectId(covenId),
      user: new Types.ObjectId(context.userId),
    });

    if (!rosterEntry) {
      throw new NotFoundError('You are not a member of this coven');
    }

    // Owners cannot leave their own coven
    if (rosterEntry.userRole === 'owner') {
      throw new ValidationError(
        'Owners cannot leave their own coven. Transfer ownership or delete the coven instead.'
      );
    }

    await CovenRoster.findByIdAndDelete(rosterEntry._id);

    return {
      success: true,
      message: 'Left coven successfully',
    };
  }

  // Query: Get a coven by ID
  @Query(() => CovenType, { nullable: true })
  async coven(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string
  ): Promise<CovenType | null> {
    context.hasUserWriteAppWriteScope(context);

    const coven = await Coven.findById(id)
      .populate('user')
      .populate('primaryAsset')
      .populate('backgroundAsset')
      .populate('headerAsset')
      .populate('avatarAsset');

    if (!coven) {
      throw new NotFoundError('Coven not found');
    }

    return coven as unknown as CovenType;
  }

  // Query: Get covens with filters and pagination
  @Query(() => [CovenType])
  async covens(
    @Ctx() context: GraphQLContext,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 10 })
    limit: number,
    @Arg('offset', () => Int, { nullable: true, defaultValue: 0 })
    offset: number,
    @Arg('tradition', { nullable: true }) tradition?: string,
    @Arg('structure', { nullable: true }) structure?: string,
    @Arg('practice', { nullable: true }) practice?: string,
    @Arg('privacy', { nullable: true }) privacy?: string,
    @Arg('status', { nullable: true }) status?: string,
    @Arg('userId', () => ID, { nullable: true }) userId?: string
  ): Promise<CovenType[]> {
    context.hasUserWriteAppWriteScope(context);

    // Validate pagination
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }
    if (offset < 0) {
      throw new ValidationError('Offset must be non-negative');
    }

    // Build filter query
    const filter: Record<string, unknown> = {};

    if (status) {
      filter.status = status;
    }

    if (tradition) {
      filter.tradition = tradition;
    }
    if (structure) {
      filter.structure = structure;
    }
    if (practice) {
      filter.practice = practice;
    }
    if (privacy) {
      if (!['public', 'private'].includes(privacy)) {
        throw new ValidationError('Privacy must be public or private');
      }
      filter.privacy = privacy;
    }
    if (userId) {
      filter.user = new Types.ObjectId(userId);
    }

    const covens = await Coven.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate('user')
      .populate('primaryAsset')
      .populate('backgroundAsset')
      .populate('headerAsset')
      .populate('avatarAsset');

    return covens as unknown as CovenType[];
  }

  // Query: Get current user's covens (where they are a member)
  @Query(() => [CovenType])
  async myCovenMemberships(
    @Ctx() context: GraphQLContext,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 10 })
    limit: number,
    @Arg('offset', () => Int, { nullable: true, defaultValue: 0 })
    offset: number
  ): Promise<CovenType[]> {
    context.hasUserWriteAppWriteScope(context);

    // Validate pagination
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }
    if (offset < 0) {
      throw new ValidationError('Offset must be non-negative');
    }

    // Find all roster entries for the current user
    const rosterEntries = await CovenRoster.find({
      user: new Types.ObjectId(context.userId),
    })
      .skip(offset)
      .limit(limit)
      .sort({ lastActive: -1 });

    const covenIds = rosterEntries.map((entry) => entry.coven);

    // Get the covens
    const covens = await Coven.find({
      _id: { $in: covenIds },
      status: 'active',
    })
      .populate('user')
      .populate('primaryAsset')
      .populate('backgroundAsset')
      .populate('headerAsset')
      .populate('avatarAsset');

    return covens as unknown as CovenType[];
  }

  // Query: Get coven roster by coven ID
  @Query(() => [CovenRosterType])
  async covenRoster(
    @Ctx() context: GraphQLContext,
    @Arg('covenId', () => ID) covenId: string,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 50 })
    limit: number,
    @Arg('offset', () => Int, { nullable: true, defaultValue: 0 })
    offset: number
  ): Promise<CovenRosterType[]> {
    context.hasUserWriteAppWriteScope(context);

    // Validate pagination
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }
    if (offset < 0) {
      throw new ValidationError('Offset must be non-negative');
    }

    // Check if coven exists
    const coven = await Coven.findById(covenId);
    if (!coven) {
      throw new NotFoundError('Coven not found');
    }

    const roster = await CovenRoster.find({
      coven: new Types.ObjectId(covenId),
    })
      .sort({ userRole: 1, lastActive: -1 })
      .skip(offset)
      .limit(limit)
      .populate('user')
      .populate('avatarAsset');

    return roster as unknown as CovenRosterType[];
  }

  // Mutation: Update coven roster entry
  @Mutation(() => CovenRosterResponse)
  async updateCovenRoster(
    @Ctx() context: GraphQLContext,
    @Arg('input') input: UpdateCovenRosterInput
  ): Promise<CovenRosterResponse> {
    context.hasUserWriteAppWriteScope(context);

    // Find the coven
    const coven = await Coven.findById(input.covenId).populate('user');
    if (!coven) {
      throw new NotFoundError('Coven not found');
    }

    // Check if requester has permission to update roster
    const requesterEntry = await CovenRoster.findOne({
      coven: new Types.ObjectId(input.covenId),
      user: new Types.ObjectId(context.userId),
    });

    const isAdmin = context.hasUserScope('admin');
    const isOwner = coven.user._id.equals(new Types.ObjectId(context.userId));
    const isCoOwner = requesterEntry?.userRole === 'co-owner';
    const isSelfUpdate = context.userId === input.userId;

    // Permission logic:
    // - Admin can update anyone
    // - Owner can update anyone
    // - Co-owner can update basic and editor members
    // - Anyone can update their own entry (except role changes)
    if (!isAdmin && !isOwner && !isCoOwner && !isSelfUpdate) {
      throw new UnauthorizedError(
        'You do not have permission to update this roster entry'
      );
    }

    // Find the roster entry to update
    const rosterEntry = await CovenRoster.findOne({
      coven: new Types.ObjectId(input.covenId),
      user: new Types.ObjectId(input.userId),
    });

    if (!rosterEntry) {
      throw new NotFoundError('Roster entry not found');
    }

    // If trying to change role, need higher permissions
    if (input.userRole && input.userRole !== rosterEntry.userRole) {
      if (!isAdmin && !isOwner) {
        throw new UnauthorizedError(
          'Only admins and owners can change user roles'
        );
      }

      // Validate role
      if (
        !['owner', 'co-owner', 'editor', 'basic', 'pending'].includes(
          input.userRole
        )
      ) {
        throw new ValidationError('Invalid user role');
      }

      // Cannot change owner role
      if (rosterEntry.userRole === 'owner' && input.userRole !== 'owner') {
        throw new ValidationError(
          'Cannot demote the owner. Transfer ownership first.'
        );
      }
    }

    // Update fields
    if (input.userTitle !== undefined) rosterEntry.userTitle = input.userTitle;
    if (input.userRole !== undefined)
      rosterEntry.userRole = input.userRole as
        | 'owner'
        | 'co-owner'
        | 'editor'
        | 'basic'
        | 'pending';
    if (input.avatarAsset !== undefined) {
      if (input.avatarAsset) {
        rosterEntry.avatarAsset = new Types.ObjectId(input.avatarAsset);
      } else {
        delete rosterEntry.avatarAsset;
      }
    }
    if (input.userCovenName !== undefined)
      rosterEntry.userCovenName = input.userCovenName;
    if (input.userCovenBio !== undefined)
      rosterEntry.userCovenBio = input.userCovenBio;

    await rosterEntry.save();
    await rosterEntry.populate('user');
    await rosterEntry.populate('avatarAsset');

    return {
      success: true,
      message: 'Roster entry updated successfully',
      rosterEntry: rosterEntry as unknown as CovenRosterType,
    };
  }
}
