import { IsIn, IsOptional, IsUrl, Length, Matches } from 'class-validator';
import { Schema } from 'mongoose';
import { Field, InputType, ObjectType } from 'type-graphql';
import { Asset } from '../graphql/types/AssetTypes';

// Validation constants - single source of truth
export const VALIDATION_CONSTANTS = {
  // Authentication validation
  EMAIL: {
    message: 'Please provide a valid email address',
  },
  VERIFICATION_CODE: {
    pattern: /^\d{6}$/,
    message: 'Verification code must be exactly 6 digits',
  },

  // Profile validation
  PROFILE: {
    NAME: { min: 1, max: 100 },
    BIO: { min: 1, max: 500 },
    SHORT_BIO: { min: 1, max: 150 },
    INSTAGRAM_HANDLE: { min: 1, max: 30 },
    TIKTOK_HANDLE: { min: 1, max: 25 },
    TWITTER_HANDLE: { min: 1, max: 15 },
    SNAPCHAT_HANDLE: { min: 1, max: 15 },
    SIGN: { min: 1, max: 20 },
    LOCATION: { min: 1, max: 100 },
    PRONOUNS: { min: 1, max: 50 },
    SEX_VALUES: ['male', 'female', 'non-binary', 'prefer-not-to-say'] as const,
    PATTERNS: {
      INSTAGRAM: /^[a-zA-Z0-9._]+$/,
      TIKTOK: /^[a-zA-Z0-9._]+$/,
      TWITTER: /^[a-zA-Z0-9_]+$/,
      SNAPCHAT: /^[a-zA-Z0-9._-]+$/,
      HEX_COLOR: /^#[0-9A-F]{6}$/i,
    },
  },
} as const;

// Keep backwards compatibility
export const PROFILE_VALIDATION = VALIDATION_CONSTANTS.PROFILE;

// Type for sex field
export type SexType = (typeof PROFILE_VALIDATION.SEX_VALUES)[number];

// Base interface for profile fields
export interface IProfileFields {
  name?: string;
  bio?: string;
  shortBio?: string;
  profileAsset?: Asset;
  backdropAsset?: Asset;
  instagramHandle?: string;
  tikTokHandle?: string;
  twitterHandle?: string;
  websiteUrl?: string;
  facebookUrl?: string;
  snapchatHandle?: string;
  primaryColor?: string;
  sign?: string;
  sex?: SexType;
  location?: string;
  birthDate?: Date;
  pronouns?: string;
  allowedScopes?: string[];
  emailVerified?: boolean;
}

// Base class for profile fields with GraphQL decorators and validation
@InputType()
export class BaseProfileFields implements IProfileFields {
  @Field({ nullable: true })
  @IsOptional()
  @Length(PROFILE_VALIDATION.NAME.min, PROFILE_VALIDATION.NAME.max, {
    message: `Name must be between ${PROFILE_VALIDATION.NAME.min} and ${PROFILE_VALIDATION.NAME.max} characters`,
  })
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Length(PROFILE_VALIDATION.BIO.min, PROFILE_VALIDATION.BIO.max, {
    message: `Bio must be between ${PROFILE_VALIDATION.BIO.min} and ${PROFILE_VALIDATION.BIO.max} characters`,
  })
  bio?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Length(PROFILE_VALIDATION.SHORT_BIO.min, PROFILE_VALIDATION.SHORT_BIO.max, {
    message: `Short bio must be between ${PROFILE_VALIDATION.SHORT_BIO.min} and ${PROFILE_VALIDATION.SHORT_BIO.max} characters`,
  })
  shortBio?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Length(
    PROFILE_VALIDATION.INSTAGRAM_HANDLE.min,
    PROFILE_VALIDATION.INSTAGRAM_HANDLE.max,
    {
      message: `Instagram handle must be between ${PROFILE_VALIDATION.INSTAGRAM_HANDLE.min} and ${PROFILE_VALIDATION.INSTAGRAM_HANDLE.max} characters`,
    }
  )
  @Matches(PROFILE_VALIDATION.PATTERNS.INSTAGRAM, {
    message:
      'Instagram handle can only contain letters, numbers, dots and underscores',
  })
  instagramHandle?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Length(
    PROFILE_VALIDATION.TIKTOK_HANDLE.min,
    PROFILE_VALIDATION.TIKTOK_HANDLE.max,
    {
      message: `TikTok handle must be between ${PROFILE_VALIDATION.TIKTOK_HANDLE.min} and ${PROFILE_VALIDATION.TIKTOK_HANDLE.max} characters`,
    }
  )
  @Matches(PROFILE_VALIDATION.PATTERNS.TIKTOK, {
    message:
      'TikTok handle can only contain letters, numbers, dots and underscores',
  })
  tikTokHandle?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Length(
    PROFILE_VALIDATION.TWITTER_HANDLE.min,
    PROFILE_VALIDATION.TWITTER_HANDLE.max,
    {
      message: `Twitter handle must be between ${PROFILE_VALIDATION.TWITTER_HANDLE.min} and ${PROFILE_VALIDATION.TWITTER_HANDLE.max} characters`,
    }
  )
  @Matches(PROFILE_VALIDATION.PATTERNS.TWITTER, {
    message: 'Twitter handle can only contain letters, numbers and underscores',
  })
  twitterHandle?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Website URL must be a valid URL' })
  websiteUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Facebook URL must be a valid URL' })
  facebookUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Length(
    PROFILE_VALIDATION.SNAPCHAT_HANDLE.min,
    PROFILE_VALIDATION.SNAPCHAT_HANDLE.max,
    {
      message: `Snapchat handle must be between ${PROFILE_VALIDATION.SNAPCHAT_HANDLE.min} and ${PROFILE_VALIDATION.SNAPCHAT_HANDLE.max} characters`,
    }
  )
  @Matches(PROFILE_VALIDATION.PATTERNS.SNAPCHAT, {
    message:
      'Snapchat handle can only contain letters, numbers, dots, underscores and hyphens',
  })
  snapchatHandle?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Matches(PROFILE_VALIDATION.PATTERNS.HEX_COLOR, {
    message: 'Primary color must be a valid hex color (e.g., #FF5733)',
  })
  primaryColor?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Length(PROFILE_VALIDATION.SIGN.min, PROFILE_VALIDATION.SIGN.max, {
    message: `Sign must be between ${PROFILE_VALIDATION.SIGN.min} and ${PROFILE_VALIDATION.SIGN.max} characters`,
  })
  sign?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsIn(PROFILE_VALIDATION.SEX_VALUES, {
    message: `Sex must be one of: ${PROFILE_VALIDATION.SEX_VALUES.join(', ')}`,
  })
  sex?: SexType;

