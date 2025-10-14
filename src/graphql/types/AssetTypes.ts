import {
  Field,
  ID,
  InputType,
  Int,
  ObjectType,
  registerEnumType,
} from 'type-graphql';

// Asset type enum - using lowercase keys to match GraphQL output
export enum AssetTypeEnum {
  image = 'image',
  video = 'video',
}

// Register enum for GraphQL
registerEnumType(AssetTypeEnum, {
  name: 'AssetTypeEnum',
  description: 'The type of asset (image or video)',
});

// Upload status enum
export enum UploadStatusEnum {
  initializing = 'initializing',
  uploading = 'uploading',
  completed = 'completed',
  failed = 'failed',
}

// Register upload status enum for GraphQL
registerEnumType(UploadStatusEnum, {
  name: 'UploadStatusEnum',
  description: 'The status of an upload session',
});

@ObjectType()
export class Asset {
  @Field(() => ID)
  id: string;

  @Field()
  fileName: string;

  @Field()
  hashedFileName: string;

  @Field()
  mimeType: string;

  @Field(() => Int)
  fileSize: number;

  @Field()
  s3Key: string;

  @Field()
  s3Url: string;

  @Field({ nullable: true })
  signedUrl?: string; // This will be generated on-demand when requested

  @Field(() => AssetTypeEnum)
  assetType: AssetTypeEnum;

  @Field()
  uploadedBy: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
@ObjectType()
export class UploadProgress {
  @Field(() => ID)
  uploadId: string;

  @Field()
  fileName: string;

  @Field(() => Int)
  totalSize: number;

  @Field(() => Int)
  uploadedSize: number;

  @Field(() => Int)
  chunksUploaded: number;

  @Field(() => Int)
  totalChunks: number;

  @Field(() => Int)
  progress: number; // 0-100

  @Field(() => UploadStatusEnum)
  status: UploadStatusEnum;

  @Field()
  createdAt: Date;

  @Field()
  lastUpdated: Date;
}

@ObjectType()
export class AssetsResponse {
  @Field(() => [Asset])
  assets: Asset[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  offset: number;
}

@InputType()
export class ChunkUploadInitInput {
  @Field()
  fileName: string;

  @Field()
  mimeType: string;

  @Field(() => Int)
  totalSize: number;

  @Field(() => Int, { nullable: true })
  chunkSize?: number;
}

@ObjectType()
export class InitializeUploadResponse {
  @Field(() => ID)
  uploadId: string;

  @Field(() => Int)
  chunkSize: number;
}

@InputType()
export class CancelUploadInput {
  @Field(() => ID)
  uploadId: string;
}

@ObjectType()
export class CancelUploadResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;
}
