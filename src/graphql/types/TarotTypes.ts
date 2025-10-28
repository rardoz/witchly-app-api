import { Field, ID, ObjectType } from 'type-graphql';
import { Asset } from './AssetTypes';
import { User } from './User';

@ObjectType()
export class TarotDeckType {
  @Field(() => ID)
  _id: unknown;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  primaryAsset?: Asset;

  @Field({ nullable: true })
  cardBackgroundAsset?: Asset;

  @Field(() => User, { nullable: true })
  user: User;

  @Field({ nullable: true })
  primaryColor?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  author?: string;

  @Field(() => [String], { nullable: true })
  meta?: string[];

  @Field({ nullable: true })
  layoutType?: string;

  @Field({ nullable: true })
  layoutCount?: number;

  @Field()
  status!: string;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;

  @Field({ nullable: true })
  locale?: string;
}

@ObjectType()
export class CreateTarotDeckResponse {
  @Field()
  success!: boolean;

  @Field()
  message!: string;

  @Field(() => TarotDeckType)
  deck: TarotDeckType;
}

@ObjectType()
export class UpdateTarotDeckResponse {
  @Field()
  success!: boolean;

  @Field()
  message!: string;

  @Field(() => TarotDeckType)
  deck: TarotDeckType;
}

@ObjectType()
export class DeleteTarotDeckResponse {
  @Field()
  success!: boolean;

  @Field()
  message!: string;
}
