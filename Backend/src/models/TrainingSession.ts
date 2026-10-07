import { Schema, model, type Document, type Types } from 'mongoose';
import {
  SESSION_TYPES,
  SESSION_STATUSES,
  type SessionType,
  type SessionStatus,
} from './constants.js';

export interface ITrainingSession extends Document {
  title: string;
  type: SessionType;
  team: Types.ObjectId;
  sport: Types.ObjectId;
  coach: Types.ObjectId;
  startsAt: Date;
  endsAt: Date;
  venue: string;
  notes?: string;
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;
}

const trainingSessionSchema = new Schema<ITrainingSession>(
  {
    title: {
      type: String,
      required: [true, 'Session title is required'],
      trim: true,
      maxlength: [150, 'Session title cannot exceed 150 characters'],
    },
    type: {
      type: String,
      enum: {
        values: SESSION_TYPES,
        message: '{VALUE} is not a valid session type',
      },
      default: 'Training',
      required: true,
    },
    team: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Team reference is required'],
      index: true,
    },
    sport: {
      type: Schema.Types.ObjectId,
      ref: 'Sport',
      required: [true, 'Sport reference is required'],
      index: true,
    },
    coach: {
      type: Schema.Types.ObjectId,
      ref: 'Coach',
      required: [true, 'Coach reference is required'],
      index: true,
    },
    startsAt: {
      type: Date,
      required: [true, 'Start date and time is required'],
    },
    endsAt: {
      type: Date,
      required: [true, 'End date and time is required'],
      validate: {
        validator: function (this: ITrainingSession, value: Date): boolean {
          if (!this.startsAt || !value) return true;
          return value > this.startsAt;
        },
        message: 'Session end time must be strictly after start time',
      },
    },
    venue: {
      type: String,
      required: [true, 'Session venue/location is required'],
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: SESSION_STATUSES,
        message: '{VALUE} is not a valid session status',
      },
      default: 'Scheduled',
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

// Compound index for schedule queries and team timetable lookups
trainingSessionSchema.index({ team: 1, startsAt: 1 });

export const TrainingSession = model<ITrainingSession>(
  'TrainingSession',
  trainingSessionSchema
);
