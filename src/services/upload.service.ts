import { createHash } from 'node:crypto';
import path from 'node:path';
import { Request } from 'express';
import { Types } from 'mongoose';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { s3Service } from '../config/s3';
import { Asset } from '../models/Asset';
import { type IUploadSession, UploadSession } from '../models/UploadSession';
import { ValidationError } from '../utils/errors';
import type { SessionInfo } from './session.service';

interface S3UploadResult {
  key: string;
  url: string;
  hashedFileName: string;
}

interface S3CompleteMultipartResult {
  location: string;
}

// Extended Request interface with session info
interface RequestWithSession extends Request {
  sessionInfo?: SessionInfo;
}

// Chunked upload interfaces
export interface ChunkUploadInit {
  fileName: string;
  mimeType: string;
  totalSize: number;
  chunkSize?: number;
  totalChunks?: number;
}

export interface ChunkUpload {
  uploadId: string;
  chunkIndex: number;
  chunkData: Buffer;
  chunkHash: string;
}

export interface UploadProgress {
  uploadId: string;
  fileName: string;
  totalSize: number;
  uploadedSize: number;
  chunksUploaded: number;
  totalChunks: number;
  progress: number; // 0-100
  status: 'initializing' | 'uploading' | 'completed' | 'failed';
  createdAt: Date;
  lastUpdated: Date;
}

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  location: string; // S3 URL
  key: string; // S3 key
  bucket: string; // S3 bucket
}

export interface AssetCreationResult {
  asset: {
    id: string;
    fileName: string;
    hashedFileName: string;
    mimeType: string;
    fileSize: number;
    s3Key: string;
    s3Url: string;
    signedUrl?: string;
    assetType: 'image' | 'video';
    uploadedBy: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

const MAX_IMAGE_SIZE_MB = process.env.ASSETS_MAX_IMAGE_SIZE_MB
  ? Number.parseInt(process.env.ASSETS_MAX_IMAGE_SIZE_MB, 10)
  : 50; // 50MB

const MAX_VIDEO_SIZE_MB = process.env.ASSETS_MAX_VIDEO_SIZE_MB
  ? Number.parseInt(process.env.ASSETS_MAX_VIDEO_SIZE_MB, 10)
  : 500; // 500MB

const MAX_IMAGE_SIZE = MAX_IMAGE_SIZE_MB * 1024 * 1024; // 50MB
const MAX_VIDEO_SIZE = MAX_VIDEO_SIZE_MB * 1024 * 1024; // 500MB

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
];

/**
 * Determine asset type from MIME type
 */
function getAssetType(mimeType: string): 'image' | 'video' {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    return 'image';
  }
  if (ALLOWED_VIDEO_TYPES.includes(mimeType)) {
    return 'video';
  }
  throw new ValidationError(`Unsupported MIME type: ${mimeType}`);
}

/**
 * Generate S3 key with directory prefix support
 */
function generateS3Key(
  hashedFileName: string,
  assetType: 'image' | 'video'
): string {
  const folder = assetType === 'image' ? 'images' : 'videos';
  const keyPath = `assets/${folder}/${hashedFileName}`;

  // Get directory prefix from environment (e.g., 'dev', 'staging', 'prod')
  const directoryPrefix = process.env.AWS_S3_DIRECTORY_PREFIX || '';

  if (directoryPrefix) {
    return `${directoryPrefix}/${keyPath}`;
  }

  return keyPath;
}

/**
 * Create multer middleware for streaming uploads directly to S3
 */
export function createUploadMiddleware() {
  return multer({
    storage: multerS3({
      s3: s3Service.getS3Client(),
      bucket: s3Service.getBucketName(),
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (
        req: Request,
        file: Express.Multer.File,
        cb: (error: unknown, key?: string) => void
      ) => {
        try {
          // Get user ID from session (set by auth middleware)
          const userId = (req as RequestWithSession).sessionInfo?.userId;
          if (!userId) {
            cb(new ValidationError('User session required for uploads'));
            return;
          }

          // Generate unique filename
          const hashedFileName = s3Service.generateHashedFileName(
            file.originalname,
            userId
          );

          // Determine asset type and folder
          const assetType = getAssetType(file.mimetype);
          const s3Key = generateS3Key(hashedFileName, assetType);

          cb(null, s3Key);
        } catch (error) {
          cb(error as Error);
        }
      },
      metadata: (
        req: Request,
        file: Express.Multer.File,
        cb: (error: unknown, metadata?: unknown) => void
      ) => {
        const userId = (req as RequestWithSession).sessionInfo?.userId;
        const assetType = getAssetType(file.mimetype);

        cb(null, {
          'original-filename': file.originalname,
          'uploaded-by': userId || 'unknown',
          'asset-type': assetType,
          'upload-timestamp': Date.now().toString(),
        });
      },
    }),
    limits: {
      fileSize: MAX_VIDEO_SIZE, // Use max video size as overall limit
      files: 1, // Only allow single file upload
    },
    fileFilter: (
      _req: Request,
      file: Express.Multer.File,
      cb: (error: unknown, acceptFile?: boolean) => void
    ) => {
      try {
        // Validate file type
        const isValidType = [
          ...ALLOWED_IMAGE_TYPES,
          ...ALLOWED_VIDEO_TYPES,
        ].includes(file.mimetype);

        if (!isValidType) {
          cb(new ValidationError(`Unsupported file type: ${file.mimetype}`));
          return;
        }

        // Note: file.size is not available in fileFilter for streaming uploads
        // Size validation will happen in the route after upload completes

        cb(null, true);
      } catch (error) {
        cb(error as Error);
      }
    },
  });
}

