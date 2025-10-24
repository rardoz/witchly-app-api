import { type Document, model, Schema, type Types } from 'mongoose';

export interface IUploadSession extends Document {
  _id: Types.ObjectId;
  uploadId: string;
  userId: Types.ObjectId;
  fileName: string;
  mimeType: string;
  totalSize: number;
  chunkSize: number;
  totalChunks: number;
  s3Key: string;
  uploadedChunks: number[]; // Array of uploaded chunk indices
  useSingleUpload: boolean;
  multipartUpload?: {
    uploadId: string;
    parts: Array<{ ETag: string; PartNumber: number }>;
  };
  status: 'initializing' | 'uploading' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date; // TTL field for automatic cleanup
}

const uploadSessionSchema = new Schema<IUploadSession>(
  {
    uploadId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    totalSize: {
      type: Number,
      required: true,
      min: 0,
    },
    chunkSize: {
      type: Number,
      required: true,
      min: 0,
    },
    totalChunks: {
      type: Number,
      required: true,
      min: 1,
    },
    s3Key: {
      type: String,
      required: true,
      trim: true,
    },
    uploadedChunks: {
      type: [Number],
      default: [],
      index: true,
    },
    useSingleUpload: {
      type: Boolean,
      required: true,
      default: false,
    },
    multipartUpload: {
      type: {
        uploadId: {
          type: String,
          trim: true,
        },
        parts: [
          {
            ETag: {
              type: String,
              required: true,
              trim: true,
            },
            PartNumber: {
              type: Number,
              required: true,
              min: 1,
            },
          },
        ],
      },
      required: false,
    },
    status: {
      type: String,
      required: true,
      enum: ['initializing', 'uploading', 'completed', 'failed'],
      default: 'initializing',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    },
  },
  {
    timestamps: true,
  }
);

// Create TTL index for automatic cleanup
uploadSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Performance indexes
uploadSessionSchema.index({ userId: 1, createdAt: -1 });
uploadSessionSchema.index({ status: 1, createdAt: -1 });

export const UploadSession = model<IUploadSession>(
  'UploadSession',
  uploadSessionSchema
);
