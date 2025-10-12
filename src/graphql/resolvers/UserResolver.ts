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
import { User as UserType } from '../types/User';

// Type guard for MongoDB duplicate key errors

@Resolver(() => UserType)
export class UserResolver {
  @Query(() => [UserType])
  async users(
    @Ctx() context: GraphQLContext,
    @Arg('limit', () => Number, { nullable: true, defaultValue: 10 })
    limit: number,
    @Arg('offset', () => Number, { nullable: true, defaultValue: 0 })
    offset: number
  ): Promise<UserType[]> {
    context.hasUserReadAppReadScope(context);

    // Validate pagination parameters
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }
    if (offset < 0) {
      throw new ValidationError('Offset must be non-negative');
    }

    const users = await UserModel.find()
      .skip(offset)
      .limit(limit)
      .sort({ createdAt: -1 }); // Sort by newest first

    return users as UserType[];
  }

  @Query(() => UserType, { nullable: true })
  async user(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string
  ): Promise<UserType | null> {
    context.hasUserReadAppReadScope(context);

    const user = await UserModel.findById(id);
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
    context.hasAppWriteScope(context);
    if (!context.hasUserScope('admin') && input.allowedScopes) {
      throw new UnauthorizedError('Admin access required to set scopes');
    }

    try {
      const user = await UserModel.create(input);
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
      throw new UnauthorizedError('Admin access required to set scopes');
    }

    if (context.userId !== id.toString() && !context.hasUserScope('admin')) {
      throw new UnauthorizedError('Users can only update their own accounts');
    }

    const user = await UserModel.findByIdAndUpdate(id, input, { new: true });
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