/**
 * Validate uploaded file size (called after streaming upload completes)
 */
export function validateUploadedFileSize(file: UploadedFile): void {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.mimetype);

  if (isImage && file.size > MAX_IMAGE_SIZE) {
    throw new ValidationError(
      `Image file size (${Math.round(file.size / (1024 * 1024))}MB) exceeds maximum allowed size (${MAX_IMAGE_SIZE / (1024 * 1024)}MB)`
    );
  }

  if (isVideo && file.size > MAX_VIDEO_SIZE) {
    throw new ValidationError(
      `Video file size (${Math.round(file.size / (1024 * 1024))}MB) exceeds maximum allowed size (${MAX_VIDEO_SIZE / (1024 * 1024)}MB)`
    );
  }
}

/**
 * Process uploaded file and create asset record (for streaming uploads)
 */
export async function processStreamedFileUpload(
  file: UploadedFile,
  userId: Types.ObjectId
): Promise<AssetCreationResult> {
  try {
    // Validate file size after upload
    validateUploadedFileSize(file);

    // Determine asset type
    const assetType = getAssetType(file.mimetype);

    // Extract hashed filename from S3 key
    const hashedFileName = path.basename(file.key);

    // Create database record
    const asset = new Asset({
      fileName: file.originalname,
      hashedFileName,
      mimeType: file.mimetype,
      fileSize: file.size,
      s3Key: file.key,
      s3Url: file.location,
      assetType,
      uploadedBy: userId,
    });

    await asset.save();

    return {
      asset: {
        id: asset._id.toString(),
        fileName: asset.fileName,
        hashedFileName: asset.hashedFileName,
        mimeType: asset.mimeType,
        fileSize: asset.fileSize,
        s3Key: asset.s3Key,
        s3Url: asset.s3Url,
        assetType: asset.assetType,
        uploadedBy: asset.uploadedBy.toString(),
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
      },
    };
  } catch (error) {
    console.error('Streamed file upload processing error:', error);

    // Clean up S3 file if database operation fails
    try {
      await s3Service.deleteFile(file.key);
      console.log(`Cleaned up S3 file: ${file.key}`);
    } catch (cleanupError) {
      console.error(`Failed to cleanup S3 file ${file.key}:`, cleanupError);
    }

    throw error;
  }
}

const DEFAULT_CHUNK_SIZE_MB = process.env.ASSETS_DEFAULT_CHUNK_SIZE_MB
  ? Number.parseInt(process.env.ASSETS_DEFAULT_CHUNK_SIZE_MB, 10)
  : 5;

const DEFAULT_MIN_CHUNK_SIZE_MB = process.env.ASSETS_MIN_CHUNK_SIZE_MB
  ? Number.parseInt(process.env.ASSETS_MIN_CHUNK_SIZE_MB, 10)
  : 1;

const DEFAULT_MAX_CHUNK_SIZE_MB = process.env.ASSETS_MAX_CHUNK_SIZE_MB
  ? Number.parseInt(process.env.ASSETS_MAX_CHUNK_SIZE_MB, 10)
  : 100;

const DEFAULT_SINGLE_PART_UPLOAD_THRESHOLD_MB = process.env
  .ASSETS_SINGLE_PART_UPLOAD_THRESHOLD_MB
  ? Number.parseInt(process.env.ASSETS_SINGLE_PART_UPLOAD_THRESHOLD_MB, 10)
  : 5;

// Chunked upload constants
export const DEFAULT_CHUNK_SIZE = DEFAULT_CHUNK_SIZE_MB * 1024 * 1024; // 5MB chunks
export const MIN_CHUNK_SIZE = DEFAULT_MIN_CHUNK_SIZE_MB * 1024 * 1024; // 1MB minimum
export const MAX_CHUNK_SIZE = DEFAULT_MAX_CHUNK_SIZE_MB * 1024 * 1024; // 100MB maximum
export const SINGLE_UPLOAD_THRESHOLD =
  DEFAULT_SINGLE_PART_UPLOAD_THRESHOLD_MB * 1024 * 1024; // Use single upload for files < 5MB

