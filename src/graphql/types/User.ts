import { Field, ID, ObjectType } from 'type-graphql';
import { BaseProfileObjectType } from '../../shared/profile.schema';

@ObjectType()
export class User extends BaseProfileObjectType {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  handle: string;

  @Field(() => Date, { nullable: true })
  lastLoginAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
