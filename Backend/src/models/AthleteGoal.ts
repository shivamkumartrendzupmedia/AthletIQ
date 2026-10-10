import { Schema, model, type Document, type Types } from 'mongoose';
import {
  ATHLETE_GOAL_STATUSES,
  type AthleteGoalStatus,
} from './constants.js';

export interface IAthleteGoal extends Document {
  athlete: Types.ObjectId;
  title: string;
  description?: string;
  targetDate: Date;
  status: AthleteGoalStatus;
  progress: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const athleteGoalSchema = new Schema<IAthleteGoal>(
  {
    athlete: {
      type: Schema.Types.ObjectId,
      ref: 'Athlete',
      required: [true, 'Athlete reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true,
      maxlength: [150, 'Goal title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Goal description cannot exceed 1000 characters'],
    },
    targetDate: {
      type: Date,
      required: [true, 'Target completion date is required'],
    },
    status: {
      type: String,
      enum: {
        values: ATHLETE_GOAL_STATUSES,
        message: '{VALUE} is not a valid goal status',
      },
      default: 'Active',
      required: true,
      index: true,
    },
    progress: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Progress cannot be negative'],
      max: [100, 'Progress cannot exceed 100'],
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
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index for athlete goals filtering
athleteGoalSchema.index({ athlete: 1, status: 1, targetDate: 1 });

export const AthleteGoal = model<IAthleteGoal>(
  'AthleteGoal',
  athleteGoalSchema
);
