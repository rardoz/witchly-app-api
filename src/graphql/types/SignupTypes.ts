import { Field, ObjectType } from 'type-graphql';
import { User } from './User';

@ObjectType()
export class InitiateSignupResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field({ nullable: true })
  expiresAt?: Date;
}

@ObjectType()
export class CompleteSignupResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field(() => User, { nullable: true })
  user?: User;
}
