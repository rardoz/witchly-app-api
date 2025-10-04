import { type Document, model, Schema } from 'mongoose';

export interface IEmailVerification extends Document {
  email: string;
  code: string; // Hashed 6-digit code
  expiresAt: Date;
  attempts: number; // Rate limiting - max 3 attempts
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const emailVerificationSchema = new Schema<IEmailVerification>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
      max: 3,
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
emailVerificationSchema.index({ email: 1, createdAt: -1 });
emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete when expired

// Prevent multiple active codes per email
emailVerificationSchema.index(
  { email: 1, verified: 1 },
  {
    unique: true,
    partialFilterExpression: { verified: false },
  }
);

export const EmailVerification = model<IEmailVerification>(
  'EmailVerification',
  emailVerificationSchema
);
