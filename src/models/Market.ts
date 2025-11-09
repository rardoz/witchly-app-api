import { type Document, model, Schema, Types } from 'mongoose';

export interface IMarket extends Document {
  primaryAsset?: Types.ObjectId;
  secondaryAsset?: Types.ObjectId;
  finalAsset?: Types.ObjectId;
  name: string;
  description?: string;
  shortDescription?: string;
  price: number;
  locale: string;
  currency: string;
  url?: string;
  urlLabel?: string;
  likes: Types.ObjectId[];
  status: 'active' | 'paused' | 'deleted';
  category: Types.ObjectId;
  priority: number;
  user: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const marketSchema = new Schema<IMarket>(
  {
    primaryAsset: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: false,
    },
    secondaryAsset: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: false,
    },
    finalAsset: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: false,
      trim: true,
      maxlength: 5000,
    },
    shortDescription: {
      type: String,
      required: false,
      trim: true,
      maxlength: 500,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    locale: {
      type: String,
      required: true,
      default: 'en-US',
      lowercase: true,
      trim: true,
      index: true,
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
      uppercase: true,
      trim: true,
      maxlength: 3,
    },
    url: {
      type: String,
      required: false,
      trim: true,
      maxlength: 500,
    },
    urlLabel: {
      type: String,
      required: false,
      trim: true,
      maxlength: 100,
    },
    likes: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    status: {
      type: String,
      required: true,
      enum: ['active', 'paused', 'deleted'],
      default: 'active',
      lowercase: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    priority: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
marketSchema.index({ status: 1, priority: 1, createdAt: -1 });
marketSchema.index({ category: 1, status: 1 });
marketSchema.index({ locale: 1, status: 1 });

export const Market = model<IMarket>('Market', marketSchema);
