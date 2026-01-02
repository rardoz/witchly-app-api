import { Types } from 'mongoose';
import { Arg, Ctx, ID, Int, Mutation, Query, Resolver } from 'type-graphql';
import { GraphQLContext } from '../../middleware/auth.middleware';
import { TarotDeck } from '../../models/TarotDeck';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../utils/errors';
import {
  CreateTarotDeckInput,
  UpdateTarotDeckInput,
} from '../inputs/TarotInput';
import {
  CreateTarotDeckResponse,
  DeleteTarotDeckResponse,
  TarotDecksResponse,
  TarotDeckType,
  UpdateTarotDeckResponse,
} from '../types/TarotTypes';

@Resolver(() => TarotDecksResponse)
export class TarotDeckResolver {
  @Query(() => TarotDecksResponse)
  async tarotDecks(
    @Ctx() context: GraphQLContext,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 10 })
    limit: number,
    @Arg('offset', () => Int, { nullable: true, defaultValue: 0 })
    offset: number,
    @Arg('status', () => String, { nullable: true })
    status: 'active' | 'paused' | 'deleted',
    @Arg('locale', () => String, { nullable: true })
    locale: string
  ): Promise<TarotDecksResponse> {
    context.hasUserReadAppReadScope(context);

    // Validate pagination parameters
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }

    if (offset < 0) {
      throw new ValidationError('Offset must be non-negative');
    }

    const filter: { status?: string; locale?: string } = {};
    if (locale) filter.locale = locale;
    if (status) filter.status = status;

    const [decks, totalCount] = await Promise.all([
      TarotDeck.find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .populate('primaryAsset')
        .populate('cardBackgroundAsset')
        .populate('user'),
      TarotDeck.countDocuments(filter),
    ]);
    return {
      records: decks as unknown as TarotDeckType[],
      totalCount,
      limit,
      offset,
    };
  }

  @Query(() => TarotDeckType)
  async tarotDeck(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string
  ): Promise<TarotDeckType> {
    context.hasUserReadAppReadScope(context);

    const deck = await TarotDeck.findById(id)
      .populate('primaryAsset')
      .populate('cardBackgroundAsset')
      .populate('user');

    if (!deck) {
      throw new NotFoundError('Tarot deck not found');
    }

    return deck as unknown as TarotDeckType;
  }

  @Mutation(() => CreateTarotDeckResponse)
  async createTarotDeck(
    @Ctx() context: GraphQLContext,
    @Arg('input') input: CreateTarotDeckInput
  ): Promise<CreateTarotDeckResponse> {
    context.hasUserAdminWriteAppWriteScope(context);

    // Check if deck with same name already exists
    const existingDeck = await TarotDeck.findOne({
      name: input.name,
      locale: input.locale,
    });
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
    if (
      input.status &&
      !['active', 'paused', 'deleted'].includes(input.status)
    ) {
      throw new ValidationError(
        'Status must be either "active", "paused", or "deleted"'
      );
    }

    try {
      const deck = new TarotDeck({
        name: input.name,
        locale: input.locale,
        primaryAsset: input.primaryAsset,
        cardBackgroundAsset: input.cardBackgroundAsset,
        primaryColor: input.primaryColor,
        description: input.description,
        author: input.author,
        meta: input.meta || [],
        layoutType: input.layoutType || 'default',
        layoutCount: input.layoutCount || 1,
        status: input.status || 'active',
        user: context.userId,
      });

      await deck.save();

      await deck.populate('primaryAsset');
      await deck.populate('cardBackgroundAsset');
      await deck.populate('user');
      return {
        deck: deck as unknown as TarotDeckType,
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
    context.hasUserAdminWriteAppWriteScope(context);

    const deck = await TarotDeck.findById(id);
    if (!deck) {
      throw new NotFoundError('Tarot deck not found');
    }

    // Check if updating name and it conflicts with existing deck
    if (input.name && input.name !== deck.name) {
      const existingDeck = await TarotDeck.findOne({
        name: input.name,
        locale: input.locale,
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
    if (
      input.status &&
      !['active', 'paused', 'deleted'].includes(input.status)
    ) {
      throw new ValidationError(
        'Status must be either "active", "paused", or "deleted"'
      );
    }

    try {
      // Update only provided fields
      if (input.name !== undefined) deck.name = input.name;
      if (input.locale !== undefined) deck.locale = input.locale;
      if (input.primaryAsset !== undefined) {
        if (!input.primaryAsset) {
          deck.primaryAsset = null;
        } else {
          deck.primaryAsset = new Types.ObjectId(input.primaryAsset);
        }
      }
      if (input.cardBackgroundAsset !== undefined) {
        if (!input.cardBackgroundAsset) {
          deck.cardBackgroundAsset = null;
        } else {
          deck.cardBackgroundAsset = new Types.ObjectId(
            input.cardBackgroundAsset
          );
        }
      }
      if (input.primaryColor !== undefined)
        deck.primaryColor = input.primaryColor;
      if (input.description !== undefined) deck.description = input.description;
      if (input.author !== undefined) deck.author = input.author;
      if (input.meta !== undefined) deck.meta = input.meta;
      if (input.layoutType !== undefined) deck.layoutType = input.layoutType;
      if (input.layoutCount !== undefined) deck.layoutCount = input.layoutCount;
      if (input.status !== undefined) deck.status = input.status;
      deck.user = new Types.ObjectId(context.userId);
      await deck.save();
      await deck.populate('primaryAsset');
      await deck.populate('cardBackgroundAsset');
      await deck.populate('user');
      return {
        deck: deck as unknown as TarotDeckType,
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
    context.hasUserAdminWriteAppWriteScope(context);

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
        // Soft delete by setting status to deleted
        deck.status = 'deleted';
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
