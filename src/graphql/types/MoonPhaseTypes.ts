import { Field, ID, ObjectType } from 'type-graphql';
import { Asset } from './AssetTypes';
import { User } from './User';

@ObjectType()
export class MoonPhaseType {
  @Field(() => ID)
  _id: unknown;

  @Field({ nullable: true })
  locale?: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  name!: string;

  @Field({ nullable: true })
  number?: number;

  @Field(() => Asset, { nullable: true })
  primaryAsset?: Asset;

  @Field(() => Asset, { nullable: true })
  backgroundAsset?: Asset;

  @Field({ nullable: true })
  primaryColor?: string;

  @Field(() => User, { nullable: true })
  user?: User;

  @Field({ nullable: true })
  moonSign?: string;

  @Field()
  status!: string;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

@ObjectType()
export class CreateMoonPhaseResponse {
  @Field()
  success!: boolean;

  @Field()
  message!: string;

  @Field(() => MoonPhaseType)
  moonPhase!: MoonPhaseType;
}

@ObjectType()
export class UpdateMoonPhaseResponse {
  @Field()
  success!: boolean;

  @Field()
  message!: string;

  @Field(() => MoonPhaseType)
  moonPhase!: MoonPhaseType;
}

@ObjectType()
export class DeleteMoonPhaseResponse {
  @Field()
  success!: boolean;

  @Field()
  message!: string;
}
