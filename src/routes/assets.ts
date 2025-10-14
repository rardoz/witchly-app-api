import { Request, Response, Router } from 'express';
import { Types } from 'mongoose';
import {
  createGraphQLContext,
  optionalAuth,
} from '../middleware/auth.middleware';
import {
  createUploadMiddleware,
  processStreamedFileUpload,
  uploadChunk,
  validateUploadedFileSize,
} from '../services/upload.service';
import { UnauthorizedError, ValidationError } from '../utils/errors';

// Multer-S3 file interface (extends the base Multer.File)
interface MulterS3File extends Express.Multer.File {
  location: string;
  key: string;
  bucket: string;
}

const router = Router();

// Apply authentication middleware to all asset routes
router.use(optionalAuth);

// Raw body parser for chunk uploads (up to 100MB chunks)
const rawBodyParser = (req: Request, _res: Response, next: () => void) => {
  if (req.path.includes('/chunked/upload/')) {
    let data = Buffer.alloc(0);
    req.on('data', (chunk: Buffer) => {
      data = Buffer.concat([data, chunk]);
    });
    req.on('end', () => {
      req.body = data;
      next();
    });
  } else {
    next();
  }
};

/**
 * Upload asset endpoint
 * POST /api/assets/upload
 *
 * Requires:
 * - OAuth2 Authorization header with write scope
 * - X-Session-Token header for user authentication
 * - multipart/form-data with 'file' field
 */
router.post(
  '/upload',
  createUploadMiddleware().single('file'),
  async (req: Request, res: Response) => {
    try {
      const context = createGraphQLContext(req);
      // Check OAuth2 authentication and write scope
      context.hasUserWriteAppWriteScope(context);

      // Check user session authentication
      if (!req.sessionInfo?.userId) {
        throw new UnauthorizedError('User session required for asset uploads');
      }

      // Check if file was uploaded
      if (!req.file) {
        throw new ValidationError(
          'No file uploaded. Please include a file in the "file" field.'
        );
      }

      // For multer-s3, the file object has different properties
      const uploadedFile = req.file as MulterS3File;

      // Validate file size after streaming upload
      validateUploadedFileSize({
        fieldname: uploadedFile.fieldname,
        originalname: uploadedFile.originalname,
        encoding: uploadedFile.encoding,
        mimetype: uploadedFile.mimetype,
        size: uploadedFile.size,
        location: uploadedFile.location,
        key: uploadedFile.key,
        bucket: uploadedFile.bucket,
      });

      // Process the streamed file upload
      const result = await processStreamedFileUpload(
        {
          fieldname: uploadedFile.fieldname,
          originalname: uploadedFile.originalname,
          encoding: uploadedFile.encoding,
          mimetype: uploadedFile.mimetype,
          size: uploadedFile.size,
          location: uploadedFile.location,
          key: uploadedFile.key,
          bucket: uploadedFile.bucket,
        },
        new Types.ObjectId(req.sessionInfo.userId)
      );

      res.status(201).json({
        success: true,
        message: 'Asset uploaded successfully',
        asset: result.asset,
      });
    } catch (error) {
      console.error('Asset upload error:', error);

      if (error instanceof UnauthorizedError) {
        res.status(401).json({
          success: false,
          message: error.message,
        });
      } else if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to upload asset. Please try again.',
        });
      }
    }
  }
);

/**
 * Upload chunk
 * POST /api/assets/chunked/upload/:uploadId/:chunkIndex
 */
router.post(
  '/chunked/upload/:uploadId/:chunkIndex',
  rawBodyParser,
  async (req: Request, res: Response) => {
    try {
      // Check OAuth2 authentication and write scope
      if (!req.client?.scopes?.includes('write')) {
        throw new UnauthorizedError('Write access required for asset uploads');
      }

      // Check user session authentication
      if (!req.sessionInfo?.userId) {
        throw new UnauthorizedError('User session required for asset uploads');
      }

      const { uploadId, chunkIndex } = req.params;
      const chunkHash = req.headers['x-chunk-hash'] as string;

      if (!uploadId || !chunkIndex) {
        throw new ValidationError(
          'Missing uploadId or chunkIndex in URL parameters'
        );
      }

      if (!chunkHash) {
        throw new ValidationError('Missing X-Chunk-Hash header');
      }

      const chunkIndexNum = parseInt(chunkIndex, 10);
      if (Number.isNaN(chunkIndexNum) || chunkIndexNum < 0) {
        throw new ValidationError('Invalid chunk index');
      }

      // Get chunk data from request body (raw binary)
      const chunkData = req.body as Buffer;

      if (!chunkData || chunkData.length === 0) {
        throw new ValidationError('No chunk data received');
      }

      const result = await uploadChunk(
        {
          uploadId,
          chunkIndex: chunkIndexNum,
          chunkData,
          chunkHash,
        },
        req.sessionInfo.userId
      );

      res.json({
        success: true,
        message: 'Chunk uploaded successfully',
        progress: result,
      });
    } catch (error) {
      console.error('Chunk upload error:', error);

      if (error instanceof UnauthorizedError) {
        res.status(401).json({
          success: false,
          message: error.message,
        });
      } else if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to upload chunk',
        });
      }
    }
  }
);

export { router as assetRoutes };
