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

@ObjectType()
export class TarotCardType {
  @Field(() => ID)
  _id: unknown;

  @Field()
  name!: string;

  @Field({ nullable: true })
  tarotCardNumber?: string;

  @Field({ nullable: true })
  primaryAsset?: Asset;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  locale?: string;

  @Field(() => [String], { nullable: true })
  meta?: string[];

  @Field()
  status!: string;

  @Field(() => User, { nullable: true })
  user?: User;

  @Field(() => TarotDeckType)
  tarotDeck!: TarotDeckType;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

@ObjectType()
export class CreateTarotCardResponse {
  @Field()
  success!: boolean;

  @Field()
  message!: string;

  @Field(() => TarotCardType)
  card!: TarotCardType;
}

@ObjectType()
export class UpdateTarotCardResponse {
  @Field()
  success!: boolean;

  @Field()
  message!: string;

  @Field(() => TarotCardType)
  card!: TarotCardType;
}

@ObjectType()
export class DeleteTarotCardResponse {
  @Field()
  success!: boolean;

  @Field()
  message!: string;
}

@ObjectType()
export class TarotDecksResponse {
  @Field(() => [TarotDeckType])
  records: TarotDeckType[];

  @Field(() => Number)
  totalCount: number;

  @Field(() => Number)
  limit: number;

  @Field(() => Number)
  offset: number;
}

@ObjectType()
export class TarotCardsResponse {
  @Field(() => [TarotCardType])
  records: TarotCardType[];

  @Field(() => Number)
  totalCount: number;

  @Field(() => Number)
  limit: number;

  @Field(() => Number)
  offset: number;
}
