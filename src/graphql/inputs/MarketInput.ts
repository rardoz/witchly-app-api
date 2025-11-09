import 'reflect-metadata';
import { Field, Float, ID, InputType, Int } from 'type-graphql';

@InputType()
export class CreateMarketInput {
  @Field(() => ID, { nullable: true })
  primaryAsset?: string;

  @Field(() => ID, { nullable: true })
  secondaryAsset?: string;

  @Field(() => ID, { nullable: true })
  finalAsset?: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  shortDescription?: string;

  @Field(() => Float)
  price: number;

  @Field({ defaultValue: 'en-US' })
  locale: string;

  @Field({ defaultValue: 'USD' })
  currency: string;

  @Field({ nullable: true })
  url?: string;

  @Field({ nullable: true })
  urlLabel?: string;

  @Field(() => ID)
  category: string;

  @Field(() => Int, { defaultValue: 1 })
  priority: number;

  @Field({ defaultValue: 'active' })
  status: string;
}

@InputType()
export class UpdateMarketInput {
  @Field(() => ID)
  id: string;

  @Field(() => ID, { nullable: true })
  primaryAsset?: string;

  @Field(() => ID, { nullable: true })
  secondaryAsset?: string;

  @Field(() => ID, { nullable: true })
  finalAsset?: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  shortDescription?: string;

  @Field(() => Float, { nullable: true })
  price?: number;

  @Field({ nullable: true })
  locale?: string;

  @Field({ nullable: true })
  currency?: string;

  @Field({ nullable: true })
  url?: string;

  @Field({ nullable: true })
  urlLabel?: string;

  @Field(() => ID, { nullable: true })
  category?: string;

  @Field(() => Int, { nullable: true })
  priority?: number;

  @Field({ nullable: true })
  status?: string;
}
