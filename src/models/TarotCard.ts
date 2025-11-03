import { type Document, model, Schema, Types } from 'mongoose';

export interface ITarotCard extends Document {
  name: string;
  tarotCardNumber?: string;
  primaryAsset?: Types.ObjectId;
  description?: string;
  locale?: string;
  meta?: string[];
  status: 'active' | 'paused' | 'deleted';
  user?: Types.ObjectId;
  tarotDeck: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const tarotCardSchema = new Schema<ITarotCard>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    tarotCardNumber: {
      type: String,
      required: false,
      trim: true,
    },
    primaryAsset: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: false,
    },
    description: {
      type: String,
      required: false,
      trim: true,
      maxlength: 10000,
    },
    locale: {
      type: String,
      required: false,
      trim: true,
    },
    meta: {
      type: [String],
      default: [],
      validate: {
        validator: (v: string[]) => {
          return v.length <= 20; // Limit meta tags
        },
        message: 'Meta array cannot contain more than 20 items',
      },
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
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    tarotDeck: {
      type: Schema.Types.ObjectId,
      ref: 'TarotDeck',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
tarotCardSchema.index({ name: 1 });
tarotCardSchema.index({ tarotDeck: 1 });
tarotCardSchema.index({ status: 1 });
tarotCardSchema.index({ locale: 1 });
tarotCardSchema.index({ createdAt: -1 });

// Compound index for cards by deck and status
tarotCardSchema.index({ tarotDeck: 1, status: 1 });

// Compound index for cards by deck and locale
tarotCardSchema.index({ tarotDeck: 1, locale: 1 });

export const TarotCard = model<ITarotCard>('TarotCard', tarotCardSchema);
