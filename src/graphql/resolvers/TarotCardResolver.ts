import { Types } from 'mongoose';
import { Arg, Ctx, ID, Int, Mutation, Query, Resolver } from 'type-graphql';
import { GraphQLContext } from '../../middleware/auth.middleware';
import { TarotCard } from '../../models/TarotCard';
import { NotFoundError, ValidationError } from '../../utils/errors';
import {
  CreateTarotCardInput,
  UpdateTarotCardInput,
} from '../inputs/TarotInput';
import {
  CreateTarotCardResponse,
  DeleteTarotCardResponse,
  TarotCardType,
  UpdateTarotCardResponse,
} from '../types/TarotTypes';

@Resolver(() => TarotCardType)
export class TarotCardResolver {
  @Query(() => [TarotCardType])
  async tarotCards(
    @Ctx() context: GraphQLContext,
    @Arg('tarotDeckId', () => ID) tarotDeckId: string,
    @Arg('status', () => String, { nullable: true }) status?: string,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 10 })
    limit: number = 10,
    @Arg('offset', () => Int, { nullable: true, defaultValue: 0 })
    offset: number = 0
  ): Promise<TarotCardType[]> {
    context.hasUserReadAppReadScope(context);

    // Validate pagination parameters
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }

    if (offset < 0) {
      throw new ValidationError('Offset must be non-negative');
    }

    // Validate status if provided
    if (status && !['active', 'paused', 'deleted'].includes(status)) {
      throw new ValidationError(
        'Status must be either "active", "paused", or "deleted"'
      );
    }

    const filter: { tarotDeck: Types.ObjectId; status?: string } = {
      tarotDeck: new Types.ObjectId(tarotDeckId),
    };

    if (status) {
      filter.status = status;
    }

    const cards = await TarotCard.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate('primaryAsset')
      .populate('user')
      .populate('tarotDeck');

    return cards as unknown as TarotCardType[];
  }

  @Query(() => TarotCardType)
  async tarotCard(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string
  ): Promise<TarotCardType> {
    context.hasUserReadAppReadScope(context);

    const card = await TarotCard.findById(id)
      .populate('primaryAsset')
      .populate('user')
      .populate('tarotDeck');

    if (!card) {
      throw new NotFoundError('Tarot card not found');
    }

    return card as unknown as TarotCardType;
  }

  @Mutation(() => CreateTarotCardResponse)
  async createTarotCard(
    @Ctx() context: GraphQLContext,
    @Arg('input') input: CreateTarotCardInput
  ): Promise<CreateTarotCardResponse> {
    context.hasUserAdminWriteAppWriteScope(context);

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
      const card = new TarotCard({
        name: input.name,
        tarotCardNumber: input.tarotCardNumber,
        primaryAsset: input.primaryAsset
          ? new Types.ObjectId(input.primaryAsset)
          : undefined,
        description: input.description,
        locale: input.locale,
        meta: input.meta || [],
        status: input.status || 'active',
        user: new Types.ObjectId(context.userId),
        tarotDeck: new Types.ObjectId(input.tarotDeck),
      });

      await card.save();
      await card.populate('tarotDeck');
      await card.populate('primaryAsset');
      await card.populate('user');

      return {
        card: card as unknown as TarotCardType,
        success: true,
        message: 'Tarot card created successfully',
      };
    } catch (error) {
      console.error('Error creating tarot card:', error);
      throw new ValidationError(
        'Failed to create tarot card. Please check your input.'
      );
    }
  }

  @Mutation(() => UpdateTarotCardResponse)
  async updateTarotCard(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string,
    @Arg('input') input: UpdateTarotCardInput
  ): Promise<UpdateTarotCardResponse> {
    context.hasUserAdminWriteAppWriteScope(context);

    const card = await TarotCard.findById(id);
    if (!card) {
      throw new NotFoundError('Tarot card not found');
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
      if (input.name !== undefined) card.name = input.name;
      if (input.tarotCardNumber !== undefined)
        card.tarotCardNumber = input.tarotCardNumber;
      if (input.primaryAsset !== undefined)
        card.primaryAsset = new Types.ObjectId(input.primaryAsset);
      if (input.description !== undefined) card.description = input.description;
      if (input.locale !== undefined) card.locale = input.locale;
      if (input.meta !== undefined) card.meta = input.meta;
      if (input.status !== undefined) card.status = input.status;
      if (input.tarotDeck !== undefined)
        card.tarotDeck = new Types.ObjectId(input.tarotDeck);

      card.user = new Types.ObjectId(context.userId);

      await card.save();
      await card.populate('primaryAsset');
      await card.populate('user');
      await card.populate('tarotDeck');

      return {
        card: card as unknown as TarotCardType,
        success: true,
        message: 'Tarot card updated successfully',
      };
    } catch (error) {
      console.error('Error updating tarot card:', error);
      throw new ValidationError(
        'Failed to update tarot card. Please check your input.'
      );
    }
  }

  @Mutation(() => DeleteTarotCardResponse)
  async softDeleteTarotCard(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string
  ): Promise<DeleteTarotCardResponse> {
    context.hasUserAdminWriteAppWriteScope(context);

    const card = await TarotCard.findById(id);
    if (!card) {
      throw new NotFoundError('Tarot card not found');
    }

    try {
      // Soft delete by setting status to deleted
      card.status = 'deleted';
      await card.save();

      return {
        success: true,
        message: 'Tarot card soft deleted successfully',
      };
    } catch (error) {
      console.error('Error soft deleting tarot card:', error);
      throw new ValidationError('Failed to soft delete tarot card');
    }
  }

  @Mutation(() => DeleteTarotCardResponse)
  async hardDeleteTarotCard(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string
  ): Promise<DeleteTarotCardResponse> {
    context.hasUserAdminWriteAppWriteScope(context);

    const card = await TarotCard.findById(id);
    if (!card) {
      throw new NotFoundError('Tarot card not found');
    }

    try {
      // Permanent deletion from database
      await TarotCard.findByIdAndDelete(id);

      return {
        success: true,
        message: 'Tarot card permanently deleted',
      };
    } catch (error) {
      console.error('Error hard deleting tarot card:', error);
      throw new ValidationError('Failed to hard delete tarot card');
    }
  }
}
