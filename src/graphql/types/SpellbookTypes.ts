import 'reflect-metadata';
import { Field, ID, ObjectType } from 'type-graphql';
import { Asset } from './AssetTypes';
import { User } from './User';

@ObjectType()
export class SpellbookPageType {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  richText?: string;

  @Field({ nullable: true })
  shortDescription?: string;

  @Field(() => Asset, { nullable: true })
  primaryAsset?: Asset;

  @Field(() => Asset, { nullable: true })
  backgroundAsset?: Asset;

  @Field({ nullable: true })
  font?: string;

  @Field({ nullable: true })
  backgroundColor?: string;

  @Field({ nullable: true })
  textColor?: string;

  @Field({ nullable: true })
  primaryColor?: string;

  @Field(() => User)
  user: User;

  @Field(() => ID)
  spellbook: string;

  @Field()
  status: string;

  @Field()
  visibility: string;

  @Field(() => [ID], { nullable: true })
  allowedUsers?: string[];

  @Field(() => [String], { nullable: true })
  meta?: string[];

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class SpellbookType {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Asset, { nullable: true })
  primaryAsset?: Asset;

  @Field(() => Asset, { nullable: true })
  backgroundAsset?: Asset;

  @Field(() => User)
  user: User;

  @Field(() => [ID], { nullable: true })
  pages?: string[];

  @Field()
  status: string;

  @Field()
  visibility: string;

  @Field({ nullable: true })
  primaryColor?: string;

  @Field({ nullable: true })
  textColor?: string;

  @Field({ nullable: true })
  font?: string;

  @Field(() => [ID], { nullable: true })
  allowedUsers?: string[];

  @Field(() => [String], { nullable: true })
  meta?: string[];

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class SpellbookResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field(() => SpellbookType, { nullable: true })
  spellbook?: SpellbookType;
}

@ObjectType()
export class SpellbookPageResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field(() => SpellbookPageType, { nullable: true })
  spellbookPage?: SpellbookPageType;
}

@ObjectType()
export class DeleteResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;
}
