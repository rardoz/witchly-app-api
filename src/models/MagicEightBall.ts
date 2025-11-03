import { type Document, model, Schema, Types } from 'mongoose';

export interface IMagicEightBall extends Document {
  name?: string;
  primaryAsset?: Types.ObjectId;
  backgroundAsset?: Types.ObjectId;
  user?: Types.ObjectId;
  primaryColor?: string;
  description?: string;
  diceNumber: number;
  status: 'active' | 'paused' | 'deleted';
  locale?: string;
  createdAt: Date;
  updatedAt: Date;
}

const magicEightBallSchema = new Schema<IMagicEightBall>(
  {
    name: {
      type: String,
      required: false,
      trim: true,
      maxlength: 100,
    },
    primaryAsset: { type: Schema.Types.ObjectId, ref: 'Asset' },
    backgroundAsset: { type: Schema.Types.ObjectId, ref: 'Asset' },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    locale: {
      type: String,
      required: false,
      trim: true,
    },
    primaryColor: {
      type: String,
      required: false,
      trim: true,
      validate: {
        validator: (v: string) => {
          // Validate hex color format only if value is provided
          if (!v) return true;
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message:
          'Primary color must be a valid hex color (e.g., #FF5733 or #F53)',
      },
    },
    description: {
      type: String,
      required: false,
      trim: true,
      maxlength: 5000,
    },
    diceNumber: {
      type: Number,
      required: true,
      min: [1, 'Dice number must be at least 1'],
      max: [20, 'Dice number cannot exceed 20'],
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
magicEightBallSchema.index({ status: 1 });
magicEightBallSchema.index({ locale: 1 });
magicEightBallSchema.index({ createdAt: -1 });

// Compound unique index for dice number per locale
magicEightBallSchema.index({ diceNumber: 1, locale: 1 }, { unique: true });

export const MagicEightBall = model<IMagicEightBall>(
  'MagicEightBall',
  magicEightBallSchema
);
