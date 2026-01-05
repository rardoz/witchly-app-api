import { type Document, model, Schema, Types } from 'mongoose';

export interface IMoonPhase extends Document {
  locale?: string;
  description?: string;
  phase: string;
  phaseLocal?: string;
  number?: number;
  primaryAsset?: Types.ObjectId | null;
  backgroundAsset?: Types.ObjectId | null;
  primaryColor?: string;
  user?: Types.ObjectId;
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
    phase: {
      type: String,
      required: true,
      trim: true,
    },
    phaseLocal: {
      type: String,
      required: false,
      trim: true,
    },
    number: {
      type: Number,
      required: false,
      min: 0,
      max: 14,
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
moonPhaseSchema.index({ phase: 1 });
moonPhaseSchema.index({ locale: 1 });
moonPhaseSchema.index({ status: 1 });
moonPhaseSchema.index({ number: 1 });
moonPhaseSchema.index({ createdAt: -1 });

// Compound indexes
moonPhaseSchema.index({ locale: 1, status: 1 });

export const MoonPhase = model<IMoonPhase>('MoonPhase', moonPhaseSchema);
