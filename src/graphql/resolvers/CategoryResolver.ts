import 'reflect-metadata';
import { Types } from 'mongoose';
import { Arg, Ctx, ID, Int, Mutation, Query, Resolver } from 'type-graphql';
import { GraphQLContext } from '../../middleware/auth.middleware';
import { Category } from '../../models/Category';
import { NotFoundError, ValidationError } from '../../utils/errors';
import {
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../inputs/CategoryInput';
import { CategoryResponse, CategoryType } from '../types/CategoryTypes';

@Resolver(() => CategoryType)
export class CategoryResolver {
  // Mutation: Create a category (admin only)
  @Mutation(() => CategoryResponse)
  async createCategory(
    @Ctx() context: GraphQLContext,
    @Arg('input') input: CreateCategoryInput
  ): Promise<CategoryResponse> {
    context.hasUserAdminWriteAppWriteScope(context);

    // Validate priority
    if (input.priority < 1) {
      throw new ValidationError('Priority must be at least 1');
    }

    // Validate status
    const validStatuses = ['active', 'paused', 'deleted'];
    if (input.status && !validStatuses.includes(input.status.toLowerCase())) {
      throw new ValidationError('Status must be active, paused, or deleted');
    }

    const category = new Category({
      ...input,
      entityId: input.entityId ? new Types.ObjectId(input.entityId) : undefined,
      primaryAsset: input.primaryAsset
        ? new Types.ObjectId(input.primaryAsset)
        : undefined,
      heroAsset: input.heroAsset
        ? new Types.ObjectId(input.heroAsset)
        : undefined,
      secondaryAsset: input.secondaryAsset
        ? new Types.ObjectId(input.secondaryAsset)
        : undefined,
      user: new Types.ObjectId(context.userId),
    });

    await category.save();
    await category.populate('user');
    await category.populate('primaryAsset');
    await category.populate('heroAsset');
    await category.populate('secondaryAsset');

    return {
      success: true,
      message: 'Category created successfully',
      category: category as unknown as CategoryType,
    };
  }

  // Mutation: Update a category (admin only)
  @Mutation(() => CategoryResponse)
  async updateCategory(
    @Ctx() context: GraphQLContext,
    @Arg('input') input: UpdateCategoryInput
  ): Promise<CategoryResponse> {
    context.hasUserAdminWriteAppWriteScope(context);

    const category = await Category.findById(input.id);

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Validate priority if provided
    if (input.priority !== undefined && input.priority < 1) {
      throw new ValidationError('Priority must be at least 1');
    }

    // Validate status if provided
    const validStatuses = ['active', 'paused', 'deleted'];
    if (input.status && !validStatuses.includes(input.status.toLowerCase())) {
      throw new ValidationError('Status must be active, paused, or deleted');
    }

    // Validate primaryColor if provided (hex color format)
    if (input.primaryColor) {
      const hexColorRegex = /^#([0-9A-F]{3}){1,2}$/i;
      if (!hexColorRegex.test(input.primaryColor)) {
        throw new ValidationError(
          'Primary color must be a valid hex color (e.g., #FF5733 or #F57)'
        );
      }
    }

    // Update fields
    const updateData = { ...input };
    delete (updateData as { id?: string }).id;

    if (input.entityId) {
      Object.assign(updateData, {
        entityId: new Types.ObjectId(input.entityId),
      });
    }
    if (input.primaryAsset) {
      Object.assign(updateData, {
        primaryAsset: new Types.ObjectId(input.primaryAsset),
      });
    }
    if (input.heroAsset) {
      Object.assign(updateData, {
        heroAsset: new Types.ObjectId(input.heroAsset),
      });
    }
    if (input.secondaryAsset) {
      Object.assign(updateData, {
        secondaryAsset: new Types.ObjectId(input.secondaryAsset),
      });
    }

    Object.assign(category, updateData);
    await category.save();

    await category.populate('user');
    await category.populate('primaryAsset');
    await category.populate('heroAsset');
    await category.populate('secondaryAsset');

    return {
      success: true,
      message: 'Category updated successfully',
      category: category as unknown as CategoryType,
    };
  }

  // Mutation: Hard delete a category (admin only)
  @Mutation(() => CategoryResponse)
  async deleteCategory(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string
  ): Promise<CategoryResponse> {
    context.hasUserAdminWriteAppWriteScope(context);

    const category = await Category.findById(id);

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    await Category.findByIdAndDelete(id);

    return {
      success: true,
      message: 'Category deleted successfully',
    };
  }

  // Query: Get categories ordered by priority with filters
  @Query(() => [CategoryType])
  async categories(
    @Ctx() context: GraphQLContext,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 20 })
    limit: number,
    @Arg('offset', () => Int, { nullable: true, defaultValue: 0 })
    offset: number,
    @Arg('locale', { nullable: true, defaultValue: 'en-US' }) locale?: string,
    @Arg('status', { nullable: true }) status?: string
  ): Promise<CategoryType[]> {
    context.hasUserReadAppReadScope(context);

    // Validate pagination
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }
    if (offset < 0) {
      throw new ValidationError('Offset must be non-negative');
    }

    const filter: Record<string, unknown> = {};

    // Non-admin users can only see active categories
    // Admin users can filter by status or see all if no status provided
    const isAdmin = context.hasUserScope('admin');

    if (isAdmin) {
      // Admin: if status provided, filter by it; otherwise show all
      if (status) {
        filter.status = status.toLowerCase();
      }
    } else {
      // Non-admin: always filter to active only
      filter.status = 'active';
    }

    if (locale) {
      filter.locale = locale.toLowerCase();
    }

    const categories = await Category.find(filter)
      .sort({ priority: 1, createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate('user')
      .populate('primaryAsset')
      .populate('heroAsset')
      .populate('secondaryAsset');

    return categories as unknown as CategoryType[];
  }
}
