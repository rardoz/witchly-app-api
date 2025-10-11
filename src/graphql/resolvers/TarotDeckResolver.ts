import { Arg, Ctx, ID, Int, Mutation, Query, Resolver } from 'type-graphql';
import { GraphQLContext } from '../../middleware/auth.middleware';
import { TarotDeck } from '../../models/TarotDeck';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../utils/errors';
import {
  CreateTarotDeckInput,
  UpdateTarotDeckInput,
} from '../inputs/TarotInput';
import {
  CreateTarotDeckResponse,
  DeleteTarotDeckResponse,
  TarotDeckType,
  UpdateTarotDeckResponse,
} from '../types/TarotTypes';

@Resolver(() => TarotDeckType)
export class TarotDeckResolver {
  @Query(() => [TarotDeckType])
  async tarotDecks(
    @Ctx() context: GraphQLContext,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 10 })
    limit: number,
    @Arg('offset', () => Int, { nullable: true, defaultValue: 0 })
    offset: number,
    @Arg('status', () => String, { nullable: true, defaultValue: 'active' })
    status: 'active' | 'paused'
  ): Promise<TarotDeckType[]> {
    if (!context.isAuthenticated || !context.hasScope('read')) {
      throw new UnauthorizedError('Read access required');
    }

    // Validate pagination parameters
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }

    if (offset < 0) {
      throw new ValidationError('Offset must be non-negative');
    }

    const filter = { status };

    const decks = await TarotDeck.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    return decks as TarotDeckType[];
  }

  @Query(() => TarotDeckType)
  async tarotDeck(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string
  ): Promise<TarotDeckType> {
    if (!context.isAuthenticated || !context.hasScope('read')) {
      throw new UnauthorizedError('Read access required');
    }

    const deck = await TarotDeck.findById(id);
    if (!deck) {
      throw new NotFoundError('Tarot deck not found');
    }

    return deck as TarotDeckType;
  }

  @Mutation(() => CreateTarotDeckResponse)
  async createTarotDeck(
    @Ctx() context: GraphQLContext,
    @Arg('input') input: CreateTarotDeckInput
  ): Promise<CreateTarotDeckResponse> {
    if (!context.isAuthenticated || !context.hasScope('write')) {
      throw new UnauthorizedError('Write access required');
    }

    // Check for admin session scope
    if (!context.isUserAuthenticated || !context.hasUserScope('admin')) {
      throw new UnauthorizedError(
        'Admin session access required to create tarot decks'
      );
    }

    // Check if deck with same name already exists
    const existingDeck = await TarotDeck.findOne({ name: input.name });
    if (existingDeck) {
      throw new ConflictError('A tarot deck with this name already exists');
    }

    // Validate layoutCount if provided
    if (
      input.layoutCount !== undefined &&
      (input.layoutCount < 1 || input.layoutCount > 50)
    ) {
      throw new ValidationError('Layout count must be between 1 and 50');
    }

    // Validate status if provided
    if (input.status && !['active', 'paused'].includes(input.status)) {
      throw new ValidationError('Status must be either "active" or "paused"');
    }

    try {
      const deck = new TarotDeck({
        name: input.name,
        primaryImageUrl: input.primaryImageUrl,
        cardBackgroundUrl: input.cardBackgroundUrl,
        primaryColor: input.primaryColor,
        description: input.description,
        author: input.author,
        meta: input.meta || [],
        layoutType: input.layoutType || 'default',
        layoutCount: input.layoutCount || 1,
        status: input.status || 'active',
      });

      await deck.save();

      return {
        id: deck.id,
        name: deck.name,
        primaryImageUrl: deck.primaryImageUrl,
        cardBackgroundUrl: deck.cardBackgroundUrl,
        primaryColor: deck.primaryColor,
        description: deck.description,
        author: deck.author,
        meta: deck.meta,
        layoutType: deck.layoutType,
        layoutCount: deck.layoutCount,
        status: deck.status,
        createdAt: deck.createdAt,
        updatedAt: deck.updatedAt,
        success: true,
        message: 'Tarot deck created successfully',
      } as CreateTarotDeckResponse;
    } catch (error) {
      console.error('Error creating tarot deck:', error);
      throw new ValidationError(
        'Failed to create tarot deck. Please check your input.'
      );
    }
  }

  @Mutation(() => UpdateTarotDeckResponse)
  async updateTarotDeck(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string,
    @Arg('input') input: UpdateTarotDeckInput
  ): Promise<UpdateTarotDeckResponse> {
    if (!context.isAuthenticated || !context.hasScope('write')) {
      throw new UnauthorizedError('Write access required');
    }

    // Check for admin session scope
    if (!context.isUserAuthenticated || !context.hasUserScope('admin')) {
      throw new UnauthorizedError(
        'Admin session access required to update tarot decks'
      );
    }

    const deck = await TarotDeck.findById(id);
    if (!deck) {
      throw new NotFoundError('Tarot deck not found');
    }

    // Check if updating name and it conflicts with existing deck
    if (input.name && input.name !== deck.name) {
      const existingDeck = await TarotDeck.findOne({
        name: input.name,
        _id: { $ne: id },
      });
      if (existingDeck) {
        throw new ConflictError('A tarot deck with this name already exists');
      }
    }

    // Validate layoutCount if provided
    if (
      input.layoutCount !== undefined &&
      (input.layoutCount < 1 || input.layoutCount > 50)
    ) {
      throw new ValidationError('Layout count must be between 1 and 50');
    }

    // Validate status if provided
    if (input.status && !['active', 'paused'].includes(input.status)) {
      throw new ValidationError('Status must be either "active" or "paused"');
    }

    try {
      // Update only provided fields
      if (input.name !== undefined) deck.name = input.name;
      if (input.primaryImageUrl !== undefined)
        deck.primaryImageUrl = input.primaryImageUrl;
      if (input.primaryColor !== undefined)
        deck.primaryColor = input.primaryColor;
      if (input.description !== undefined) deck.description = input.description;
      if (input.author !== undefined) deck.author = input.author;
      if (input.meta !== undefined) deck.meta = input.meta;
      if (input.layoutType !== undefined) deck.layoutType = input.layoutType;
      if (input.layoutCount !== undefined) deck.layoutCount = input.layoutCount;
      if (input.status !== undefined) deck.status = input.status;

      await deck.save();

      return {
        id: deck.id,
        name: deck.name,
        primaryImageUrl: deck.primaryImageUrl,
        cardBackgroundUrl: deck.cardBackgroundUrl,
        primaryColor: deck.primaryColor,
        description: deck.description,
        author: deck.author,
        meta: deck.meta,
        layoutType: deck.layoutType,
        layoutCount: deck.layoutCount,
        status: deck.status,
        createdAt: deck.createdAt,
        updatedAt: deck.updatedAt,
        success: true,
        message: 'Tarot deck updated successfully',
      } as UpdateTarotDeckResponse;
    } catch (error) {
      console.error('Error updating tarot deck:', error);
      throw new ValidationError(
        'Failed to update tarot deck. Please check your input.'
      );
    }
  }

  @Mutation(() => DeleteTarotDeckResponse)
  async deleteTarotDeck(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string,
    @Arg('hardDelete', () => Boolean, { nullable: true, defaultValue: false })
    hardDelete: boolean
  ): Promise<DeleteTarotDeckResponse> {
    if (!context.isAuthenticated || !context.hasScope('write')) {
      throw new UnauthorizedError('Write access required');
    }

    const deck = await TarotDeck.findById(id);
    if (!deck) {
      throw new NotFoundError('Tarot deck not found');
    }

    try {
      if (hardDelete) {
        // Permanent deletion
        await TarotDeck.findByIdAndDelete(id);
        return {
          success: true,
          message: 'Tarot deck permanently deleted',
        };
      } else {
        // Soft delete by setting status to paused
        deck.status = 'paused';
        await deck.save();
        return {
          success: true,
          message: 'Tarot deck deactivated successfully',
        };
      }
    } catch (error) {
      console.error('Error deleting tarot deck:', error);
      throw new ValidationError('Failed to delete tarot deck');
    }
  }
}
