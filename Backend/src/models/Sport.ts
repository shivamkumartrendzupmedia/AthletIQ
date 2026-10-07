import { Schema, model, type Document } from 'mongoose';
import { SPORT_STATUSES, type SportStatus } from './constants.js';

export interface ISport extends Document {
  name: string;
  slug: string;
  shortDescription?: string;
  description: string;
  icon?: string;
  image?: string;
  ageGroups: string[];
  features: string[];
  status: SportStatus;
  createdAt: Date;
  updatedAt: Date;
}

const sportSchema = new Schema<ISport>(
  {
    name: {
      type: String,
      required: [true, 'Sport name is required'],
      unique: true, // Field-level unique index
      trim: true,
      maxlength: [100, 'Sport name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Sport slug is required'],
      unique: true, // Field-level unique index
      lowercase: true,
      trim: true,
      match: [
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Slug must be URL-safe alphanumeric kebab-case',
      ],
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [250, 'Short description cannot exceed 250 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    icon: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      trim: true,
    },
    ageGroups: {
      type: [String],
      default: [],
    },
    features: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: {
        values: SPORT_STATUSES,
        message: '{VALUE} is not a valid sport status',
      },
      default: 'Active',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Sport = model<ISport>('Sport', sportSchema);
