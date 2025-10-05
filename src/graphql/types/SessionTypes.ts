import { Field, InputType, ObjectType } from 'type-graphql';

@InputType()
export class LoginWithSessionInput {
  @Field()
  email!: string;

  @Field()
  verificationCode!: string;

  @Field({ nullable: true, defaultValue: false })
  keepMeLoggedIn?: boolean;
}

@ObjectType()
export class LoginWithSessionResponse {
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

@ObjectType()
export class SessionInfoType {
  @Field()
  sessionId!: string;

  @Field()
  keepMeLoggedIn!: boolean;

  @Field()
  lastUsedAt!: Date;

  @Field()
  expiresAt!: Date;

  @Field(() => String, { nullable: true })
  userAgent?: string | undefined;

  @Field(() => String, { nullable: true })
  ipAddress?: string | undefined;

  @Field()
  isActive!: boolean;

  @Field()
  createdAt!: Date;
}

@ObjectType()
export class RefreshSessionResponse {
  @Field()
  sessionToken!: string;

  @Field(() => String, { nullable: true })
  refreshToken?: string | undefined;

  @Field()
  expiresIn!: number;

  @Field()
  expiresAt!: Date;
}

@InputType()
export class RefreshSessionInput {
  @Field()
  refreshToken!: string;
}

@ObjectType()
export class LogoutResponse {
  @Field()
  success!: boolean;

  @Field()
  message!: string;
}

@ObjectType()
export class LogoutAllSessionsResponse {
  @Field()
  success!: boolean;

  @Field()
  message!: string;

  @Field()
  sessionsTerminated!: number;
}
