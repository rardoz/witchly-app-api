import 'reflect-metadata';
import { Field, ID, InputType, Int } from 'type-graphql';

@InputType()
export class CreateCategoryInput {
  @Field(() => ID, { nullable: true })
  entityId?: string;

  @Field()
  entityType: string;

  @Field({ defaultValue: 'en-US' })
  locale: string;

  @Field()
  categoryName: string;

  @Field({ nullable: true })
  categoryShortDescription?: string;

  @Field(() => ID, { nullable: true })
  primaryAsset?: string;

  @Field(() => ID, { nullable: true })
  heroAsset?: string;

  @Field(() => ID, { nullable: true })
  secondaryAsset?: string;

  @Field({ nullable: true })
  primaryColor?: string;

  @Field({ nullable: true })
  textColor?: string;

  @Field({ nullable: true })
  backgroundColor?: string;

  @Field(() => Int, { defaultValue: 1 })
  priority: number;

  @Field({ defaultValue: 'active' })
  status: string;
}

@InputType()
export class UpdateCategoryInput {
  @Field(() => ID)
  id: string;

  @Field(() => ID, { nullable: true })
  entityId?: string;

  @Field({ nullable: true })
  entityType?: string;

  @Field({ nullable: true })
  locale?: string;

  @Field({ nullable: true })
  categoryName?: string;

  @Field({ nullable: true })
  categoryShortDescription?: string;

  @Field(() => ID, { nullable: true })
  primaryAsset?: string;

  @Field(() => ID, { nullable: true })
  heroAsset?: string;

  @Field(() => ID, { nullable: true })
  secondaryAsset?: string;

  @Field({ nullable: true })
  primaryColor?: string;

  @Field({ nullable: true })
  textColor?: string;

  @Field({ nullable: true })
  backgroundColor?: string;

  @Field(() => Int, { nullable: true })
  priority?: number;

  @Field({ nullable: true })
  status?: string;
}
