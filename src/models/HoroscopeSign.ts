import { type Document, model, Schema, Types } from 'mongoose';

export interface IHoroscopeSign extends Document {
  sign: string;
  locale: string;
  description?: string;
  signDateStart?: Date;
  signDateEnd?: Date;
  asset?: Types.ObjectId;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
}

const horoscopeSignSchema = new Schema<IHoroscopeSign>(
  {
    sign: { type: String, required: true, trim: true },
    locale: { type: String, required: true, trim: true },
    description: { type: String },
    signDateStart: { type: Date },
    signDateEnd: { type: Date },
    asset: { type: Schema.Types.ObjectId, ref: 'Asset' },
    title: { type: String },
  },
  { timestamps: true }
);

horoscopeSignSchema.index({ sign: 1, locale: 1 }, { unique: true });

export const HoroscopeSign = model<IHoroscopeSign>(
  'HoroscopeSign',
  horoscopeSignSchema
);