/**
 * Initialize a chunked upload session
 */
export async function initializeChunkedUpload(
  initData: ChunkUploadInit,
  userId: string
): Promise<{ uploadId: string; chunkSize: number }> {
  // Validate file type
  const assetType = getAssetType(initData.mimeType);

  // Validate file size
  const maxSize = assetType === 'image' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
  if (initData.totalSize > maxSize) {
    throw new ValidationError(
      `File size (${Math.round(initData.totalSize / (1024 * 1024))}MB) exceeds maximum allowed size (${maxSize / (1024 * 1024)}MB)`
    );
  }

  // Determine upload strategy based on file size
  const useSingleUpload = initData.totalSize < SINGLE_UPLOAD_THRESHOLD;

  // Validate chunk size
  const chunkSize = useSingleUpload
    ? initData.totalSize // For single upload, chunk size equals file size
    : Math.max(
        MIN_CHUNK_SIZE,
        Math.min(MAX_CHUNK_SIZE, initData.chunkSize || DEFAULT_CHUNK_SIZE)
      );
  const totalChunks = useSingleUpload
    ? 1
    : Math.ceil(initData.totalSize / chunkSize);

  // Generate upload ID and S3 key
  const uploadId = createHash('sha256')
    .update(`${initData.fileName}-${userId}-${Date.now()}`)
    .digest('hex');

  const hashedFileName = s3Service.generateHashedFileName(
    initData.fileName,
    userId
  );
  const s3Key = generateS3Key(hashedFileName, assetType);

  // Create upload session in MongoDB
  const session = new UploadSession({
    uploadId,
    userId: new Types.ObjectId(userId),
    fileName: initData.fileName,
    mimeType: initData.mimeType,
    totalSize: initData.totalSize,
    chunkSize,
    totalChunks,
    s3Key,
    uploadedChunks: [],
    useSingleUpload,
    status: 'initializing',
  });

  await session.save();

  return { uploadId, chunkSize };
}

/**
 * Upload a single chunk
 */
export async function uploadChunk(
  chunkData: ChunkUpload,
  userId: string
): Promise<UploadProgress> {
  const session = await UploadSession.findOne({ uploadId: chunkData.uploadId });
  if (!session) {
    throw new ValidationError('Upload session not found or expired');
  }

  if (session.userId.toString() !== userId) {
    throw new ValidationError('Unauthorized access to upload session');
  }

  if (session.status === 'completed') {
    throw new ValidationError('Upload already completed');
  }

  if (session.status === 'failed') {
    throw new ValidationError('Upload session failed');
  }

  // Validate chunk hash
  const calculatedHash = createHash('sha256')
    .update(chunkData.chunkData)
    .digest('hex');
  if (calculatedHash !== chunkData.chunkHash) {
    throw new ValidationError('Chunk integrity check failed');
  }

  // Check if chunk already uploaded
  if (session.uploadedChunks.includes(chunkData.chunkIndex)) {
    console.log(`Chunk ${chunkData.chunkIndex} already uploaded, skipping`);
    return getUploadProgress(chunkData.uploadId, userId);
  }

  try {
    if (session.useSingleUpload) {
      // Handle single file upload for files < 5MB
      if (chunkData.chunkIndex !== 0) {
        throw new ValidationError('Single upload only accepts chunk index 0');
      }

      session.status = 'uploading';

      // Upload directly to S3 using uploadAsset
      const uploadResult = await s3Service.uploadAsset(
        {
          fileName: session.fileName,
          mimeType: session.mimeType,
          fileSize: session.totalSize,
          buffer: chunkData.chunkData,
          assetType: getAssetType(session.mimeType),
        },
        session.userId.toString()
      );

      // Mark as completed
      session.uploadedChunks.push(0);
      session.status = 'completed';
      await session.save();

      // Create asset record
      await createSingleUploadAssetRecord(session, uploadResult);
    } else {
      // Handle multipart upload for files >= 5MB
      // Initialize multipart upload if this is the first chunk
      if (!session.multipartUpload && chunkData.chunkIndex === 0) {
        const multipartUpload = await s3Service.initializeMultipartUpload(
          session.s3Key,
          session.mimeType
        );
        session.multipartUpload = {
          uploadId: multipartUpload.uploadId,
          parts: [],
        };
        session.status = 'uploading';
      }

      if (!session.multipartUpload) {
        throw new Error('Multipart upload not initialized');
      }

      // Upload chunk to S3
      const partNumber = chunkData.chunkIndex + 1; // S3 part numbers start at 1
      const uploadPartResult = await s3Service.uploadPart(
        session.s3Key,
        session.multipartUpload.uploadId,
        partNumber,
        chunkData.chunkData
      );

      // Store part info
      const parts = session.multipartUpload.parts || [];
      parts[chunkData.chunkIndex] = {
        ETag: uploadPartResult.ETag || '',
        PartNumber: partNumber,
      };
      session.multipartUpload.parts = parts;

      // Mark chunk as uploaded
      session.uploadedChunks.push(chunkData.chunkIndex);
      await session.save();

      // Check if upload is complete
      if (session.uploadedChunks.length === session.totalChunks) {
        await completeMultipartUpload(session);
      }
    }

    return getUploadProgress(chunkData.uploadId, userId);
  } catch (error) {
    console.error('Chunk upload error:', error);
    session.status = 'failed';
    await session.save();
    throw new ValidationError('Failed to upload chunk');
  }
}

