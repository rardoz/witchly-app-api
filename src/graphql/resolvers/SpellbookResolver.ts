import 'reflect-metadata';
import { Types } from 'mongoose';
import { Arg, Ctx, ID, Mutation, Query, Resolver } from 'type-graphql';
import { GraphQLContext } from '../../middleware/auth.middleware';
import { Spellbook } from '../../models/Spellbook';
import { SpellbookPage } from '../../models/SpellbookPage';
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../utils/errors';
import {
  CreateSpellbookInput,
  CreateSpellbookPageInput,
  UpdateSpellbookInput,
  UpdateSpellbookPageInput,
} from '../inputs/SpellbookInput';
import {
  DeleteResponse,
  SpellbookPageResponse,
  SpellbookPageType,
  SpellbookResponse,
  SpellbookType,
} from '../types/SpellbookTypes';

@Resolver(() => SpellbookType)
export class SpellbookResolver {
  // Query: Get all spellbooks with pagination and filters
  @Query(() => [SpellbookType])
  async spellbooks(
    @Ctx() context: GraphQLContext,
    @Arg('limit', { nullable: true, defaultValue: 10 }) limit: number,
    @Arg('offset', { nullable: true, defaultValue: 0 }) offset: number,
    @Arg('status', { nullable: true }) status?: string,
    @Arg('visibility', { nullable: true }) visibility?: string
  ): Promise<SpellbookType[]> {
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
      if (!['active', 'pending', 'deleted'].includes(status)) {
        throw new ValidationError('Invalid status value');
      }
      filter.status = status;
    }
    if (visibility) {
      if (!['public', 'private'].includes(visibility)) {
        throw new ValidationError('Invalid visibility value');
      }
      filter.visibility = visibility;
    }

    // Check if user is admin
    const isAdmin = context.hasUserScope('admin');

    // If not admin, apply permission filters
    if (!isAdmin && context.userId) {
      // Non-admin users can only see:
      // 1. Public spellbooks
      // 2. Private spellbooks where they are the owner
      // 3. Private spellbooks where they are in allowedUsers
      filter.$or = [
        { visibility: 'public' },
        { user: new Types.ObjectId(context.userId) },
        { allowedUsers: new Types.ObjectId(context.userId) },
      ];
    }

    const spellbooks = await Spellbook.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate('user')
      .populate('primaryAsset')
      .populate('backgroundAsset');

