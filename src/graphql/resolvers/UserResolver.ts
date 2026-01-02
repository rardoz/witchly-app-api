import { Arg, Ctx, ID, Mutation, Query, Resolver } from 'type-graphql';
import { GraphQLContext } from '../../middleware/auth.middleware';
import { User as UserModel } from '../../models/User';
import {
  ConflictError,
  isMongoError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../utils/errors';
import { CreateUserInput, UpdateUserInput } from '../inputs/UserInput';
import { UsersResponse, User as UserType } from '../types/User';

// Type guard for MongoDB duplicate key errors

@Resolver(() => UsersResponse)
export class UserResolver {
  @Query(() => UsersResponse)
  async users(
    @Ctx() context: GraphQLContext,
    @Arg('limit', () => Number, { nullable: true, defaultValue: 10 })
    limit: number,
    @Arg('offset', () => Number, { nullable: true, defaultValue: 0 })
    offset: number,
    @Arg('email', () => String, { nullable: true })
    email?: string,
    @Arg('name', () => String, { nullable: true })
    name?: string,
    @Arg('handle', () => String, { nullable: true })
    handle?: string,
    @Arg('access', () => String, { nullable: true })
    access?: string
  ): Promise<UsersResponse> {
    context.hasUserReadAppReadScope(context);

    // Validate pagination parameters
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }
    if (offset < 0) {
      throw new ValidationError('Offset must be non-negative');
    }

    // Build filter query
    const filter: Record<string, unknown> = {};

    if (email) {
      // Case-insensitive partial match for email
      filter.email = { $regex: email, $options: 'i' };
    }

    if (name) {
      // Case-insensitive partial match for name
      filter.name = { $regex: name, $options: 'i' };
    }

    if (handle) {
      // Case-insensitive partial match for handle
      filter.handle = { $regex: handle, $options: 'i' };
    }

    if (access) {
      // Case-insensitive partial match for access
      if (access === 'denied') {
        filter.allowedScopes = {
          $not: { $regex: 'admin|basic', $options: 'i' },
        };
      } else {
        filter.allowedScopes = { $regex: access, $options: 'i' };
      }
    }

    const [users, totalCount] = await Promise.all([
      UserModel.find(filter)
        .skip(offset)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate('profileAsset backdropAsset'),
      UserModel.countDocuments(filter),
    ]);
    return { records: users as UserType[], totalCount, limit, offset };
  }

  @Query(() => UserType, { nullable: true })
  async user(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string
  ): Promise<UserType | null> {
    context.hasUserReadAppReadScope(context);

    const user = await UserModel.findById(id).populate(
      'profileAsset backdropAsset'
    );
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user as UserType;
  }

  @Mutation(() => UserType)
  async createUser(
    @Ctx() context: GraphQLContext,
    @Arg('input', () => CreateUserInput) input: CreateUserInput
  ): Promise<UserType> {
    // typical users will do this through the signup journey
    context.hasUserAdminWriteAppWriteScope(context);

    try {
      const user = await UserModel.create(input);
      await user.populate('profileAsset backdropAsset');
      return user as UserType;
    } catch (error: unknown) {
      if (isMongoError(error) && error.code === 11000) {
        // MongoDB duplicate key error
        throw new ConflictError(
          'User with this email or handle already exists'
        );
      }
      throw error;
    }
  }

  @Mutation(() => UserType)
  async updateUser(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string,
    @Arg('input', () => UpdateUserInput) input: UpdateUserInput
  ): Promise<UserType> {
    context.hasAppWriteScope(context);

    if (!context.hasUserScope('admin') && input.allowedScopes) {
      throw new UnauthorizedError('Admin session access required');
    }

    if (context.userId !== id.toString() && !context.hasUserScope('admin')) {
      throw new UnauthorizedError('Users can only update their own accounts');
    }

    const user = await UserModel.findByIdAndUpdate(
      id,
      {
        ...input,
        profileAsset: input.profileAsset || null,
        backdropAsset: input.backdropAsset || null,
      },
      {
        new: true,
      }
    ).populate('profileAsset backdropAsset');
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user as UserType;
  }

  @Mutation(() => Boolean)
  async deleteUser(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string
  ): Promise<boolean> {
    context.hasAppWriteScope(context);

    if (context.userId !== id && !context.hasUserScope('admin')) {
      throw new UnauthorizedError('Users can only delete their own accounts');
    }

    const user = await UserModel.findByIdAndDelete(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return true;
  }
}
