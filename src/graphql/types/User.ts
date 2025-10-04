import { Field, ID, ObjectType } from 'type-graphql';
import { BaseProfileObjectType } from '../../shared/profile.schema';

@ObjectType()
export class User extends BaseProfileObjectType {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  emailVerified: boolean;

  @Field()
  handle: string;

  @Field()
  userType: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
