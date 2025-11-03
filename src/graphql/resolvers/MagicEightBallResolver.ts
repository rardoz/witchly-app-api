import { Document, Types } from 'mongoose';
import { Arg, Ctx, ID, Int, Mutation, Query, Resolver } from 'type-graphql';
import { GraphQLContext } from '../../middleware/auth.middleware';
import { MagicEightBall } from '../../models/MagicEightBall';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../utils/errors';
import {
  CreateMagicEightBallInput,
  UpdateMagicEightBallInput,
} from '../inputs/MagicEightBallInput';
import {
  CreateMagicEightBallResponse,
  DeleteMagicEightBallResponse,
  MagicEightBallType,
  UpdateMagicEightBallResponse,
} from '../types/MagicEightBallTypes';

@Resolver(() => MagicEightBallType)
export class MagicEightBallResolver {
  @Query(() => [MagicEightBallType])
  async magicEightBallSides(
    @Ctx() context: GraphQLContext,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 10 })
    limit: number,
    @Arg('offset', () => Int, { nullable: true, defaultValue: 0 })
    offset: number,
    @Arg('status', () => String, { nullable: true })
    status: 'active' | 'paused' | 'deleted',
    @Arg('locale', () => String, { nullable: true })
    locale?: string
  ): Promise<MagicEightBallType[]> {
    context.hasUserReadAppReadScope(context);

    // Validate pagination parameters
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }

    if (offset < 0) {
      throw new ValidationError('Offset must be non-negative');
    }

    const filter = {} as { status?: string; locale?: string };
    if (locale) {
      filter.locale = locale;
    }
    if (status) {
      filter.status = status;
    }

    const sides = await MagicEightBall.find(filter)
      .sort({ diceNumber: 1 })
      .skip(offset)
      .limit(limit)
      .populate('primaryAsset')
      .populate('backgroundAsset')
      .populate('user');

    return sides as unknown as MagicEightBallType[];
  }

  @Query(() => MagicEightBallType)
  async magicEightBallSide(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID, { nullable: true }) id?: string,
    @Arg('diceNumber', () => Int, { nullable: true }) diceNumber?: number,
    @Arg('locale', () => String, { nullable: true }) locale?: string
  ): Promise<MagicEightBallType> {
    context.hasUserReadAppReadScope(context);

    // Must provide either id OR (diceNumber + locale)
    if (!id && (!diceNumber || !locale)) {
      throw new ValidationError(
        'Must provide either id OR both diceNumber and locale'
      );
    }

    let side: Document | null = null;

    if (id) {
      // Find by ID
      if (!Types.ObjectId.isValid(id)) {
        throw new ValidationError('Invalid magic eight ball side ID format');
      }
      side = await MagicEightBall.findById(id)
        .populate('primaryAsset')
        .populate('backgroundAsset')
        .populate('user');
    } else {
      // Find by diceNumber + locale
      side = await MagicEightBall.findOne({
        diceNumber,
        locale,
        status: 'active',
      })
        .populate('primaryAsset')
        .populate('backgroundAsset')
        .populate('user');
    }

    if (!side) {
      throw new NotFoundError('Magic eight ball side not found');
    }

    return side as unknown as MagicEightBallType;
  }

  @Mutation(() => CreateMagicEightBallResponse)
  async createMagicEightBallSide(
    @Ctx() context: GraphQLContext,
    @Arg('input') input: CreateMagicEightBallInput
  ): Promise<CreateMagicEightBallResponse> {
    context.hasUserAdminWriteAppWriteScope(context);

    // Check if side with same diceNumber + locale already exists
    const existingSide = await MagicEightBall.findOne({
      diceNumber: input.diceNumber,
      locale: input.locale,
    });
    if (existingSide) {
      throw new ConflictError(
        'A magic eight ball side with this dice number and locale already exists'
      );
    }

    // Validate diceNumber
    if (input.diceNumber < 1 || input.diceNumber > 20) {
      throw new ValidationError('Dice number must be between 1 and 20');
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
      const side = new MagicEightBall({
        name: input.name,
        locale: input.locale,
        primaryAsset: input.primaryAsset,
        backgroundAsset: input.backgroundAsset,
        primaryColor: input.primaryColor,
        description: input.description,
        diceNumber: input.diceNumber,
        status: input.status || 'active',
        user: context.userId,
      });

      await side.save();

      await side.populate('primaryAsset');
      await side.populate('backgroundAsset');
      await side.populate('user');

      return {
        side: side as unknown as MagicEightBallType,
        success: true,
        message: 'Magic eight ball side created successfully',
      } as CreateMagicEightBallResponse;
    } catch (error) {
      console.error('Error creating magic eight ball side:', error);
      throw new ValidationError(
        'Failed to create magic eight ball side. Please check your input.'
      );
    }
  }

  @Mutation(() => UpdateMagicEightBallResponse)
  async updateMagicEightBallSide(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string,
    @Arg('input') input: UpdateMagicEightBallInput
  ): Promise<UpdateMagicEightBallResponse> {
    context.hasUserAdminWriteAppWriteScope(context);

    if (!Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid magic eight ball side ID format');
    }

    const side = await MagicEightBall.findById(id);
    if (!side) {
      throw new NotFoundError('Magic eight ball side not found');
    }

    // Check if updating diceNumber+locale conflicts with existing side
    if (
      (input.diceNumber !== undefined || input.locale !== undefined) &&
      (input.diceNumber !== side.diceNumber || input.locale !== side.locale)
    ) {
      const checkDiceNumber = input.diceNumber ?? side.diceNumber;
      const checkLocale = input.locale ?? side.locale;

      const existingSide = await MagicEightBall.findOne({
        diceNumber: checkDiceNumber,
        locale: checkLocale,
        _id: { $ne: id },
      });
      if (existingSide) {
        throw new ConflictError(
          'A magic eight ball side with this dice number and locale already exists'
        );
      }
    }

    // Validate diceNumber if provided
    if (
      input.diceNumber !== undefined &&
      (input.diceNumber < 1 || input.diceNumber > 20)
    ) {
      throw new ValidationError('Dice number must be between 1 and 20');
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
      if (input.name !== undefined) side.name = input.name;
      if (input.locale !== undefined) side.locale = input.locale;
      if (input.primaryAsset !== undefined)
        side.primaryAsset = new Types.ObjectId(input.primaryAsset);
      if (input.backgroundAsset !== undefined)
        side.backgroundAsset = new Types.ObjectId(input.backgroundAsset);
      if (input.primaryColor !== undefined)
        side.primaryColor = input.primaryColor;
      if (input.description !== undefined) side.description = input.description;
      if (input.diceNumber !== undefined) side.diceNumber = input.diceNumber;
      if (input.status !== undefined)
        side.status = input.status as 'active' | 'paused' | 'deleted';

      side.user = new Types.ObjectId(context.userId);

      await side.save();
      await side.populate('primaryAsset');
      await side.populate('backgroundAsset');
      await side.populate('user');

      return {
        side: side as unknown as MagicEightBallType,
        success: true,
        message: 'Magic eight ball side updated successfully',
      } as UpdateMagicEightBallResponse;
    } catch (error) {
      console.error('Error updating magic eight ball side:', error);
      throw new ValidationError(
        'Failed to update magic eight ball side. Please check your input.'
      );
    }
  }

  @Mutation(() => DeleteMagicEightBallResponse)
  async softDeleteMagicEightBallSide(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string
  ): Promise<DeleteMagicEightBallResponse> {
    context.hasUserAdminWriteAppWriteScope(context);

    if (!Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid magic eight ball side ID format');
    }

    const side = await MagicEightBall.findById(id);
    if (!side) {
      throw new NotFoundError('Magic eight ball side not found');
    }

    try {
      side.status = 'deleted';
      await side.save();

      return {
        success: true,
        message: 'Magic eight ball side soft deleted successfully',
      };
    } catch (error) {
      console.error('Error soft deleting magic eight ball side:', error);
      throw new ValidationError('Failed to soft delete magic eight ball side');
    }
  }

  @Mutation(() => DeleteMagicEightBallResponse)
  async hardDeleteMagicEightBallSide(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string
  ): Promise<DeleteMagicEightBallResponse> {
    context.hasUserAdminWriteAppWriteScope(context);

    if (!Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid magic eight ball side ID format');
    }

    const side = await MagicEightBall.findById(id);
    if (!side) {
      throw new NotFoundError('Magic eight ball side not found');
    }

    try {
      await MagicEightBall.findByIdAndDelete(id);

      return {
        success: true,
        message: 'Magic eight ball side permanently deleted',
      };
    } catch (error) {
      console.error('Error hard deleting magic eight ball side:', error);
      throw new ValidationError(
        'Failed to permanently delete magic eight ball side'
      );
    }
  }
}
