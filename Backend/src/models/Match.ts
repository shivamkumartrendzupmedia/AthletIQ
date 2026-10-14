import { Schema, model, type Document, type Types } from 'mongoose';
import { MATCH_STATUSES, type MatchStatus } from './constants.js';

export interface IMatchResult {
  homeScore: number;
  awayScore: number;
  enteredBy: Types.ObjectId;
  enteredAt: Date;
}

export interface ILiveScore {
  home: number;
  away: number;
}

export interface IMatch extends Document {
  tournament: Types.ObjectId;
  homeTeam: Types.ObjectId;
  awayTeam: Types.ObjectId;
  round: string;
  group?: string;
  scheduledAt: Date;
  durationMinutes: number;
  endsAt: Date;
  venue: Types.ObjectId;
  status: MatchStatus;
  startedAt?: Date | null;
  halfTimeAt?: Date | null;
  secondHalfAt?: Date | null;
  completedAt?: Date | null;
  liveScore?: ILiveScore;
  result?: IMatchResult | null;
  createdAt: Date;
  updatedAt: Date;
}

const matchResultSchema = new Schema<IMatchResult>(
  {
    homeScore: {
      type: Number,
      required: true,
      min: 0,
      max: 99,
    },
    awayScore: {
      type: Number,
      required: true,
      min: 0,
      max: 99,
    },
    enteredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    enteredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const matchSchema = new Schema<IMatch>(
  {
    tournament: {
      type: Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
    },
    homeTeam: {
      type: Schema.Types.ObjectId,
      ref: 'TournamentTeam',
      required: true,
    },
    awayTeam: {
      type: Schema.Types.ObjectId,
      ref: 'TournamentTeam',
      required: true,
    },
    round: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    group: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    durationMinutes: {
      type: Number,
      default: 90,
      min: 30,
      max: 240,
    },
    endsAt: {
      type: Date,
      required: true,
    },
    venue: {
      type: Schema.Types.ObjectId,
      ref: 'Venue',
      required: true,
    },
    status: {
      type: String,
      enum: MATCH_STATUSES,
      default: 'Scheduled',
    },
    startedAt: {
      type: Date,
      default: null,
    },
    halfTimeAt: {
      type: Date,
      default: null,
    },
    secondHalfAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    liveScore: {
      home: {
        type: Number,
        default: 0,
        min: 0,
      },
      away: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    result: {
      type: matchResultSchema,
      default: null,
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

matchSchema.index({ tournament: 1, scheduledAt: 1 });
matchSchema.index({ venue: 1, scheduledAt: 1, endsAt: 1 });
matchSchema.index({ homeTeam: 1, scheduledAt: 1, endsAt: 1 });
matchSchema.index({ awayTeam: 1, scheduledAt: 1, endsAt: 1 });

export const Match = model<IMatch>('Match', matchSchema);
