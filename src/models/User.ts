import { type Document, model, Schema } from 'mongoose';
import {
  createProfileFieldsSchema,
  IProfileFields,
} from '../shared/profile.schema';

export interface IUser extends Document, IProfileFields {
  email: string;
  userType: string;
  emailVerified: boolean;
  handle: string; // Made required for signup flow
  lastLoginAt?: Date; // Track last login time
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    // Profile fields from shared schema
    ...createProfileFieldsSchema(),

    // User-specific fields
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    userType: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      default: 'basic', // Default for signup flow
    },
    emailVerified: {
      type: Boolean,
      required: true,
      default: false,
    },
    handle: {
      type: String,
      required: true, // Made required for signup flow
      unique: true,
      trim: true,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance (email and handle already indexed via unique: true)
userSchema.index({ userType: 1 });
userSchema.index({ emailVerified: 1 });

export const User = model<IUser>('User', userSchema);
