import { Field, ID, ObjectType } from 'type-graphql';
import { Asset } from './AssetTypes';
import { User } from './User';

@ObjectType()
export class MagicEightBallType {
  @Field(() => ID)
  _id: unknown;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  primaryAsset?: Asset;

  @Field({ nullable: true })
  backgroundAsset?: Asset;

  @Field(() => User, { nullable: true })
  user?: User;

  @Field({ nullable: true })
  primaryColor?: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  diceNumber!: number;

  @Field()
  status!: string;

  @Field({ nullable: true })
  locale?: string;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

@ObjectType()
export class CreateMagicEightBallResponse {
  @Field()
  success!: boolean;

  @Field()
  message!: string;

  @Field(() => MagicEightBallType)
  side: MagicEightBallType;
}

@ObjectType()
export class UpdateMagicEightBallResponse {
  @Field()
  success!: boolean;

  @Field()
  message!: string;

  @Field(() => MagicEightBallType)
  side: MagicEightBallType;
}

@ObjectType()
export class DeleteMagicEightBallResponse {
  @Field()
  success!: boolean;

  @Field()
  message!: string;
}
