import { type Document, model, Schema, type Types } from 'mongoose';

export interface IAsset extends Document {
  _id: Types.ObjectId;
  fileName: string; // Original filename
  hashedFileName: string; // Hashed unique filename
  mimeType: string; // File MIME type
  fileSize: number; // File size in bytes
  s3Key: string; // S3 object key
  s3Url: string; // Raw S3 URL without credentials
  assetType: 'image' | 'video'; // Asset type
  uploadedBy: Types.ObjectId; // Reference to User document
  createdAt: Date;
  updatedAt: Date;
  publicUrl: string;
}

const assetSchema = new Schema<IAsset>(
  {
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    hashedFileName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      required: true,
      min: 0,
    },
    s3Key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    s3Url: {
      type: String,
      required: true,
      trim: true,
    },
    assetType: {
      type: String,
      required: true,
      enum: ['image', 'video'],
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // Include virtuals when converting to JSON
    toObject: { virtuals: true }, // Include virtuals when converting to Object
  }
);

assetSchema.virtual('publicUrl').get(function (this: IAsset) {
  const baseUrl = process.env.PUBLIC_ASSET_URL || 'https://assets.witchly.app';
  return `${baseUrl}/${this.s3Key}`;
});

// Performance indexes
assetSchema.index({ uploadedBy: 1, createdAt: -1 });
assetSchema.index({ assetType: 1 });
assetSchema.index({ createdAt: -1 });

export const Asset = model<IAsset>('Asset', assetSchema);
