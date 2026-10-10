import { Schema, model, type Document, type Types } from 'mongoose';
import {
  COACH_FEEDBACK_TYPES,
  type CoachFeedbackType,
} from './constants.js';

export interface ICoachFeedback extends Document {
  athlete: Types.ObjectId;
  coach: Types.ObjectId;
  text: string;
  type: CoachFeedbackType;
  acknowledgedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const coachFeedbackSchema = new Schema<ICoachFeedback>(
  {
    athlete: {
      type: Schema.Types.ObjectId,
      ref: 'Athlete',
      required: [true, 'Athlete reference is required'],
      index: true,
    },
    coach: {
      type: Schema.Types.ObjectId,
      ref: 'Coach',
      required: [true, 'Coach profile reference is required'],
      index: true,
    },
    text: {
      type: String,
      required: [true, 'Feedback text is required'],
      trim: true,
      maxlength: [2000, 'Feedback cannot exceed 2000 characters'],
    },
    type: {
      type: String,
      enum: {
        values: COACH_FEEDBACK_TYPES,
        message: '{VALUE} is not a valid feedback type',
      },
      default: 'General',
      required: true,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index for timeline queries
coachFeedbackSchema.index({ athlete: 1, createdAt: -1 });

export const CoachFeedback = model<ICoachFeedback>(
  'CoachFeedback',
  coachFeedbackSchema
);
