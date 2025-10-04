import { type Document, model, Schema } from 'mongoose';

export interface IClient extends Document {
  clientId: string;
  clientSecret: string;
  name: string;
  description?: string;
  isActive: boolean;
  allowedScopes: string[];
  tokenExpiresIn: number; // in seconds
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new Schema<IClient>(
  {
    clientId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    clientSecret: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    allowedScopes: {
      type: [String],
      default: ['read', 'write'],
    },
    tokenExpiresIn: {
      type: Number,
      default: 3600, // 1 hour
    },
    lastUsed: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster lookups
clientSchema.index({ clientId: 1, isActive: 1 });

export const Client = model<IClient>('Client', clientSchema);
