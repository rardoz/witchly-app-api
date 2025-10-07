import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class InitiateSignupResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field({ nullable: true })
  expiresAt?: Date;
}
