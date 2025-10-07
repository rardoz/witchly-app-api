import { type Document, model, Schema } from 'mongoose';
import {
  createProfileFieldsSchema,
  IProfileFields,
} from '../shared/profile.schema';

export interface IUser extends Document, IProfileFields {
  email: string;
  allowedScopes: string[]; // Changed from userType to allowedScopes array
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
    allowedScopes: {
      type: [String],
      required: true,
      default: ['read', 'write', 'basic'], // Default scopes for basic users
      validate: {
        validator: (scopes: string[]) => {
          // Import here to avoid circular dependency
          const { validateUserScopes } = require('../utils/user-scopes');
          try {
            validateUserScopes(scopes);
            return true;
          } catch {
            return false;
          }
        },
        message: 'Invalid user scopes provided',
      },
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
userSchema.index({ allowedScopes: 1 });
userSchema.index({ emailVerified: 1 });

export const User = model<IUser>('User', userSchema);
