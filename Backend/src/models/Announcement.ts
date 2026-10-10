import { Schema, model, type Document, type Types } from 'mongoose';
import {
  ANNOUNCEMENT_AUDIENCES,
  type AnnouncementAudience,
} from './constants.js';

export type { AnnouncementAudience, AnnouncementAudience as IAnnouncementAudience } from './constants.js';

export interface IAnnouncement extends Document {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  team?: Types.ObjectId | null;
  pinned: boolean;
  publishedAt: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<IAnnouncement>(
  {
    title: {
      type: String,
      required: [true, 'Announcement title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    body: {
      type: String,
      required: [true, 'Announcement body content is required'],
      trim: true,
    },
    audience: {
      type: String,
      enum: {
        values: ANNOUNCEMENT_AUDIENCES,
        message: '{VALUE} is not a valid audience',
      },
      required: [true, 'Audience is required'],
      index: true,
    },
    team: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
      index: true,
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'CreatedBy user reference is required'],
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

announcementSchema.index({ publishedAt: -1, pinned: -1 });

export const Announcement = model<IAnnouncement>(
  'Announcement',
  announcementSchema
);
