import 'reflect-metadata';
import { Field, Float, ID, Int, ObjectType } from 'type-graphql';
import { Asset } from './AssetTypes';
import { CategoryType } from './CategoryTypes';
import { User } from './User';

@ObjectType()
export class MarketType {
  @Field(() => ID)
  id: string;

  @Field(() => Asset, { nullable: true })
  primaryAsset?: Asset;

  @Field(() => Asset, { nullable: true })
  secondaryAsset?: Asset;

  @Field(() => Asset, { nullable: true })
  finalAsset?: Asset;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  shortDescription?: string;

  @Field(() => Float)
  price: number;

  @Field()
  locale: string;

  @Field()
  currency: string;

  @Field({ nullable: true })
  url?: string;

  @Field({ nullable: true })
  urlLabel?: string;

  @Field(() => [ID])
  likes: string[];

  @Field()
  status: string;

  @Field(() => CategoryType)
  category: CategoryType;

  @Field(() => Int)
  priority: number;

  @Field(() => User)
  user: User;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class MarketResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field(() => MarketType, { nullable: true })
  market?: MarketType;
}
