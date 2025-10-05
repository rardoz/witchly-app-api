import { Field, ObjectType } from 'type-graphql';
import { User } from './User';

@ObjectType()
export class InitiateLoginResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field({ nullable: true })
  expiresAt?: Date;
}

@ObjectType()
export class CompleteLoginResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field(() => User, { nullable: true })
  user?: User;
}
