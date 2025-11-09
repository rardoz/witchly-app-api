import 'reflect-metadata';
import { Types } from 'mongoose';
import { Arg, Ctx, ID, Int, Mutation, Query, Resolver } from 'type-graphql';
import { GraphQLContext } from '../../middleware/auth.middleware';
import { Category } from '../../models/Category';
import { Market } from '../../models/Market';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { CreateMarketInput, UpdateMarketInput } from '../inputs/MarketInput';
import { MarketResponse, MarketType } from '../types/MarketTypes';

@Resolver(() => MarketType)
export class MarketResolver {
  // Mutation: Create a market product (admin only)
  @Mutation(() => MarketResponse)
  async createMarket(
    @Ctx() context: GraphQLContext,
    @Arg('input') input: CreateMarketInput
  ): Promise<MarketResponse> {
    context.hasUserAdminWriteAppWriteScope(context);

    // Validate status
    if (!['active', 'paused', 'deleted'].includes(input.status)) {
      throw new ValidationError('Status must be active, paused, or deleted');
    }

    // Validate priority
    if (input.priority < 1) {
      throw new ValidationError('Priority must be at least 1');
    }

    // Validate price
    if (input.price < 0) {
      throw new ValidationError('Price must be non-negative');
    }

    // Check category exists
    const categoryExists = await Category.findById(input.category);
    if (!categoryExists) {
      throw new NotFoundError('Category not found');
    }

    const market = new Market({
      ...input,
      primaryAsset: input.primaryAsset
        ? new Types.ObjectId(input.primaryAsset)
        : undefined,
      secondaryAsset: input.secondaryAsset
        ? new Types.ObjectId(input.secondaryAsset)
        : undefined,
      finalAsset: input.finalAsset
        ? new Types.ObjectId(input.finalAsset)
        : undefined,
      category: new Types.ObjectId(input.category),
      user: new Types.ObjectId(context.userId),
    });

    await market.save();
    await market.populate('user');
    await market.populate('category');
    await market.populate('primaryAsset');
    await market.populate('secondaryAsset');
    await market.populate('finalAsset');

    return {
      success: true,
      message: 'Market product created successfully',
      market: market as unknown as MarketType,
    };
  }

  // Mutation: Update a market product (admin only)
  @Mutation(() => MarketResponse)
  async updateMarket(
    @Ctx() context: GraphQLContext,
    @Arg('input') input: UpdateMarketInput
  ): Promise<MarketResponse> {
    context.hasUserAdminWriteAppWriteScope(context);

    const market = await Market.findById(input.id);

    if (!market) {
      throw new NotFoundError('Market product not found');
    }

    // Validate status if provided
    if (
      input.status &&
      !['active', 'paused', 'deleted'].includes(input.status)
    ) {
      throw new ValidationError('Status must be active, paused, or deleted');
    }

    // Validate priority if provided
    if (input.priority !== undefined && input.priority < 1) {
      throw new ValidationError('Priority must be at least 1');
    }

    // Validate price if provided
    if (input.price !== undefined && input.price < 0) {
      throw new ValidationError('Price must be non-negative');
    }

    // Check category exists if provided
    if (input.category) {
      const categoryExists = await Category.findById(input.category);
      if (!categoryExists) {
        throw new NotFoundError('Category not found');
      }
    }

    // Update fields
    const updateData = { ...input };
    delete (updateData as { id?: string }).id;

    if (input.primaryAsset) {
      Object.assign(updateData, {
        primaryAsset: new Types.ObjectId(input.primaryAsset),
      });
    }
    if (input.secondaryAsset) {
      Object.assign(updateData, {
        secondaryAsset: new Types.ObjectId(input.secondaryAsset),
      });
    }
    if (input.finalAsset) {
      Object.assign(updateData, {
        finalAsset: new Types.ObjectId(input.finalAsset),
      });
    }
    if (input.category) {
      Object.assign(updateData, {
        category: new Types.ObjectId(input.category),
      });
    }

    Object.assign(market, updateData);
    await market.save();

    await market.populate('user');
    await market.populate('category');
    await market.populate('primaryAsset');
    await market.populate('secondaryAsset');
    await market.populate('finalAsset');

    return {
      success: true,
      message: 'Market product updated successfully',
      market: market as unknown as MarketType,
    };
  }