    return spellbooks as unknown as SpellbookType[];
  }

  // Query: Get single spellbook by ID
  @Query(() => SpellbookType, { nullable: true })
  async spellbook(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string
  ): Promise<SpellbookType | null> {
    context.hasUserWriteAppWriteScope(context);

    const spellbook = await Spellbook.findById(id)
      .populate('user')
      .populate('primaryAsset')
      .populate('backgroundAsset');

    if (!spellbook) {
      throw new NotFoundError('Spellbook not found');
    }

    // Check if user is admin
    const isAdmin = context.hasUserScope('admin');

    // If not admin, verify user has permission to view this spellbook
    if (!isAdmin && context.userId) {
      const userId = new Types.ObjectId(context.userId);
      const isPublic = spellbook.visibility === 'public';
      const isOwner = spellbook.user._id.equals(userId);
      const isAllowedUser = spellbook.allowedUsers?.some((allowedId) =>
        allowedId.equals(userId)
      );

      if (!isPublic && !isOwner && !isAllowedUser) {
        throw new NotFoundError('Spellbook not found');
      }
    }

    return spellbook as unknown as SpellbookType;
  }

  // Query: Get pages for a specific spellbook
  @Query(() => [SpellbookPageType])
  async spellbookPages(
    @Ctx() context: GraphQLContext,
    @Arg('spellbookId', () => ID) spellbookId: string,
    @Arg('limit', { nullable: true, defaultValue: 10 }) limit: number,
    @Arg('offset', { nullable: true, defaultValue: 0 }) offset: number,
    @Arg('status', { nullable: true }) status?: string,
    @Arg('visibility', { nullable: true }) visibility?: string
  ): Promise<SpellbookPageType[]> {
    context.hasUserWriteAppWriteScope(context);
    // Validate pagination
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }
    if (offset < 0) {
      throw new ValidationError('Offset must be non-negative');
    }

    // Verify spellbook exists
    const spellbook = await Spellbook.findById(spellbookId).populate('user');
    if (!spellbook) {
      throw new NotFoundError('Spellbook not found');
    }

    // Check if user is admin
    const isAdmin = context.hasUserScope('admin');

    // If not admin, verify user has permission to view this spellbook
    if (!isAdmin && context.userId) {
      const userId = new Types.ObjectId(context.userId);
      const isPublic = spellbook.visibility === 'public';
      const isOwner = spellbook.user._id.equals(userId);
      const isAllowedUser = spellbook.allowedUsers?.some((allowedId) =>
        allowedId.equals(userId)
      );

      if (!isPublic && !isOwner && !isAllowedUser) {
        throw new NotFoundError('Spellbook not found');
      }
    }

    // Build filter query
    const filter: Record<string, unknown> = { spellbook: spellbookId };
    if (status) {
      if (!['active', 'pending', 'deleted'].includes(status)) {
        throw new ValidationError('Invalid status value');
      }
      filter.status = status;
    }
    if (visibility) {
      if (!['public', 'private'].includes(visibility)) {
        throw new ValidationError('Invalid visibility value');
      }
      filter.visibility = visibility;
    }

    // If not admin, apply page-level permission filters
    if (!isAdmin && context.userId) {
      // Non-admin users can only see pages that are:
      // 1. Public pages
      // 2. Private pages where they are the owner
      // 3. Private pages where they are in allowedUsers
      filter.$or = [
        { visibility: 'public' },
        { user: new Types.ObjectId(context.userId) },
        { allowedUsers: new Types.ObjectId(context.userId) },
      ];
    }

    const pages = await SpellbookPage.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate('user')
      .populate('primaryAsset')
      .populate('backgroundAsset');

    return pages as unknown as SpellbookPageType[];
  }

  @Query(() => SpellbookPageType, { nullable: true })
  async spellbookPage(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string
  ): Promise<SpellbookPageType | null> {
    context.hasUserWriteAppWriteScope(context);

    const page = await SpellbookPage.findById(id)
      .populate('user')
      .populate('primaryAsset')
      .populate('backgroundAsset');

    if (!page) {
      throw new NotFoundError('Spellbook page not found');
    }

    // Get the parent spellbook to check permissions
    const spellbook = await Spellbook.findById(page.spellbook).populate('user');
    if (!spellbook) {
      throw new NotFoundError('Spellbook page not found');
    }

    // Check if user is admin
    const isAdmin = context.hasUserScope('admin');

    // If not admin, verify user has permission to view the parent spellbook AND the page
    if (!isAdmin && context.userId) {
      const userId = new Types.ObjectId(context.userId);

      // Check parent spellbook permissions
      const spellbookIsPublic = spellbook.visibility === 'public';
      const spellbookIsOwner = spellbook.user._id.equals(userId);
      const spellbookIsAllowedUser = spellbook.allowedUsers?.some((allowedId) =>
        allowedId.equals(userId)
      );

      if (!spellbookIsPublic && !spellbookIsOwner && !spellbookIsAllowedUser) {
        throw new NotFoundError('Spellbook page not found');
      }

      // Check page-level permissions
      const pageIsPublic = page.visibility === 'public';
      const pageIsOwner = page.user._id.equals(userId);
      const pageIsAllowedUser = page.allowedUsers?.some((allowedId) =>
        allowedId.equals(userId)
      );

      if (!pageIsPublic && !pageIsOwner && !pageIsAllowedUser) {
        throw new NotFoundError('Spellbook page not found');
      }
    }

    return page as unknown as SpellbookPageType;
  }

  // Mutation: Create new spellbook
  @Mutation(() => SpellbookResponse)
  async createSpellbook(
    @Ctx() context: GraphQLContext,
    @Arg('input') input: CreateSpellbookInput
  ): Promise<SpellbookResponse> {
    context.hasUserWriteAppWriteScope(context);

    try {
      const spellbook = new Spellbook({
        ...input,
        user: context.userId,
        status: input.status || 'pending',
        visibility: input.visibility || 'private',
      });

      await spellbook.save();

      // Populate relations
      await spellbook.populate('user');
      if (spellbook.primaryAsset) {
        await spellbook.populate('primaryAsset');
      }
      if (spellbook.backgroundAsset) {
        await spellbook.populate('backgroundAsset');
      }

      return {
        success: true,
        message: 'Spellbook created successfully',
        spellbook: spellbook as unknown as SpellbookType,
      };
    } catch (error) {
      console.error('Error creating spellbook:', error);
      throw new ValidationError('Failed to create spellbook');
    }
  }

  // Mutation: Update existing spellbook
  @Mutation(() => SpellbookResponse)
  async updateSpellbook(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string,
    @Arg('input') input: UpdateSpellbookInput
  ): Promise<SpellbookResponse> {
    context.hasUserWriteAppWriteScope(context);

    const spellbook = await Spellbook.findById(id).populate('user');
    if (!spellbook) {
      throw new NotFoundError('Spellbook not found');
    }

    // Check if user is admin or owner
    const isAdmin = context.hasUserScope('admin');
    if (!isAdmin) {
      const userId = new Types.ObjectId(context.userId);
      const isOwner = spellbook.user._id.equals(userId);

      if (!isOwner) {
        throw new UnauthorizedError(
          'You do not have permission to update this spellbook'
        );
      }
    }

    try {
      // Update fields
      Object.assign(spellbook, input);
      await spellbook.save();

      // Populate relations
      await spellbook.populate('user');
      if (spellbook.primaryAsset) {
        await spellbook.populate('primaryAsset');
      }
      if (spellbook.backgroundAsset) {
        await spellbook.populate('backgroundAsset');
      }

      return {
        success: true,
        message: 'Spellbook updated successfully',
        spellbook: spellbook as unknown as SpellbookType,
      };
    } catch (error) {
      console.error('Error updating spellbook:', error);
      throw new ValidationError('Failed to update spellbook');
    }
  }

  // Mutation: Create new spellbook page
  @Mutation(() => SpellbookPageResponse)
  async createSpellbookPage(
    @Ctx() context: GraphQLContext,
    @Arg('input') input: CreateSpellbookPageInput
  ): Promise<SpellbookPageResponse> {
    context.hasUserWriteAppWriteScope(context);

    // Verify spellbook exists
    const spellbook = await Spellbook.findById(input.spellbook).populate(
      'user'
    );
    if (!spellbook) {
      throw new NotFoundError('Spellbook not found');
    }

    // Check if user is admin or owner of the spellbook
    const isAdmin = context.hasUserScope('admin');
    if (!isAdmin) {
      const userId = new Types.ObjectId(context.userId);
      const isOwner = spellbook.user._id.equals(userId);

      if (!isOwner) {
        throw new UnauthorizedError(
          'You do not have permission to add pages to this spellbook'
        );
      }
    }

    try {
      const page = new SpellbookPage({
        ...input,
        user: context.userId,
        status: input.status || 'pending',
        visibility: input.visibility || 'private',
      });

      await page.save();

      // Add page to spellbook's pages array
      if (!spellbook.pages) {
        spellbook.pages = [];
      }
      spellbook.pages.push(page._id as Types.ObjectId);
      await spellbook.save();

      // Populate relations
      await page.populate('user');
      if (page.primaryAsset) {
        await page.populate('primaryAsset');
      }
      if (page.backgroundAsset) {
        await page.populate('backgroundAsset');
      }

      return {
        success: true,
        message: 'Spellbook page created successfully',
        spellbookPage: page as unknown as SpellbookPageType,
      };
    } catch (error) {
      console.error('Error creating spellbook page:', error);
      throw new ValidationError('Failed to create spellbook page');
    }
  }

  // Mutation: Update existing spellbook page
  @Mutation(() => SpellbookPageResponse)
  async updateSpellbookPage(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string,
    @Arg('input') input: UpdateSpellbookPageInput
  ): Promise<SpellbookPageResponse> {
    context.hasUserWriteAppWriteScope(context);
    const page = await SpellbookPage.findById(id).populate('user');
    if (!page) {
      throw new NotFoundError('Spellbook page not found');
    }

    // Check if user is admin or owner
    const isAdmin = context.hasUserScope('admin');
    if (!isAdmin) {
      const userId = new Types.ObjectId(context.userId);
      const isOwner = page.user._id.equals(userId);

      if (!isOwner) {
        throw new UnauthorizedError(
          'You do not have permission to update this spellbook'
        );
      }
    }

    try {
      // Update fields
      Object.assign(page, input);
      await page.save();

      // Populate relations
      await page.populate('user');
      if (page.primaryAsset) {
        await page.populate('primaryAsset');
      }
      if (page.backgroundAsset) {
        await page.populate('backgroundAsset');
      }

      return {
        success: true,
        message: 'Spellbook page updated successfully',
        spellbookPage: page as unknown as SpellbookPageType,
      };
    } catch (error) {
      console.error('Error updating spellbook page:', error);
      throw new ValidationError('Failed to update spellbook page');
    }
  }

  // Mutation: Soft delete spellbook (set status to deleted)
  @Mutation(() => DeleteResponse)
  async softDeleteSpellbook(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string
  ): Promise<DeleteResponse> {
    context.hasUserWriteAppWriteScope(context);

    const spellbook = await Spellbook.findById(id).populate('user');
    if (!spellbook) {
      throw new NotFoundError('Spellbook not found');
    }

    // Check if user is admin or owner
    const isAdmin = context.hasUserScope('admin');
    if (!isAdmin) {
      const userId = new Types.ObjectId(context.userId);
      const isOwner = spellbook.user._id.equals(userId);

      if (!isOwner) {
        throw new UnauthorizedError(
          'You do not have permission to update this spellbook'
        );
      }
    }

    spellbook.status = 'deleted';
    await spellbook.save();

    return {
      success: true,
      message: 'Spellbook soft deleted successfully',
    };
  }

  // Mutation: Hard delete spellbook (remove from database)
  @Mutation(() => DeleteResponse)
  async hardDeleteSpellbook(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string
  ): Promise<DeleteResponse> {
    context.hasUserWriteAppWriteScope(context);

    const spellbook = await Spellbook.findById(id).populate('user');
    if (!spellbook) {
      throw new NotFoundError('Spellbook not found');
    }

    // Check if user is admin or owner
    const isAdmin = context.hasUserScope('admin');
    if (!isAdmin) {
      const userId = new Types.ObjectId(context.userId);
      const isOwner = spellbook.user._id.equals(userId);

      if (!isOwner) {
        throw new UnauthorizedError(
          'You do not have permission to update this spellbook'
        );
      }
    }

    // Remove all pages associated with this spellbook
    await SpellbookPage.deleteMany({ spellbook: id });

    // Delete the spellbook
    await Spellbook.findByIdAndDelete(id);

    return {
      success: true,
      message: 'Spellbook and all its pages permanently deleted',
    };
  }

  // Mutation: Soft delete spellbook page (set status to deleted)
  @Mutation(() => DeleteResponse)
  async softDeleteSpellbookPage(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string
  ): Promise<DeleteResponse> {
    context.hasUserWriteAppWriteScope(context);

    const page = await SpellbookPage.findById(id).populate('user');
    if (!page) {
      throw new NotFoundError('Spellbook page not found');
    }

    // Check if user is admin or owner
    const isAdmin = context.hasUserScope('admin');
    if (!isAdmin) {
      const userId = new Types.ObjectId(context.userId);
      const isOwner = page.user._id.equals(userId);

      if (!isOwner) {
        throw new UnauthorizedError(
          'You do not have permission to update this spellbook'
        );
      }
    }

    page.status = 'deleted';
    await page.save();

    return {
      success: true,
      message: 'Spellbook page soft deleted successfully',
    };
  }

  // Mutation: Hard delete spellbook page (remove from database)
  @Mutation(() => DeleteResponse)
  async hardDeleteSpellbookPage(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string
  ): Promise<DeleteResponse> {
    context.hasUserWriteAppWriteScope(context);

    const page = await SpellbookPage.findById(id).populate('user');
    if (!page) {
      throw new NotFoundError('Spellbook page not found');
    }

    // Check if user is admin or owner
    const isAdmin = context.hasUserScope('admin');
    if (!isAdmin) {
      const userId = new Types.ObjectId(context.userId);
      const isOwner = page.user._id.equals(userId);

      if (!isOwner) {
        throw new UnauthorizedError(
          'You do not have permission to update this spellbook'
        );
      }
    }

    // Remove page reference from spellbook
    await Spellbook.updateOne(
      { _id: page.spellbook },
      { $pull: { pages: page._id } }
    );

    // Delete the page
    await SpellbookPage.findByIdAndDelete(id);

    return {
      success: true,
      message: 'Spellbook page permanently deleted',
    };
  }
}
