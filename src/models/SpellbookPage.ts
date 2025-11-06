import { type Document, model, Schema, Types } from 'mongoose';

export interface ISpellbookPage extends Document {
  title: string;
  shortDescription?: string;
  richText?: string;
  primaryAsset?: Types.ObjectId;
  backgroundAsset?: Types.ObjectId;
  font?: string;
  backgroundColor?: string;
  textColor?: string;
  primaryColor?: string;
  user: Types.ObjectId;
  spellbook: Types.ObjectId;
  status: 'active' | 'pending' | 'deleted';
  visibility: 'public' | 'private';
  allowedUsers?: Types.ObjectId[];
  meta?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const spellbookPageSchema = new Schema<ISpellbookPage>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    shortDescription: {
      type: String,
      required: false,
      trim: true,
      maxlength: 500,
    },
    richText: {
      type: String,
      required: false,
      maxlength: 50000,
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
    font: {
      type: String,
      required: false,
      trim: true,
      maxlength: 100,
    },
    backgroundColor: {
      type: String,
      required: false,
      trim: true,
      validate: {
        validator: (v: string) => {
          if (!v) return true;
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message:
          'Background color must be a valid hex color (e.g., #FF5733 or #F53)',
      },
    },
    textColor: {
      type: String,
      required: false,
      trim: true,
      validate: {
        validator: (v: string) => {
          if (!v) return true;
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: 'Text color must be a valid hex color (e.g., #FF5733 or #F53)',
      },
    },
    primaryColor: {
      type: String,
      required: false,
      trim: true,
      validate: {
        validator: (v: string) => {
          if (!v) return true;
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message:
          'Primary color must be a valid hex color (e.g., #FF5733 or #F53)',
      },
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    spellbook: {
      type: Schema.Types.ObjectId,
      ref: 'Spellbook',
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['active', 'pending', 'deleted'],
        message: 'Status must be either "active", "pending", or "deleted"',
      },
      default: 'pending',
    },
    visibility: {
      type: String,
      required: true,
      enum: {
        values: ['public', 'private'],
        message: 'Visibility must be either "public" or "private"',
      },
      default: 'private',
    },
    allowedUsers: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
      validate: {
        validator: (v: Types.ObjectId[]) => {
          return v.length <= 100;
        },
        message: 'Allowed users list cannot contain more than 100 users',
      },
    },
    meta: {
      type: [String],
      default: [],
      validate: {
        validator: (v: string[]) => {
          return v.length <= 50;
        },
        message: 'Meta array cannot contain more than 50 items',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
spellbookPageSchema.index({ user: 1 });
spellbookPageSchema.index({ spellbook: 1 });
spellbookPageSchema.index({ status: 1 });
spellbookPageSchema.index({ visibility: 1 });
spellbookPageSchema.index({ createdAt: -1 });
spellbookPageSchema.index({ title: 1 });

// Compound indexes
spellbookPageSchema.index({ user: 1, status: 1 });
spellbookPageSchema.index({ spellbook: 1, status: 1 });
spellbookPageSchema.index({ visibility: 1, status: 1 });

export const SpellbookPage = model<ISpellbookPage>(
  'SpellbookPage',
  spellbookPageSchema
);
