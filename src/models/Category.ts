import { type Document, model, Schema, Types } from 'mongoose';

export interface ICategory extends Document {
  entityId: Types.ObjectId;
  entityType: string;
  locale: string;
  categoryName: string;
  categoryShortDescription?: string;
  primaryAsset?: Types.ObjectId;
  heroAsset?: Types.ObjectId;
  secondaryAsset?: Types.ObjectId;
  primaryColor?: string;
  textColor?: string;
  backgroundColor?: string;
  priority: number;
  status: string;
  user: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    entityId: {
      type: Schema.Types.ObjectId,
      required: false,
    },
    entityType: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    locale: {
      type: String,
      required: true,
      default: 'en-US',
      lowercase: true,
      trim: true,
      index: true,
    },
    categoryName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    categoryShortDescription: {
      type: String,
      required: false,
      trim: true,
      maxlength: 500,
    },
    primaryAsset: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: false,
    },
    heroAsset: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: false,
    },
    secondaryAsset: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: false,
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
    priority: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
      index: true,
    },
    status: {
      type: String,
      required: true,
      default: 'active',
      enum: ['active', 'paused', 'deleted'],
      lowercase: true,
      trim: true,
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
categorySchema.index({ entityId: 1, entityType: 1 });
categorySchema.index({ locale: 1, priority: 1 });
categorySchema.index({ status: 1, priority: 1 });
categorySchema.index({ createdAt: -1 });

export const Category = model<ICategory>('Category', categorySchema);
