import { Schema, model, type Document, type Types } from 'mongoose';
import {
  TOURNAMENT_TEAM_STATUSES,
  type TournamentTeamStatus,
} from './constants.js';

export interface ITournamentTeam extends Document {
  tournament: Types.ObjectId;
  team: Types.ObjectId;
  status: TournamentTeamStatus;
  reason?: string;
  squad: Types.ObjectId[];
  registeredBy: Types.ObjectId;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const tournamentTeamSchema = new Schema<ITournamentTeam>(
  {
    tournament: {
      type: Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
    },
    team: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    status: {
      type: String,
      enum: TOURNAMENT_TEAM_STATUSES,
      default: 'Pending',
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    squad: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Athlete' }],
      default: [],
      validate: {
        validator(val: Types.ObjectId[]) {
          return val.length <= 30;
        },
        message: 'Squad cannot exceed 30 athletes',
      },
    },
    registeredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
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

tournamentTeamSchema.index({ tournament: 1, team: 1 }, { unique: true });
tournamentTeamSchema.index({ tournament: 1, status: 1 });

export const TournamentTeam = model<ITournamentTeam>('TournamentTeam', tournamentTeamSchema);
