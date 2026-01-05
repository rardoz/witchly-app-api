import { Types } from 'mongoose';
import { Arg, Ctx, ID, Mutation, Query, Resolver } from 'type-graphql';
import { type GraphQLContext } from '../../middleware/auth.middleware';
import { MoonPhase } from '../../models/MoonPhase';
import { NotFoundError, ValidationError } from '../../utils/errors';
import {
  CreateMoonPhaseInput,
  UpdateMoonPhaseInput,
} from '../inputs/MoonPhaseInput';
import {
  CreateMoonPhaseResponse,
  DeleteMoonPhaseResponse,
  MoonPhaseResponse,
  MoonPhaseType,
  UpdateMoonPhaseResponse,
} from '../types/MoonPhaseTypes';

@Resolver(() => MoonPhaseType)
export class MoonPhaseResolver {
  @Query(() => MoonPhaseResponse)
  async moonPhases(
    @Ctx() context: GraphQLContext,
    @Arg('locale', () => String, { nullable: true }) locale?: string,
    @Arg('status', () => String, { nullable: true }) status?: string,
    @Arg('phase', () => String, { nullable: true }) phase?: string,
    @Arg('limit', () => Number, { nullable: true, defaultValue: 10 })
    limit?: number,
    @Arg('offset', () => Number, { nullable: true, defaultValue: 0 })
    offset?: number
  ): Promise<MoonPhaseResponse> {
    context.hasUserReadAppReadScope(context);

    // Validate pagination parameters
    if (limit && (limit < 1 || limit > 100)) {
      throw new ValidationError('Limit must be between 1 and 100');
    }

    if (offset && offset < 0) {
      throw new ValidationError('Offset must be non-negative');
    }

    // Build filter
    const filter: Record<string, unknown> = {};

    if (locale) {
      filter.locale = locale;
    }

    if (phase) {
      filter.phase = phase;
    }

    if (status) {
      if (!['active', 'paused', 'deleted'].includes(status)) {
        throw new ValidationError(
          'Status must be either "active", "paused", or "deleted"'
        );
      }
      filter.status = status;
    }

    const [moonPhases, totalCount] = await Promise.all([
      MoonPhase.find(filter)
        .populate('primaryAsset')
        .populate('backgroundAsset')
        .populate('user')
        .skip(offset || 0)
        .limit(limit || 10)
        .sort({ createdAt: -1 }),
      MoonPhase.countDocuments(filter),
    ]);

    return {
      records: moonPhases as unknown as MoonPhaseType[],
      totalCount,
      limit: limit || 10,
      offset: offset || 0,
    };
  }

  @Query(() => MoonPhaseType)
  async moonPhase(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string
  ): Promise<MoonPhaseType> {
    context.hasUserReadAppReadScope(context);

    if (!Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid moon phase ID format');
    }

    const moonPhase = await MoonPhase.findById(id)
      .populate('primaryAsset')
      .populate('backgroundAsset')
      .populate('user');

    if (!moonPhase) {
      throw new NotFoundError('Moon phase not found');
    }

    return moonPhase as unknown as MoonPhaseType;
  }

  @Mutation(() => CreateMoonPhaseResponse)
  async createMoonPhase(
    @Ctx() context: GraphQLContext,
    @Arg('input') input: CreateMoonPhaseInput
  ): Promise<CreateMoonPhaseResponse> {
    context.hasUserAdminWriteAppWriteScope(context);

    // Validate asset IDs if provided
    if (input.primaryAsset && !Types.ObjectId.isValid(input.primaryAsset)) {
      throw new ValidationError('Invalid primary asset ID format');
    }

    if (
      input.backgroundAsset &&
      !Types.ObjectId.isValid(input.backgroundAsset)
    ) {
      throw new ValidationError('Invalid background asset ID format');
    }

    const moonPhaseData: Record<string, unknown> = {
      phase: input.phase,
      status: input.status,
    };

    if (input.locale) moonPhaseData.locale = input.locale;
    if (input.description) moonPhaseData.description = input.description;
    if (input.number !== undefined) moonPhaseData.number = input.number;
    if (input.primaryAsset)
      moonPhaseData.primaryAsset = new Types.ObjectId(input.primaryAsset);
    if (input.backgroundAsset)
      moonPhaseData.backgroundAsset = new Types.ObjectId(input.backgroundAsset);
    if (input.primaryColor) moonPhaseData.primaryColor = input.primaryColor;
    if (input.phaseLocal) moonPhaseData.phaseLocal = input.phaseLocal;

    moonPhaseData.user = new Types.ObjectId(context.userId);

    const moonPhase = new MoonPhase(moonPhaseData);
    await moonPhase.save();

    // Populate references
    await moonPhase.populate('primaryAsset');
    await moonPhase.populate('backgroundAsset');
    await moonPhase.populate('user');

    return {
      success: true,
      message: 'Moon phase created successfully',
      moonPhase: moonPhase as unknown as MoonPhaseType,
    };
  }