  // Mutation: Soft delete a market product (admin only)
  @Mutation(() => MarketResponse)
  async softDeleteMarket(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string
  ): Promise<MarketResponse> {
    context.hasUserAdminWriteAppWriteScope(context);

    const market = await Market.findById(id);

    if (!market) {
      throw new NotFoundError('Market product not found');
    }

    market.status = 'deleted';
    await market.save();

    return {
      success: true,
      message: 'Market product soft deleted successfully',
    };
  }

  // Mutation: Hard delete a market product (admin only)
  @Mutation(() => MarketResponse)
  async hardDeleteMarket(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string
  ): Promise<MarketResponse> {
    context.hasUserAdminWriteAppWriteScope(context);

    const market = await Market.findById(id);

    if (!market) {
      throw new NotFoundError('Market product not found');
    }

    await Market.findByIdAndDelete(id);

    return {
      success: true,
      message: 'Market product deleted successfully',
    };
  }

  // Mutation: Toggle like on a market product
  @Mutation(() => MarketResponse)
  async likeMarket(
    @Ctx() context: GraphQLContext,
    @Arg('marketId', () => ID) marketId: string
  ): Promise<MarketResponse> {
    context.hasUserWriteAppWriteScope(context);

    const market = await Market.findById(marketId);

    if (!market) {
      throw new NotFoundError('Market product not found');
    }

    const userIdObj = new Types.ObjectId(context.userId);
    const likeIndex = market.likes.findIndex((id) => id.equals(userIdObj));

    if (likeIndex > -1) {
      // Unlike: remove user from likes array
      market.likes.splice(likeIndex, 1);
    } else {
      // Like: add user to likes array
      market.likes.push(userIdObj);
    }

    await market.save();
    await market.populate('user');
    await market.populate('category');
    await market.populate('primaryAsset');
    await market.populate('secondaryAsset');
    await market.populate('finalAsset');

    return {
      success: true,
      message: likeIndex > -1 ? 'Product unliked' : 'Product liked',
      market: market as unknown as MarketType,
    };
  }

  // Query: Get market products with filters
  @Query(() => [MarketType])
  async markets(
    @Ctx() context: GraphQLContext,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 20 })
    limit: number,
    @Arg('offset', () => Int, { nullable: true, defaultValue: 0 })
    offset: number,
    @Arg('categoryId', () => ID, { nullable: true }) categoryId?: string,
    @Arg('locale', { nullable: true, defaultValue: 'en-US' }) locale?: string,
    @Arg('status', { nullable: true }) status?: string
  ): Promise<MarketType[]> {
    context.hasUserReadAppReadScope(context);

    // Validate pagination
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }
    if (offset < 0) {
      throw new ValidationError('Offset must be non-negative');
    }

    const filter: Record<string, unknown> = {};

    // Non-admin users can only see active products
    // Admin users can filter by status or see all if no status provided
    const isAdmin = context.hasUserScope('admin');

    if (isAdmin) {
      // Admin: if status provided, filter by it; otherwise show all
      if (status) {
        if (!['active', 'paused', 'deleted'].includes(status)) {
          throw new ValidationError(
            'Status must be active, paused, or deleted'
          );
        }
        filter.status = status;
      }
    } else {
      // Non-admin: always show only active products
      filter.status = 'active';
    }

    if (categoryId) {
      filter.category = new Types.ObjectId(categoryId);
    }

    if (locale) {
      filter.locale = locale.toLowerCase();
    }

    const markets = await Market.find(filter)
      .sort({ priority: 1, createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate('user')
      .populate('category')
      .populate('primaryAsset')
      .populate('secondaryAsset')
      .populate('finalAsset');

    return markets as unknown as MarketType[];
  }
}
