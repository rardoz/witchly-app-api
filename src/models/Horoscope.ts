import { type Document, model, Schema, Types } from 'mongoose';

export interface IHoroscope extends Document {
  locale: string;
  horoscopeDate: Date;
  horoscopeText: string;
  sign: string;
  status: 'sent' | 'pending';
  user: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const horoscopeSchema = new Schema<IHoroscope>(
  {
    locale: { type: String, required: true, trim: true },
    horoscopeDate: { type: Date, required: true },
    horoscopeText: { type: String, required: true, trim: true },
    sign: { type: String, required: true, trim: true },
    status: {
      type: String,
      required: true,
      enum: ['sent', 'pending'],
      default: 'pending',
    },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
  }
);

horoscopeSchema.index({ sign: 1, horoscopeDate: -1 });
horoscopeSchema.index({ status: 1 });
horoscopeSchema.index({ user: 1 });

export const Horoscope = model<IHoroscope>('Horoscope', horoscopeSchema);
