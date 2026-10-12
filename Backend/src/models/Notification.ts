import mongoose, { Document, Schema, Types } from 'mongoose';
import { NOTIFICATION_TYPES, type NotificationType } from './constants.js';

export interface INotification extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification recipient user is required'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: NOTIFICATION_TYPES,
        message: '{VALUE} is not a valid notification type',
      },
      required: [true, 'Notification type is required'],
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [120, 'Notification title cannot exceed 120 characters'],
    },
    body: {
      type: String,
      required: [true, 'Notification body is required'],
      trim: true,
      maxlength: [300, 'Notification body cannot exceed 300 characters'],
    },
    link: {
      type: String,
      required: [true, 'Notification link is required'],
      trim: true,
      validate: {
        validator: function (v: string): boolean {
          return typeof v === 'string' && v.startsWith('/') && !v.startsWith('//');
        },
        message: 'Notification link must start with a single leading slash',
      },
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound indexes for user notification listing, unread filtering, and FIFO prune
NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, readAt: 1 });

export const Notification = mongoose.model<INotification>(
  'Notification',
  NotificationSchema
);
