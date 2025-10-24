import { Types } from 'mongoose';
import { Arg, Ctx, ID, Int, Mutation, Query, Resolver } from 'type-graphql';
import { s3Service } from '../../config/s3';
import type { GraphQLContext } from '../../middleware/auth.middleware';
import { Asset } from '../../models/Asset';
import {
  type ChunkUploadInit,
  cancelUpload,
  DEFAULT_CHUNK_SIZE,
  getUploadProgress,
  initializeChunkedUpload,
} from '../../services/upload.service';
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../utils/errors';
import {
  Asset as AssetGraphQLType,
  AssetsResponse,
  AssetTypeEnum,
  CancelUploadInput,
  CancelUploadResponse,
  ChunkUploadInitInput,
  InitializeUploadResponse,
  UploadProgress as UploadProgressType,
} from '../types/AssetTypes';

@Resolver(() => AssetGraphQLType)
export class AssetResolver {
  @Query(() => AssetsResponse)
  async assets(
    @Ctx() context: GraphQLContext,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 20 })
    limit: number,
    @Arg('offset', () => Int, { nullable: true, defaultValue: 0 })
    offset: number,
    @Arg('assetType', () => AssetTypeEnum, { nullable: true })
    assetType?: AssetTypeEnum,
    @Arg('signedUrl', { nullable: true, defaultValue: false })
    includeSignedUrl?: boolean
  ): Promise<AssetsResponse> {
    // Require authentication and read scope
    context.hasUserReadAppReadScope(context);

    // Validate pagination
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }

    if (offset < 0) {
      throw new ValidationError('Offset must be non-negative');
    }

    // Build query
    const query: Record<string, unknown> = {};
    if (assetType) {
      query.assetType = assetType;
    }

    // Get assets with pagination
    const [assets, total] = await Promise.all([
      Asset.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      Asset.countDocuments(query),
    ]);

    // Conditionally generate signed URLs for each asset
    const assetsWithOptionalSignedUrls = await Promise.all(
      assets.map(async (asset) => {
        const baseAsset = {
          ...asset,
          id: asset._id.toString(),
          uploadedBy: asset.uploadedBy.toString(),
        } as AssetGraphQLType;

        if (includeSignedUrl) {
          try {
            const signedUrl = await s3Service.generateSignedUrl(asset.s3Key);
            return {
              ...baseAsset,
              signedUrl,
            };
          } catch (error) {
            console.error(
              `Failed to generate signed URL for asset ${asset._id}:`,
              error
            );
            return baseAsset;
          }
        }

        return baseAsset;
      })
    );

    return {
      assets: assetsWithOptionalSignedUrls,
      total,
      limit,
      offset,
    };
  }

  @Query(() => AssetGraphQLType)
  async asset(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string,
    @Arg('signedUrl', { nullable: true, defaultValue: false })
    includeSignedUrl?: boolean
  ): Promise<AssetGraphQLType> {
    // Require authentication and read scope
    context.hasUserReadAppReadScope(context);

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid asset ID format');
    }

    const asset = await Asset.findById(id).lean();
    if (!asset) {
      throw new NotFoundError('Asset not found');
    }

    const baseAsset = {
      ...asset,
      id: asset._id.toString(),
      uploadedBy: asset.uploadedBy.toString(),
    } as AssetGraphQLType;

    // Conditionally generate signed URL
    if (includeSignedUrl) {
      try {
        const signedUrl = await s3Service.generateSignedUrl(asset.s3Key);
        return {
          ...baseAsset,
          signedUrl,
        };
      } catch (error) {
        console.error(`Failed to generate signed URL for asset ${id}:`, error);
        return baseAsset;
      }
    }

    return baseAsset;
  }

  @Query(() => AssetsResponse)
  async myAssets(
    @Ctx() context: GraphQLContext,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 20 })
    limit: number,
    @Arg('offset', () => Int, { nullable: true, defaultValue: 0 })
    offset: number,
    @Arg('assetType', () => AssetTypeEnum, { nullable: true })
    assetType?: AssetTypeEnum,
    @Arg('signedUrl', { nullable: true, defaultValue: false })
    includeSignedUrl?: boolean
  ): Promise<AssetsResponse> {
    // Require user session authentication
    if (!context.sessionInfo) {
      throw new UnauthorizedError('User session required to view your assets');
    }

    context.hasUserReadAppReadScope(context);

    // Validate pagination
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }

    // Build query for user's assets
    const query: Record<string, unknown> = {
      uploadedBy: context.sessionInfo.userId,
    };
    if (assetType) {
      query.assetType = assetType;
    }

    // Get user's assets
    const [assets, total] = await Promise.all([
      Asset.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      Asset.countDocuments(query),
    ]);

    // Conditionally generate signed URLs
    const assetsWithOptionalSignedUrls = await Promise.all(
      assets.map(async (asset) => {
        const baseAsset = {
          ...asset,
          id: asset._id.toString(),
          uploadedBy: asset.uploadedBy.toString(),
        } as AssetGraphQLType;

        if (includeSignedUrl) {
          try {
            const signedUrl = await s3Service.generateSignedUrl(asset.s3Key);
            return {
              ...baseAsset,
              signedUrl,
            };
          } catch (error) {
            console.error(
              `Failed to generate signed URL for asset ${asset._id}:`,
              error
            );
            return baseAsset;
          }
        }

        return baseAsset;
      })
    );

    return {
      assets: assetsWithOptionalSignedUrls,
      total,
      limit,
      offset,
    };
  }

  @Query(() => UploadProgressType)
  async uploadProgress(
    @Ctx() context: GraphQLContext,
    @Arg('uploadId', () => ID) uploadId: string
  ): Promise<UploadProgressType> {
    // Require authentication and read scope
    context.hasUserReadAppReadScope(context);

    // Require user session authentication
    if (!context.sessionInfo) {
      throw new UnauthorizedError(
        'User session required to view upload progress'
      );
    }

    // Validate uploadId format (simple string validation)
    if (!uploadId || uploadId.trim().length === 0) {
      throw new ValidationError('Invalid upload ID');
    }

    try {
      const progress = await getUploadProgress(
        uploadId,
        context.sessionInfo.userId
      );
      return progress as UploadProgressType;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      console.error(`Failed to get upload progress for ${uploadId}:`, error);
      throw new NotFoundError('Upload session not found');
    }
  }

  @Mutation(() => InitializeUploadResponse)
  async initializeChunkedUpload(
    @Ctx() context: GraphQLContext,
    @Arg('input', () => ChunkUploadInitInput) input: ChunkUploadInitInput
  ): Promise<InitializeUploadResponse> {
    // Require authentication and write scope
    context.hasUserWriteAppWriteScope(context);

    // Require user session authentication
    if (!context.sessionInfo) {
      throw new UnauthorizedError('User session required for asset uploads');
    }

    // Validate required fields
    if (!input.fileName || !input.mimeType || !input.totalSize) {
      throw new ValidationError(
        'Missing required fields: fileName, mimeType, totalSize'
      );
    }

    try {
      const chunkSize = input.chunkSize || DEFAULT_CHUNK_SIZE;
      const totalChunks = Math.ceil(input.totalSize / chunkSize);

      const initData: ChunkUploadInit = {
        fileName: input.fileName,
        mimeType: input.mimeType,
        totalSize: input.totalSize,
        ...(input.chunkSize !== undefined && { chunkSize: input.chunkSize }),
        totalChunks,
      };

      const result = await initializeChunkedUpload(
        initData,
        context.sessionInfo.userId
      );

      return result;
    } catch (error) {
      if (
        error instanceof ValidationError ||
        error instanceof UnauthorizedError
      ) {
        throw error;
      }
      console.error('Chunked upload initialization error:', error);
      throw new ValidationError('Failed to initialize chunked upload');
    }
  }

  @Mutation(() => CancelUploadResponse)
  async cancelUpload(
    @Ctx() context: GraphQLContext,
    @Arg('input', () => CancelUploadInput) input: CancelUploadInput
  ): Promise<CancelUploadResponse> {
    // Require authentication and write scope
    context.hasUserWriteAppWriteScope(context);

    // Require user session authentication
    if (!context.sessionInfo) {
      throw new UnauthorizedError('User session required');
    }

    // Validate uploadId
    if (!input.uploadId || input.uploadId.trim().length === 0) {
      throw new ValidationError('Invalid upload ID');
    }

    try {
      await cancelUpload(input.uploadId, context.sessionInfo.userId);

      return {
        success: true,
        message: 'Upload cancelled successfully',
      };
    } catch (error) {
      if (
        error instanceof ValidationError ||
        error instanceof UnauthorizedError
      ) {
        throw error;
      }
      console.error('Cancel upload error:', error);
      throw new ValidationError('Failed to cancel upload');
    }
  }
}
