import 'reflect-metadata';
import { Field, ID, Int, ObjectType } from 'type-graphql';
import { Asset } from './AssetTypes';
import { User } from './User';

@ObjectType()
export class CategoryType {
  @Field(() => ID)
  id: string;

  @Field(() => ID, { nullable: true })
  entityId?: string;

  @Field()
  entityType: string;

  @Field()
  locale: string;

  @Field()
  categoryName: string;

  @Field({ nullable: true })
  categoryShortDescription?: string;

  @Field(() => Asset, { nullable: true })
  primaryAsset?: Asset;

  @Field(() => Asset, { nullable: true })
  heroAsset?: Asset;

  @Field(() => Asset, { nullable: true })
  secondaryAsset?: Asset;

  @Field({ nullable: true })
  primaryColor?: string;

  @Field({ nullable: true })
  textColor?: string;

  @Field({ nullable: true })
  backgroundColor?: string;

  @Field(() => Int)
  priority: number;

  @Field()
  status: string;

  @Field(() => User)
  user: User;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class CategoryResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field(() => CategoryType, { nullable: true })
  category?: CategoryType;
}
