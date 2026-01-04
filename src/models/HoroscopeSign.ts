import { type Document, model, Schema, Types } from 'mongoose';

export interface IHoroscopeSign extends Document {
  sign: string;
  signLocal: string;
  locale: string;
  status?: 'active' | 'paused' | 'deleted';
  description?: string;
  signDateStart?: number;
  signDateEnd?: number;
  asset?: Types.ObjectId;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
}

const horoscopeSignSchema = new Schema<IHoroscopeSign>(
  {
    sign: { type: String, required: true, trim: true },
    signLocal: { type: String, required: true, trim: true },
    locale: { type: String, required: true, trim: true },
    description: { type: String },
    signDateStart: { type: Number },
    signDateEnd: { type: Number },
    asset: { type: Schema.Types.ObjectId, ref: 'Asset' },
    title: { type: String },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['active', 'paused', 'deleted'],
        message: 'Status must be either "active", "paused", or "deleted"',
      },
      default: 'active',
    },
  },
  { timestamps: true }
);

horoscopeSignSchema.index({ sign: 1, locale: 1 }, { unique: true });
horoscopeSignSchema.index({ status: 1 });

export const HoroscopeSign = model<IHoroscopeSign>(
  'HoroscopeSign',
  horoscopeSignSchema
);
