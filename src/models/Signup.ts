import { type Document, model, Schema } from 'mongoose';

export interface ISignup extends Document {
  email: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const signupSchema = new Schema<ISignup>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true, // Only one pending signup per email
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance and constraints
signupSchema.index({ email: 1, createdAt: -1 });
signupSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete when expired

export const Signup = model<ISignup>('Signup', signupSchema);
