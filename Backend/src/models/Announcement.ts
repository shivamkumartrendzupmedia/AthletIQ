import { Schema, model, type Document, type Types } from 'mongoose';
import {
  ROLES,
  ANNOUNCEMENT_PRIORITIES,
  type Role,
  type AnnouncementPriority,
} from './constants.js';

export interface IAnnouncementAudience {
  roles: Role[];
  teams: Types.ObjectId[];
}

export interface IAnnouncement extends Document {
  title: string;
  body: string;
  audience: IAnnouncementAudience;
  priority: AnnouncementPriority;
  pinned: boolean;
  publishAt: Date;
  expiresAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const audienceSchema = new Schema<IAnnouncementAudience>(
  {
    roles: [
      {
        type: String,
        enum: ROLES,
      },
    ],
    teams: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Team',
      },
    ],
  },
  { _id: false }
);

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
      type: audienceSchema,
      default: () => ({ roles: [], teams: [] }),
    },
    priority: {
      type: String,
      enum: {
        values: ANNOUNCEMENT_PRIORITIES,
        message: '{VALUE} is not a valid priority level',
      },
      default: 'Normal',
      required: true,
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    publishAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'CreatedBy user reference is required'],
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

export const Announcement = model<IAnnouncement>(
  'Announcement',
  announcementSchema
);
