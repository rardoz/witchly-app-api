import { type Document, model, Schema, Types } from 'mongoose';

export interface IMoonPhase extends Document {
  locale?: string;
  description?: string;
  name: string;
  number?: number;
  primaryAsset?: Types.ObjectId;
  backgroundAsset?: Types.ObjectId;
  primaryColor?: string;
  user?: Types.ObjectId;
  moonSign?: string;
  status: 'active' | 'paused' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
}

const moonPhaseSchema = new Schema<IMoonPhase>(
  {
    locale: {
      type: String,
      required: false,
      trim: true,
    },
    description: {
      type: String,
      required: false,
      trim: true,
      maxlength: 10000,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    number: {
      type: Number,
      required: false,
      min: 0,
      max: 8,
    },
    primaryAsset: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: false,
    },
    backgroundAsset: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: false,
    },
    primaryColor: {
      type: String,
      required: false,
      trim: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    moonSign: {
      type: String,
      required: false,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['active', 'paused', 'deleted'],
        message: 'Status must be either "active", "paused", or "deleted"',
      },
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
moonPhaseSchema.index({ name: 1 });
moonPhaseSchema.index({ locale: 1 });
moonPhaseSchema.index({ status: 1 });
moonPhaseSchema.index({ moonSign: 1 });
moonPhaseSchema.index({ number: 1 });
moonPhaseSchema.index({ createdAt: -1 });

// Compound indexes
moonPhaseSchema.index({ locale: 1, status: 1 });
moonPhaseSchema.index({ moonSign: 1, status: 1 });

export const MoonPhase = model<IMoonPhase>('MoonPhase', moonPhaseSchema);
