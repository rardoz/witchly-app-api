import { type Document, model, Schema } from 'mongoose';

export interface ITarotDeck extends Document {
  name?: string;
  primaryImageUrl?: string;
  cardBackgroundUrl?: string;
  primaryColor?: string;
  description?: string;
  author?: string;
  meta?: string[];
  layoutType?: string;
  layoutCount?: number;
  status: 'active' | 'paused';
  createdAt: Date;
  updatedAt: Date;
}

const tarotDeckSchema = new Schema<ITarotDeck>(
  {
    name: {
      type: String,
      required: false,
      trim: true,
      maxlength: 100,
    },
    primaryImageUrl: {
      type: String,
      required: false,
      trim: true,
      validate: {
        validator: (v: string) => {
          // Basic URL validation only if value is provided
          if (!v) return true;
          return /^https?:\/\/.+\..+/.test(v);
        },
        message: 'Primary image URL must be a valid HTTP/HTTPS URL',
      },
    },
    cardBackgroundUrl: {
      type: String,
      required: false,
      trim: true,
      validate: {
        validator: (v: string) => {
          // Basic URL validation only if value is provided
          if (!v) return true;
          return /^https?:\/\/.+\..+/.test(v);
        },
        message: 'Card background URL must be a valid HTTP/HTTPS URL',
      },
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
    author: {
      type: String,
      required: false,
      trim: true,
      maxlength: 100,
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
    layoutType: {
      type: String,
      required: false,
      default: 'default',
      trim: true,
    },
    layoutCount: {
      type: Number,
      required: false,
      default: 1,
      min: [1, 'Layout count must be at least 1'],
      max: [50, 'Layout count cannot exceed 50'],
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['active', 'paused'],
        message: 'Status must be either "active" or "paused"',
      },
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
tarotDeckSchema.index({ name: 1 });
tarotDeckSchema.index({ author: 1 });
tarotDeckSchema.index({ status: 1 });
tarotDeckSchema.index({ layoutType: 1 });
tarotDeckSchema.index({ createdAt: -1 });

// Compound index for decks by author and status
tarotDeckSchema.index({ author: 1, status: 1 });

export const TarotDeck = model<ITarotDeck>('TarotDeck', tarotDeckSchema);
