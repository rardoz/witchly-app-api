import { type Document, model, Schema, Types } from 'mongoose';

export interface ICoven extends Document {
  locale: string;
  name: string;
  description?: string;
  shortDescription?: string;
  meta?: string[];
  privacy: 'public' | 'private';
  status: 'active' | 'paused' | 'deleted';
  spellbookId?: Types.ObjectId;
  primaryAsset?: Types.ObjectId;
  backgroundAsset?: Types.ObjectId;
  headerAsset?: Types.ObjectId;
  avatarAsset?: Types.ObjectId;
  primaryColor?: string;
  secondaryColor?: string;
  font?: string;
  user: Types.ObjectId;
  tradition?: string;
  structure?: string;
  practice?: string;
  maxMembers?: number;
  rosterId?: Types.ObjectId;
  webUrl?: string;
  webUrlLabel?: string;
  createdAt: Date;
  updatedAt: Date;
}

const covenSchema = new Schema<ICoven>(
  {
    locale: {
      type: String,
      required: true,
      trim: true,
      default: 'en-US',
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
      maxlength: 300,
    },
    meta: {
      type: [String],
      required: false,
      default: [],
    },
    privacy: {
      type: String,
      required: true,
      enum: ['public', 'private'],
      default: 'public',
      lowercase: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['active', 'paused', 'deleted'],
      default: 'active',
      lowercase: true,
    },
    spellbookId: {
      type: Schema.Types.ObjectId,
      ref: 'Spellbook',
      required: false,
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
    headerAsset: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: false,
    },
    avatarAsset: {
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
    secondaryColor: {
      type: String,
      required: false,
      trim: true,
      validate: {
        validator: (v: string) => {
          if (!v) return true;
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message:
          'Secondary color must be a valid hex color (e.g., #FF5733 or #F53)',
      },
    },
    font: {
      type: String,
      required: false,
      trim: true,
      maxlength: 100,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tradition: {
      type: String,
      required: false,
      trim: true,
      maxlength: 200,
    },
    structure: {
      type: String,
      required: false,
      trim: true,
      maxlength: 200,
    },
    practice: {
      type: String,
      required: false,
      trim: true,
      maxlength: 200,
    },
    maxMembers: {
      type: Number,
      required: false,
      min: 1,
      max: 10000,
    },
    rosterId: {
      type: Schema.Types.ObjectId,
      ref: 'CovenRoster',
      required: false,
    },
    webUrl: {
      type: String,
      required: false,
      trim: true,
      maxlength: 500,
    },
    webUrlLabel: {
      type: String,
      required: false,
      trim: true,
      maxlength: 100,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
covenSchema.index({ name: 1 });
covenSchema.index({ user: 1 });
covenSchema.index({ status: 1 });
covenSchema.index({ privacy: 1 });
covenSchema.index({ tradition: 1 });
covenSchema.index({ structure: 1 });
covenSchema.index({ practice: 1 });
covenSchema.index({ createdAt: -1 });

export const Coven = model<ICoven>('Coven', covenSchema);
