import { Schema, model, type Document, type Types } from 'mongoose';

export interface IConversationMessage {
  role: 'user' | 'assistant';
  text: string;
  at: Date;
}

export interface IConversation extends Document {
  user: Types.ObjectId;
  messages: IConversationMessage[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const conversationMessageSchema = new Schema<IConversationMessage>(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    text: {
      type: String,
      required: true,
      maxlength: 2000,
      trim: true,
    },
    at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const conversationSchema = new Schema<IConversation>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required for conversation'],
      unique: true,
      index: true,
    },
    messages: {
      type: [conversationMessageSchema],
      default: [],
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
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

// TTL index for automatic expiration
conversationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Conversation = model<IConversation>('Conversation', conversationSchema);
