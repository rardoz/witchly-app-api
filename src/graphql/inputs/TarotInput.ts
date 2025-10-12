import {
  IsArray,
  IsHexColor,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Field, InputType } from 'type-graphql';

@InputType()
export class CreateTarotDeckInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Name must not be empty' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Primary image URL must be a valid URL' })
  primaryImageUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Card background URL must be a valid URL' })
  cardBackgroundUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsHexColor({
    message: 'Primary color must be a valid hex color (e.g., #FF5733)',
  })
  primaryColor?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Description must not be empty' })
  @MaxLength(5000, { message: 'Description must not exceed 5000 characters' })
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Author must not be empty' })
  @MaxLength(100, { message: 'Author must not exceed 100 characters' })
  author?: string;

  @Field(() => [String], { nullable: true, defaultValue: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, {
    each: true,
    message: 'Each meta tag must not exceed 50 characters',
  })
  meta?: string[];

  @Field({ nullable: true, defaultValue: 'default' })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Layout type must not exceed 50 characters' })
  layoutType?: string;

  @Field({ nullable: true, defaultValue: 1 })
  @IsOptional()
  @IsInt({ message: 'Layout count must be an integer' })
  @Min(1, { message: 'Layout count must be at least 1' })
  @Max(50, { message: 'Layout count cannot exceed 50' })
  layoutCount?: number;

  @Field({ nullable: true, defaultValue: 'active' })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'paused', 'deleted'], {
    message: 'Status must be either "active", "paused", or "deleted"',
  })
  status?: 'active' | 'paused' | 'deleted';
}

@InputType()
export class UpdateTarotDeckInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Name must not be empty' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Primary image URL must be a valid URL' })
  primaryImageUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Card background URL must be a valid URL' })
  cardBackgroundUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsHexColor({
    message: 'Primary color must be a valid hex color (e.g., #FF5733)',
  })
  primaryColor?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Description must not be empty' })
  @MaxLength(5000, { message: 'Description must not exceed 5000 characters' })
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Author must not be empty' })
  @MaxLength(100, { message: 'Author must not exceed 100 characters' })
  author?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, {
    each: true,
    message: 'Each meta tag must not exceed 50 characters',
  })
  meta?: string[];

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Layout type must not exceed 50 characters' })
  layoutType?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsInt({ message: 'Layout count must be an integer' })
  @Min(1, { message: 'Layout count must be at least 1' })
  @Max(50, { message: 'Layout count cannot exceed 50' })
  layoutCount?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'paused', 'deleted'], {
    message: 'Status must be either "active", "paused", or "deleted"',
  })
  status?: 'active' | 'paused' | 'deleted';
}
