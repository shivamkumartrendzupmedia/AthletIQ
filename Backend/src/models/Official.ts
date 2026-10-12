import { Schema, model, type Document, type Types } from 'mongoose';
import { OFFICIAL_TYPES, type OfficialType } from './constants.js';

export interface IOfficial extends Document {
  name: string;
  type: OfficialType;
  createdBy: Types.ObjectId;
  user?: Types.ObjectId | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const officialSchema = new Schema<IOfficial>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    type: {
      type: String,
      enum: OFFICIAL_TYPES,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

officialSchema.index({ createdBy: 1, type: 1 });
officialSchema.index({ user: 1 }, { unique: true, sparse: true });

export const Official = model<IOfficial>('Official', officialSchema);
