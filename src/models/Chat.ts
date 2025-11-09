import { type Document, model, Schema, Types } from 'mongoose';

export interface IEmojiReaction {
  [emojiCode: string]: string[]; // emoji code -> array of user IDs
}

export interface IChat extends Document {
  user: Types.ObjectId;
  message: string;
  asset?: Types.ObjectId;
  entityId: Types.ObjectId;
  entityType: string;
  likes: Types.ObjectId[];
  emojis: IEmojiReaction;
  locale: string;
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema = new Schema<IChat>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    asset: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: false,
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
    likes: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    emojis: {
      type: Schema.Types.Mixed,
      default: {},
    },
    locale: {
      type: String,
      required: true,
      trim: true,
      default: 'en-US',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient querying
chatSchema.index({ entityId: 1, entityType: 1, createdAt: -1 });
chatSchema.index({ user: 1, createdAt: -1 });

export const Chat = model<IChat>('Chat', chatSchema);
