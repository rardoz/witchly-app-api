import { type Document, model, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  userType: string;
  profileImageUrl?: string;
  bio?: string;
  shortBio?: string;
  handle?: string;
  backdropImageUrl?: string;
  instagramHandle?: string;
  tikTokHandle?: string;
  twitterHandle?: string;
  websiteUrl?: string;
  facebookUrl?: string;
  snapchatHandle?: string;
  primaryColor?: string;
  sign?: string;
  sex?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
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
    },
    profileImageUrl: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
    },
    shortBio: {
      type: String,
      trim: true,
    },
    handle: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    backdropImageUrl: {
      type: String,
      trim: true,
    },
    instagramHandle: {
      type: String,
      trim: true,
    },
    tikTokHandle: {
      type: String,
      trim: true,
    },
    twitterHandle: {
      type: String,
      trim: true,
    },
    websiteUrl: {
      type: String,
      trim: true,
    },
    facebookUrl: {
      type: String,
      trim: true,
    },
    snapchatHandle: {
      type: String,
      trim: true,
    },
    primaryColor: {
      type: String,
      trim: true,
    },
    sign: {
      type: String,
      trim: true,
    },
    sex: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const User = model<IUser>('User', userSchema);
