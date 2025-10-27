import { createHash } from 'node:crypto';
import path from 'node:path';
import type { Readable } from 'node:stream';
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  type PutObjectCommandInput,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface S3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  urlExpirationMinutes?: number;
  directoryPrefix?: string;
}

export interface UploadResult {
  key: string;
  url: string;
  signedUrl?: string;
  hashedFileName: string;
}

export interface AssetUploadData {
  fileName: string;
  mimeType: string;
  fileSize: number;
  buffer: Buffer;
  assetType: 'image' | 'video';
}

export interface MultipartUploadInit {
  uploadId: string;
  key: string;
}

export interface UploadPartResult {
  ETag: string;
}

export interface CompleteMultipartUploadResult {
  location: string;
  bucket: string;
  key: string;
}

export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;
  private urlExpirationMinutes: number;
  private directoryPrefix: string;

  constructor(config: S3Config) {
    this.s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.bucketName = config.bucketName;
    this.urlExpirationMinutes = config.urlExpirationMinutes || 60; // Default 1 hour
    this.directoryPrefix = config.directoryPrefix || ''; // Default to root
  }

  /**
   * Generate a unique hashed filename
   */
  generateHashedFileName(originalFileName: string, userId: string): string {
    const timestamp = Date.now().toString();
    const extension = path.extname(originalFileName);
    const nameWithoutExt = path.basename(originalFileName, extension);

    // Create hash from filename, user ID, and timestamp for uniqueness
    const hash = createHash('sha256')
      .update(`${nameWithoutExt}-${userId}-${timestamp}`)
      .digest('hex');

    return `${hash}${extension}`;
  }

  /**
   * Generate S3 key with folder structure and optional directory prefix
   */
  private generateS3Key(
    hashedFileName: string,
    assetType: 'image' | 'video'
  ): string {
    const folder = assetType === 'image' ? 'images' : 'videos';
    const keyPath = `assets/${folder}/${hashedFileName}`;

    // Add directory prefix if configured (e.g., 'dev', 'staging', 'prod')
    if (this.directoryPrefix) {
      return `${this.directoryPrefix}/${keyPath}`;
    }

    return keyPath;
  }

  /**
   * Validate file type
   */
  private validateFileType(
    mimeType: string,
    assetType: 'image' | 'video'
  ): boolean {
    const imageTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    const videoTypes = [
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
    ];

    if (assetType === 'image') {
      return imageTypes.includes(mimeType);
    } else if (assetType === 'video') {
      return videoTypes.includes(mimeType);
    }

    return false;
  }

  /**
   * Upload file to S3 with streaming
   */
  async uploadAsset(
    uploadData: AssetUploadData,
    userId: string,
    generateSignedUrl = false
  ): Promise<UploadResult> {
    // Validate file type
    if (!this.validateFileType(uploadData.mimeType, uploadData.assetType)) {
      throw new Error(
        `Invalid file type: ${uploadData.mimeType} for ${uploadData.assetType}`
      );
    }

    // Generate unique filename and S3 key
    const hashedFileName = this.generateHashedFileName(
      uploadData.fileName,
      userId
    );
    const s3Key = this.generateS3Key(hashedFileName, uploadData.assetType);

    // Prepare upload parameters
    const uploadParams: PutObjectCommandInput = {
      Bucket: this.bucketName,
      Key: s3Key,
      Body: uploadData.buffer,
      ContentType: uploadData.mimeType,
      ContentLength: uploadData.fileSize,
      Metadata: {
        'original-filename': uploadData.fileName,
        'uploaded-by': userId,
        'asset-type': uploadData.assetType,
      },
    };

    try {
      // Upload to S3
      const command = new PutObjectCommand(uploadParams);
      await this.s3Client.send(command);

      // Generate URLs
      const rawUrl = `https://${this.bucketName}.s3.amazonaws.com/${s3Key}`;

      const result: UploadResult = {
        key: s3Key,
        url: rawUrl,
        hashedFileName,
      };

      // Only generate signed URL if requested
      if (generateSignedUrl) {
        result.signedUrl = await this.generateSignedUrl(s3Key);
      }

      return result;
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error('Failed to upload file to S3');
    }
  }

  /**
   * Generate signed URL for secure access
   */
  async generateSignedUrl(s3Key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });

    try {
      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: this.urlExpirationMinutes * 60, // Convert to seconds
      });
      return signedUrl;
    } catch (error) {
      console.error('Failed to generate signed URL:', error);
      throw new Error('Failed to generate signed URL');
    }
  }

  /**
   * Get file stream from S3 (for downloading)
   */
  async getFileStream(s3Key: string): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });

    try {
      const response = await this.s3Client.send(command);
      return response.Body as Readable;
    } catch (error) {
      console.error('Failed to get file stream:', error);
      throw new Error('Failed to retrieve file from S3');
    }
  }

  /**
   * Check if file exists in S3
   */
  async fileExists(s3Key: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });
      await this.s3Client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(s3Key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });
      await this.s3Client.send(command);
    } catch (error) {
      console.error('Failed to delete file from S3:', error);
      throw new Error('Failed to delete file from S3');
    }
  }

  /**
   * Get S3 client instance (for multer-s3)
   */
  getS3Client(): S3Client {
    return this.s3Client;
  }

  /**
   * Get bucket name (for multer-s3)
   */
  getBucketName(): string {
    return this.bucketName;
  }

  /**
   * Initialize multipart upload
   */
  async initializeMultipartUpload(
    s3Key: string,
    mimeType: string
  ): Promise<MultipartUploadInit> {
    try {
      const command = new CreateMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        ContentType: mimeType,
        Metadata: {
          'upload-type': 'chunked',
          'created-at': new Date().toISOString(),
        },
      });

      const response = await this.s3Client.send(command);

      if (!response.UploadId) {
        throw new Error('Failed to initialize multipart upload');
      }

      return {
        uploadId: response.UploadId,
        key: s3Key,
      };
    } catch (error) {
      console.error('Failed to initialize multipart upload:', error);
      throw new Error('Failed to initialize multipart upload');
    }
  }

  /**
   * Upload a single part
   */
  async uploadPart(
    s3Key: string,
    uploadId: string,
    partNumber: number,
    data: Buffer
  ): Promise<UploadPartResult> {
    try {
      const command = new UploadPartCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: data,
      });

      const response = await this.s3Client.send(command);

      if (!response.ETag) {
        throw new Error('Failed to upload part');
      }

      return {
        ETag: response.ETag,
      };
    } catch (error) {
      console.error('Failed to upload part:', error);
      throw new Error('Failed to upload part');
    }
  }

  /**
   * Complete multipart upload
   */
  async completeMultipartUpload(
    s3Key: string,
    uploadId: string,
    parts: Array<{ ETag: string; PartNumber: number }>
  ): Promise<CompleteMultipartUploadResult> {
    try {
      const command = new CompleteMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts.map((part) => ({
            ETag: part.ETag,
            PartNumber: part.PartNumber,
          })),
        },
      });

      const response = await this.s3Client.send(command);

      if (!response.Location) {
        throw new Error('Failed to complete multipart upload');
      }

      return {
        location: response.Location,
        bucket: this.bucketName,
        key: s3Key,
      };
    } catch (error) {
      console.error('Failed to complete multipart upload:', error);
      throw new Error('Failed to complete multipart upload');
    }
  }

  /**
   * Abort multipart upload
   */
  async abortMultipartUpload(s3Key: string, uploadId: string): Promise<void> {
    try {
      const command = new AbortMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        UploadId: uploadId,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('Failed to abort multipart upload:', error);
      throw new Error('Failed to abort multipart upload');
    }
  }
}
