import { Arg, ID, Mutation, Query, Resolver } from 'type-graphql';
import { User as UserModel } from '../../models/User';
import { CreateUserInput, UpdateUserInput } from '../inputs/UserInput';
import { User as UserType } from '../types/User';

@Resolver(() => UserType)
export class UserResolver {
  @Query(() => [UserType])
  async users(): Promise<UserType[]> {
    const users = await UserModel.find();
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }

  @Query(() => UserType, { nullable: true })
  async user(@Arg('id', () => ID) id: string): Promise<UserType | null> {
    const user = await UserModel.findById(id);
    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Mutation(() => UserType)
  async createUser(
    @Arg('input', () => CreateUserInput) input: CreateUserInput
  ): Promise<UserType> {
    const user = await UserModel.create(input);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Mutation(() => UserType, { nullable: true })
  async updateUser(
    @Arg('id', () => ID) id: string,
    @Arg('input', () => UpdateUserInput) input: UpdateUserInput
  ): Promise<UserType | null> {
    const user = await UserModel.findByIdAndUpdate(id, input, { new: true });
    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Mutation(() => Boolean)
  async deleteUser(@Arg('id', () => ID) id: string): Promise<boolean> {
    const result = await UserModel.findByIdAndDelete(id);
    return !!result;
  }
}
