import { Schema, model, type Document, type Types } from 'mongoose';
import { ACHIEVEMENT_CATEGORIES, type AchievementCategory } from './constants.js';

export interface IAchievement extends Document {
  title: string;
  description: string;
  category: AchievementCategory;
  achievedOn: Date;
  imageUrl?: string;
  featured: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const achievementSchema = new Schema<IAchievement>(
  {
    title: {
      type: String,
      required: [true, 'Achievement title is required'],
      trim: true,
      minlength: [1, 'Title must be at least 1 character long'],
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      required: [true, 'Achievement description is required'],
      trim: true,
      minlength: [1, 'Description must be at least 1 character long'],
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ACHIEVEMENT_CATEGORIES,
        message: '{VALUE} is not a supported achievement category',
      },
    },
    achievedOn: {
      type: Date,
      required: [true, 'Achieved on date is required'],
      validate: {
        validator: function (val: Date) {
          return val.getTime() <= Date.now() + 60000; // allow 1 min tolerance for clock skew
        },
        message: 'Achieved on date cannot be in the future',
      },
    },
    imageUrl: {
      type: String,
      trim: true,
      maxlength: [500, 'Image URL cannot exceed 500 characters'],
      validate: {
        validator: function (val: string) {
          if (!val) return true;
          return /^https:\/\/.+/i.test(val);
        },
        message: 'Image URL must use secure https protocol',
      },
    },
    featured: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user is required'],
      index: true,
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

achievementSchema.index({ achievedOn: -1 });

export const Achievement = model<IAchievement>('Achievement', achievementSchema);