  @Mutation(() => UpdateMoonPhaseResponse)
  async updateMoonPhase(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string,
    @Arg('input') input: UpdateMoonPhaseInput
  ): Promise<UpdateMoonPhaseResponse> {
    context.hasUserAdminWriteAppWriteScope(context);

    if (!Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid moon phase ID format');
    }

    const moonPhase = await MoonPhase.findById(id);
    if (!moonPhase) {
      throw new NotFoundError('Moon phase not found');
    }

    // Validate asset IDs if provided
    if (input.primaryAsset && !Types.ObjectId.isValid(input.primaryAsset)) {
      throw new ValidationError('Invalid primary asset ID format');
    }

    if (
      input.backgroundAsset &&
      !Types.ObjectId.isValid(input.backgroundAsset)
    ) {
      throw new ValidationError('Invalid background asset ID format');
    }

    // Update fields
    if (input.locale !== undefined) moonPhase.locale = input.locale;
    if (input.description !== undefined)
      moonPhase.description = input.description;
    if (input.number !== undefined) moonPhase.number = input.number;
    if (input.primaryAsset !== undefined) {
      if (!input.primaryAsset) {
        moonPhase.primaryAsset = null;
      } else {
        moonPhase.primaryAsset = new Types.ObjectId(input.primaryAsset);
      }
    }
    if (input.backgroundAsset !== undefined) {
      if (!input.backgroundAsset) {
        moonPhase.backgroundAsset = null;
      } else {
        moonPhase.backgroundAsset = new Types.ObjectId(input.backgroundAsset);
      }
    }
    if (input.primaryColor !== undefined)
      moonPhase.primaryColor = input.primaryColor;
    if (input.phase !== undefined) moonPhase.phase = input.phase;
    if (input.phaseLocal !== undefined) moonPhase.phaseLocal = input.phaseLocal;
    if (input.status !== undefined)
      moonPhase.status = input.status as 'active' | 'paused' | 'deleted';

    await moonPhase.save();

    // Populate references
    await moonPhase.populate('primaryAsset');
    await moonPhase.populate('backgroundAsset');
    await moonPhase.populate('user');

    return {
      success: true,
      message: 'Moon phase updated successfully',
      moonPhase: moonPhase as unknown as MoonPhaseType,
    };
  }

  @Mutation(() => DeleteMoonPhaseResponse)
  async softDeleteMoonPhase(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string
  ): Promise<DeleteMoonPhaseResponse> {
    context.hasUserAdminWriteAppWriteScope(context);

    if (!Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid moon phase ID format');
    }

    const moonPhase = await MoonPhase.findById(id);
    if (!moonPhase) {
      throw new NotFoundError('Moon phase not found');
    }

    moonPhase.status = 'deleted';
    await moonPhase.save();

    return {
      success: true,
      message: 'Moon phase soft deleted successfully',
    };
  }

  @Mutation(() => DeleteMoonPhaseResponse)
  async hardDeleteMoonPhase(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string
  ): Promise<DeleteMoonPhaseResponse> {
    context.hasUserAdminWriteAppWriteScope(context);

    if (!Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid moon phase ID format');
    }

    const result = await MoonPhase.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundError('Moon phase not found');
    }

    return {
      success: true,
      message: 'Moon phase permanently deleted',
    };
  }
}
