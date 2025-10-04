import { Field, ID, InputType, ObjectType } from 'type-graphql';

@ObjectType()
export class ClientType {
  @Field(() => ID)
  id!: string;

  @Field()
  clientId!: string;

  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  description: string | undefined;

  @Field()
  isActive!: boolean;

  @Field(() => [String])
  allowedScopes!: string[];

  @Field()
  tokenExpiresIn!: number;

  @Field(() => Date, { nullable: true })
  lastUsed: Date | undefined;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

@ObjectType()
export class ClientCredentials {
  @Field()
  clientId!: string;

  @Field()
  clientSecret!: string;
}

@InputType()
export class CreateClientInput {
  @Field()
  name!: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => [String], { defaultValue: ['read'] })
  allowedScopes!: string[];

  @Field({ defaultValue: 3600 })
  tokenExpiresIn!: number;
}

@InputType()
export class UpdateClientInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => [String], { nullable: true })
  allowedScopes?: string[];

  @Field({ nullable: true })
  tokenExpiresIn?: number;

  @Field({ nullable: true })
  isActive?: boolean;
}
