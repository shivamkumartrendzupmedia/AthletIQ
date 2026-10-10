import { Schema, model, type Document, type Types } from 'mongoose';

export interface IVenue extends Document {
  name: string;
  address: string;
  capacity?: number;
  createdBy: Types.ObjectId;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const venueSchema = new Schema<IVenue>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: 250,
    },
    capacity: {
      type: Number,
      min: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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

venueSchema.index({ createdBy: 1, active: 1 });

export const Venue = model<IVenue>('Venue', venueSchema);
