import { type Document, model, Schema, Types } from 'mongoose';

export interface IEvent extends Document {
  startDateTime: Date;
  startTimezone: string;
  endDateTime: Date;
  endTimezone: string;
  user: Types.ObjectId;
  entityId: Types.ObjectId;
  entityType: string;
  rsvpUsers: Types.ObjectId[];
  interestedUsers: Types.ObjectId[];
  name: string;
  description?: string;
  shortDescription?: string;
  heroAsset?: Types.ObjectId;
  backgroundAsset?: Types.ObjectId;
  primaryAsset?: Types.ObjectId;
  primaryColor?: string;
  webUrl?: string;
  webUrlLabel?: string;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    startDateTime: {
      type: Date,
      required: true,
      index: true,
    },
    startTimezone: {
      type: String,
      required: true,
      trim: true,
      default: 'UTC',
    },
    endDateTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTimezone: {
      type: String,
      required: true,
      trim: true,
      default: 'UTC',
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    rsvpUsers: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    interestedUsers: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
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
    heroAsset: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: false,
    },
    backgroundAsset: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: false,
    },
    primaryAsset: {
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

// Compound indexes for efficient querying
eventSchema.index({ entityId: 1, entityType: 1, startDateTime: 1 });
eventSchema.index({ user: 1, startDateTime: 1 });
eventSchema.index({ startDateTime: 1, endDateTime: 1 });

export const Event = model<IEvent>('Event', eventSchema);