/**
 * Get upload progress
 */
export async function getUploadProgress(
  uploadId: string,
  userId: string
): Promise<UploadProgress> {
  const session = await UploadSession.findOne({ uploadId });
  if (!session) {
    throw new ValidationError('Upload session not found or expired');
  }

  if (session.userId.toString() !== userId) {
    throw new ValidationError('Unauthorized access to upload session');
  }

  const uploadedSize = session.uploadedChunks.length * session.chunkSize;
  const progress = Math.round(
    (session.uploadedChunks.length / session.totalChunks) * 100
  );

  return {
    uploadId: session.uploadId,
    fileName: session.fileName,
    totalSize: session.totalSize,
    uploadedSize: Math.min(uploadedSize, session.totalSize),
    chunksUploaded: session.uploadedChunks.length,
    totalChunks: session.totalChunks,
    progress,
    status: session.status,
    createdAt: session.createdAt,
    lastUpdated: session.updatedAt,
  };
}

/**
 * Create asset record for single upload
 */
async function createSingleUploadAssetRecord(
  session: IUploadSession,
  uploadResult: S3UploadResult
): Promise<void> {
  try {
    const assetType = getAssetType(session.mimeType);

    const asset = new Asset({
      fileName: session.fileName,
      hashedFileName: uploadResult.hashedFileName,
      mimeType: session.mimeType,
      fileSize: session.totalSize,
      s3Key: uploadResult.key,
      s3Url: uploadResult.url,
      assetType,
      uploadedBy: session.userId,
    });

    await asset.save();
    console.log(`Single upload completed: ${uploadResult.key}`);
  } catch (error) {
    console.error('Error creating asset record for single upload:', error);
    session.status = 'failed';
    await session.save();
    throw error;
  }
}

/**
 * Complete multipart upload and create asset record
 */
async function completeMultipartUpload(session: IUploadSession): Promise<void> {
  if (!session.multipartUpload) {
    throw new Error('Multipart upload not initialized');
  }

  try {
    // Complete S3 multipart upload
    const completeResult: S3CompleteMultipartResult =
      await s3Service.completeMultipartUpload(
        session.s3Key,
        session.multipartUpload.uploadId,
        session.multipartUpload.parts
      );

    // Create asset record in database
    const assetType = getAssetType(session.mimeType);
    const hashedFileName = path.basename(session.s3Key);

    const asset = new Asset({
      fileName: session.fileName,
      hashedFileName,
      mimeType: session.mimeType,
      fileSize: session.totalSize,
      s3Key: session.s3Key,
      s3Url: completeResult.location,
      assetType,
      uploadedBy: session.userId,
    });

    await asset.save();

    session.status = 'completed';
    await session.save();

    console.log(`Chunked upload completed: ${session.s3Key}`);
  } catch (error) {
    console.error('Error completing multipart upload:', error);
    session.status = 'failed';
    await session.save();

    // Try to abort the multipart upload
    try {
      await s3Service.abortMultipartUpload(
        session.s3Key,
        session.multipartUpload.uploadId
      );
    } catch (abortError) {
      console.error('Error aborting multipart upload:', abortError);
    }

    throw error;
  }
}

/**
 * Cancel an upload session
 */
export async function cancelUpload(
  uploadId: string,
  userId: string
): Promise<void> {
  const session = await UploadSession.findOne({ uploadId });
  if (!session) {
    throw new ValidationError('Upload session not found or expired');
  }

  if (session.userId.toString() !== userId) {
    throw new ValidationError('Unauthorized access to upload session');
  }

  // Abort S3 multipart upload if it exists
  if (session.multipartUpload) {
    try {
      await s3Service.abortMultipartUpload(
        session.s3Key,
        session.multipartUpload.uploadId
      );
    } catch (error) {
      console.error('Error aborting multipart upload:', error);
    }
  }

  // Remove session from database
  await UploadSession.deleteOne({ uploadId });
}
