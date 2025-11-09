import { type Document, model, Schema, Types } from 'mongoose';

export interface ICovenRoster extends Document {
  coven: Types.ObjectId;
  user: Types.ObjectId;
  userTitle?: string;
  userRole: 'owner' | 'co-owner' | 'editor' | 'basic' | 'pending';
  avatarAsset?: Types.ObjectId;
  userCovenName?: string;
  userCovenBio?: string;
  lastActive?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const covenRosterSchema = new Schema<ICovenRoster>(
  {
    coven: {
      type: Schema.Types.ObjectId,
      ref: 'Coven',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userTitle: {
      type: String,
      required: false,
      trim: true,
      maxlength: 200,
    },
    userRole: {
      type: String,
      required: true,
      enum: ['owner', 'co-owner', 'editor', 'basic', 'pending'],
      default: 'basic',
      lowercase: true,
    },
    avatarAsset: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: false,
    },
    userCovenName: {
      type: String,
      required: false,
      trim: true,
      maxlength: 200,
    },
    userCovenBio: {
      type: String,
      required: false,
      trim: true,
      maxlength: 1000,
    },
    lastActive: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure unique coven-user pairs
covenRosterSchema.index({ coven: 1, user: 1 }, { unique: true });
covenRosterSchema.index({ lastActive: -1 });

export const CovenRoster = model<ICovenRoster>(
  'CovenRoster',
  covenRosterSchema
);
