import { type Document, model, Schema } from 'mongoose';

export interface IUserSession extends Document {
  userId: string; // Reference to User._id
  sessionToken: string; // Unique session identifier
  refreshToken?: string; // Optional refresh token for extended sessions
  keepMeLoggedIn: boolean; // Whether user selected "keep me logged in"
  expiresAt: Date; // Session expiration time
  lastUsedAt: Date; // Last time session was used (for activity tracking)
  userAgent?: string; // Browser/device info for security
  ipAddress?: string; // IP address for security
  isActive: boolean; // Whether session is still valid
  createdAt: Date;
  updatedAt: Date;
}

const userSessionSchema = new Schema<IUserSession>(
  {
    userId: {
      type: String,
      required: true,
      ref: 'User',
    },
    sessionToken: {
      type: String,
      unique: true,
      required: true,
    },
    refreshToken: {
      type: String,
      unique: true,
      sparse: true, // Allow null values
    },
    keepMeLoggedIn: {
      type: Boolean,
      required: true,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0,
    },
    lastUsedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance and security
userSessionSchema.index({ userId: 1, isActive: 1 });
userSessionSchema.index({ lastUsedAt: 1 }); // For activity tracking

export const UserSession = model<IUserSession>(
  'UserSession',
  userSessionSchema
);
