import { Schema, model, type Document, type Types } from 'mongoose';
import {
  TOURNAMENT_FORMATS,
  TOURNAMENT_STATUSES,
  type TournamentFormat,
  type TournamentStatus,
} from './constants.js';

export interface ITournament extends Document {
  name: string;
  sport: Types.ObjectId;
  category: string;
  ageGroup: string;
  format: TournamentFormat;
  startDate: Date;
  endDate: Date;
  rules?: string;
  maxTeams?: number;
  approvedTeamsCount: number;
  status: TournamentStatus;
  organizer: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const tournamentSchema = new Schema<ITournament>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    sport: {
      type: Schema.Types.ObjectId,
      ref: 'Sport',
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    ageGroup: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    format: {
      type: String,
      enum: TOURNAMENT_FORMATS,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator(this: ITournament, val: Date) {
          if (!this.startDate || !val) return true;
          return val >= this.startDate;
        },
        message: 'endDate must be greater than or equal to startDate',
      },
    },
    rules: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    maxTeams: {
      type: Number,
      min: 2,
      max: 64,
    },
    approvedTeamsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: TOURNAMENT_STATUSES,
      default: 'Draft',
    },
    organizer: {
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

tournamentSchema.index({ sport: 1, status: 1 });
tournamentSchema.index({ organizer: 1 });

export const Tournament = model<ITournament>('Tournament', tournamentSchema);
