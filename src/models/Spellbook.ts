import { type Document, model, Schema, Types } from 'mongoose';

export interface ISpellbook extends Document {
  title: string;
  description?: string;
  primaryAsset?: Types.ObjectId;
  backgroundAsset?: Types.ObjectId;
  font?: string;
  primaryColor?: string;
  textColor?: string;
  user: Types.ObjectId;
  pages: Types.ObjectId[];
  status: 'active' | 'pending' | 'deleted';
  visibility: 'public' | 'private';
  allowedUsers?: Types.ObjectId[];
  meta?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const spellbookSchema = new Schema<ISpellbook>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: false,
      trim: true,
      maxlength: 2000,
    },
    primaryAsset: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: false,
    },
    backgroundAsset: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: false,
    },
    font: {
      type: String,
      required: false,
      trim: true,
      maxlength: 100,
    },
    primaryColor: {
      type: String,
      required: false,
      trim: true,
      validate: {
        validator: (v: string) => {
          if (!v) return true;
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message:
          'Primary color must be a valid hex color (e.g., #FF5733 or #F53)',
      },
    },
    textColor: {
      type: String,
      required: false,
      trim: true,
      validate: {
        validator: (v: string) => {
          if (!v) return true;
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: 'Text color must be a valid hex color (e.g., #FF5733 or #F53)',
      },
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    pages: {
      type: [Schema.Types.ObjectId],
      ref: 'SpellbookPage',
      default: [],
      validate: {
        validator: (v: Types.ObjectId[]) => {
          return v.length <= 500;
        },
        message: 'Spellbook cannot contain more than 500 pages',
      },
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['active', 'pending', 'deleted'],
        message: 'Status must be either "active", "pending", or "deleted"',
      },
      default: 'pending',
    },
    visibility: {
      type: String,
      required: true,
      enum: {
        values: ['public', 'private'],
        message: 'Visibility must be either "public" or "private"',
      },
      default: 'private',
    },
    allowedUsers: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
      validate: {
        validator: (v: Types.ObjectId[]) => {
          return v.length <= 100;
        },
        message: 'Allowed users list cannot contain more than 100 users',
      },
    },
    meta: {
      type: [String],
      default: [],
      validate: {
        validator: (v: string[]) => {
          return v.length <= 50;
        },
        message: 'Meta array cannot contain more than 50 items',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
spellbookSchema.index({ user: 1 });
spellbookSchema.index({ status: 1 });
spellbookSchema.index({ visibility: 1 });
spellbookSchema.index({ createdAt: -1 });
spellbookSchema.index({ title: 1 });

// Compound indexes
spellbookSchema.index({ user: 1, status: 1 });
spellbookSchema.index({ visibility: 1, status: 1 });

// Cascade delete all spellbook pages when spellbook is deleted
spellbookSchema.pre(
  'deleteOne',
  { document: true, query: false },
  async function () {
    const SpellbookPage = model('SpellbookPage');
    await SpellbookPage.deleteMany({ spellbook: this._id });
  }
);

spellbookSchema.pre('findOneAndDelete', async function () {
  const doc = await this.model.findOne(this.getFilter());
  if (doc) {
    const SpellbookPage = model('SpellbookPage');
    await SpellbookPage.deleteMany({ spellbook: doc._id });
  }
});

export const Spellbook = model<ISpellbook>('Spellbook', spellbookSchema);
