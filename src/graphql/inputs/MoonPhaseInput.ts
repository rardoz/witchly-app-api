import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Field, InputType } from 'type-graphql';

@InputType()
export class CreateMoonPhaseInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  locale?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @Field()
  @IsString()
  @MaxLength(100)
  name!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(8)
  number?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  primaryAsset?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  backgroundAsset?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  primaryColor?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  moonSign?: string;

  @Field()
  @IsString()
  @IsIn(['active', 'paused', 'deleted'])
  status!: string;
}

@InputType()
export class UpdateMoonPhaseInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  locale?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(8)
  number?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  primaryAsset?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  backgroundAsset?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  primaryColor?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  moonSign?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'paused', 'deleted'])
  status?: string;
}
