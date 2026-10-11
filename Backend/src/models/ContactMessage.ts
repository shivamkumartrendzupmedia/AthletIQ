import { Schema, model, type Document } from 'mongoose';

export type ContactMessageStatus = 'New' | 'Read' | 'Archived';
export const CONTACT_MESSAGE_STATUSES: readonly ContactMessageStatus[] = [
  'New',
  'Read',
  'Archived',
] as const;

export interface IContactMessage extends Document {
  name: string;
  email: string;
  subject?: string;
  message: string;
  status: ContactMessageStatus;
  createdAt: Date;
}

const contactMessageSchema = new Schema<IContactMessage>(
  {
    name: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
      maxlength: [100, 'Contact name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Contact email is required'],
      trim: true,
      lowercase: true,
      maxlength: [150, 'Contact email cannot exceed 150 characters'],
    },
    subject: {
      type: String,
      trim: true,
      maxlength: [150, 'Subject cannot exceed 150 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: {
        values: CONTACT_MESSAGE_STATUSES,
        message: '{VALUE} is not a valid contact message status',
      },
      default: 'New',
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as { toString(): string }).toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const ContactMessage = model<IContactMessage>(
  'ContactMessage',
  contactMessageSchema
);
