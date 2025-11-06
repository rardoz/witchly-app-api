import 'reflect-metadata';
import {
  ArrayMaxSize,
  IsHexColor,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Field, ID, InputType } from 'type-graphql';

@InputType()
export class CreateSpellbookInput {
  @Field()
  @IsString()
  @MaxLength(200)
  title: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  primaryAsset?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  backgroundAsset?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  font?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsHexColor()
  textColor?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsIn(['active', 'pending', 'deleted'])
  status?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsIn(['public', 'private'])
  visibility?: string;

  @Field(() => [ID], { nullable: true })
  @IsOptional()
  @ArrayMaxSize(100)
  allowedUsers?: string[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @ArrayMaxSize(50)
  meta?: string[];
}

@InputType()
export class UpdateSpellbookInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  primaryAsset?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  backgroundAsset?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  font?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsHexColor()
  textColor?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsIn(['active', 'pending', 'deleted'])
  status?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsIn(['public', 'private'])
  visibility?: string;

  @Field(() => [ID], { nullable: true })
  @IsOptional()
  @ArrayMaxSize(100)
  allowedUsers?: string[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @ArrayMaxSize(50)
  meta?: string[];

  @Field(() => [ID], { nullable: true })
  @IsOptional()
  @ArrayMaxSize(500)
  pages?: string[];
}

@InputType()
export class CreateSpellbookPageInput {
  @Field()
  @IsString()
  @MaxLength(200)
  title: string;

  @Field(() => ID)
  @IsString()
  spellbook: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  richText?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortDescription?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  primaryAsset?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  backgroundAsset?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  font?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsHexColor()
  backgroundColor?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsHexColor()
  textColor?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsIn(['active', 'pending', 'deleted'])
  status?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsIn(['public', 'private'])
  visibility?: string;

  @Field(() => [ID], { nullable: true })
  @IsOptional()
  @ArrayMaxSize(100)
  allowedUsers?: string[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @ArrayMaxSize(50)
  meta?: string[];
}

@InputType()
export class UpdateSpellbookPageInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  richText?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortDescription?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  primaryAsset?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  backgroundAsset?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  font?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsHexColor()
  backgroundColor?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsHexColor()
  textColor?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsIn(['active', 'pending', 'deleted'])
  status?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsIn(['public', 'private'])
  visibility?: string;

  @Field(() => [ID], { nullable: true })
  @IsOptional()
  @ArrayMaxSize(100)
  allowedUsers?: string[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @ArrayMaxSize(50)
  meta?: string[];
}
