import { Schema, model, type Document, type Types } from 'mongoose';
import {
  MATCH_EVENT_TYPES,
  MATCH_EVENT_SIDES,
  type MatchEventType,
  type MatchEventSide,
} from './constants.js';

export interface IMatchEvent extends Document {
  match: Types.ObjectId;
  type: MatchEventType;
  side: MatchEventSide;
  minute: number;
  player?: Types.ObjectId | null;
  relatedPlayer?: Types.ObjectId | null;
  note?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const matchEventSchema = new Schema<IMatchEvent>(
  {
    match: {
      type: Schema.Types.ObjectId,
      ref: 'Match',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: MATCH_EVENT_TYPES,
      required: true,
    },
    side: {
      type: String,
      enum: MATCH_EVENT_SIDES,
      required: true,
    },
    minute: {
      type: Number,
      required: true,
      min: 0,
      max: 130,
    },
    player: {
      type: Schema.Types.ObjectId,
      ref: 'Athlete',
      default: null,
    },
    relatedPlayer: {
      type: Schema.Types.ObjectId,
      ref: 'Athlete',
      default: null,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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

matchEventSchema.index({ match: 1, minute: 1 });
matchEventSchema.index({ player: 1 });

export const MatchEvent = model<IMatchEvent>('MatchEvent', matchEventSchema);
