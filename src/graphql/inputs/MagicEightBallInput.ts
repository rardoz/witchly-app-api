import {
  IsHexColor,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Field, InputType } from 'type-graphql';

@InputType()
export class CreateMagicEightBallInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Name must not be empty' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  primaryAsset?: string;

  @Field({ nullable: true })
  @IsOptional()
  backgroundAsset?: string;

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

  @Field()
  @IsInt({ message: 'Dice number must be an integer' })
  @Min(1, { message: 'Dice number must be at least 1' })
  @Max(20, { message: 'Dice number cannot exceed 20' })
  diceNumber!: number;

  @Field({ nullable: true, defaultValue: 'active' })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'paused', 'deleted'], {
    message: 'Status must be either "active", "paused", or "deleted"',
  })
  status?: 'active' | 'paused' | 'deleted';

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  locale?: string;
}

@InputType()
export class UpdateMagicEightBallInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Name must not be empty' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  primaryAsset?: string;

  @Field({ nullable: true })
  @IsOptional()
  backgroundAsset?: string;

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
  @IsInt({ message: 'Dice number must be an integer' })
  @Min(1, { message: 'Dice number must be at least 1' })
  @Max(20, { message: 'Dice number cannot exceed 20' })
  diceNumber?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'paused', 'deleted'], {
    message: 'Status must be either "active", "paused", or "deleted"',
  })
  status?: 'active' | 'paused' | 'deleted';

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  locale?: string;
}
