import { Field, InputType, ObjectType } from 'type-graphql';

@ObjectType()
export class InitiateLoginResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field({ nullable: true })
  expiresAt?: Date;
}

@InputType()
export class CompleteLoginInput {
  @Field()
  email!: string;

  @Field()
  verificationCode!: string;

  @Field({ nullable: true, defaultValue: false })
  keepMeLoggedIn?: boolean;
}

@ObjectType()
export class CompleteLoginResponse {
  @Field()
  success!: boolean;

  @Field()
  message!: string;

  @Field()
  sessionToken!: string;

  @Field(() => String, { nullable: true })
  refreshToken?: string | undefined;

  @Field()
  expiresIn!: number;

  @Field()
  expiresAt!: Date;

  @Field()
  userId!: string;
}