  @Field({ nullable: true })
  @IsOptional()
  @Length(PROFILE_VALIDATION.LOCATION.min, PROFILE_VALIDATION.LOCATION.max, {
    message: `Location must be between ${PROFILE_VALIDATION.LOCATION.min} and ${PROFILE_VALIDATION.LOCATION.max} characters`,
  })
  location?: string;

  @Field({ nullable: true })
  @IsOptional()
  birthDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @Length(PROFILE_VALIDATION.PRONOUNS.min, PROFILE_VALIDATION.PRONOUNS.max, {
    message: `Pronouns must be between ${PROFILE_VALIDATION.PRONOUNS.min} and ${PROFILE_VALIDATION.PRONOUNS.max} characters`,
  })
  pronouns?: string;

  @Field(() => [String], { nullable: true })
  allowedScopes?: string[];

  @Field(() => Boolean, { nullable: false, defaultValue: false })
  emailVerified: boolean;
}

// Base class for profile fields in GraphQL ObjectTypes
@ObjectType()
export class BaseProfileObjectType implements IProfileFields {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  bio?: string;

  @Field({ nullable: true })
  shortBio?: string;

  @Field({ nullable: true })
  profileAsset?: Asset;

  @Field({ nullable: true })
  backdropAsset?: Asset;

  @Field({ nullable: true })
  instagramHandle?: string;

  @Field({ nullable: true })
  tikTokHandle?: string;

  @Field({ nullable: true })
  twitterHandle?: string;

  @Field({ nullable: true })
  websiteUrl?: string;

  @Field({ nullable: true })
  facebookUrl?: string;

  @Field({ nullable: true })
  snapchatHandle?: string;

  @Field({ nullable: true })
  primaryColor?: string;

  @Field({ nullable: true })
  sign?: string;

  @Field({ nullable: true })
  sex?: SexType;

  @Field({ nullable: true })
  location?: string;

  @Field({ nullable: true })
  birthDate?: Date;

  @Field({ nullable: true })
  pronouns?: string;

  @Field(() => [String], { nullable: true })
  allowedScopes?: string[];

  @Field(() => Boolean)
  emailVerified: boolean;
}

// Shared Mongoose schema definition for profile fields
export const createProfileFieldsSchema = () => ({
  name: {
    type: String,
    trim: true,
    maxlength: PROFILE_VALIDATION.NAME.max,
  },
  bio: {
    type: String,
    trim: true,
    maxlength: PROFILE_VALIDATION.BIO.max,
  },
  shortBio: {
    type: String,
    trim: true,
    maxlength: PROFILE_VALIDATION.SHORT_BIO.max,
  },
  profileAsset: {
    type: Schema.Types.ObjectId,
    ref: 'Asset',
    required: false,
  },
  backdropAsset: {
    type: Schema.Types.ObjectId,
    ref: 'Asset',
    required: false,
  },
  instagramHandle: {
    type: String,
    trim: true,
    maxlength: PROFILE_VALIDATION.INSTAGRAM_HANDLE.max,
  },
  tikTokHandle: {
    type: String,
    trim: true,
    maxlength: PROFILE_VALIDATION.TIKTOK_HANDLE.max,
  },
  twitterHandle: {
    type: String,
    trim: true,
    maxlength: PROFILE_VALIDATION.TWITTER_HANDLE.max,
  },
  websiteUrl: {
    type: String,
    trim: true,
  },
  facebookUrl: {
    type: String,
    trim: true,
  },
  snapchatHandle: {
    type: String,
    trim: true,
    maxlength: PROFILE_VALIDATION.SNAPCHAT_HANDLE.max,
  },
  primaryColor: {
    type: String,
    trim: true,
    match: PROFILE_VALIDATION.PATTERNS.HEX_COLOR,
  },
  sign: {
    type: String,
    trim: true,
    maxlength: PROFILE_VALIDATION.SIGN.max,
  },
  sex: {
    type: String,
    trim: true,
    enum: PROFILE_VALIDATION.SEX_VALUES,
  },
  location: {
    type: String,
    trim: true,
    maxlength: PROFILE_VALIDATION.LOCATION.max,
  },
  birthDate: {
    type: Date,
  },
  pronouns: {
    type: String,
    trim: true,
    maxlength: PROFILE_VALIDATION.PRONOUNS.max,
  },
  emailVerified: {
    type: Boolean,
    default: false,
    required: true,
  },
});
