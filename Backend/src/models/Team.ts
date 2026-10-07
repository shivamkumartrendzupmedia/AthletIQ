import { Schema, model, type Document, type Types } from 'mongoose';
import { TEAM_STATUSES, type TeamStatus } from './constants.js';

export interface ITeam extends Document {
  name: string;
  slug: string;
  sport: Types.ObjectId;
  ageGroup: string;
  coach?: Types.ObjectId;
  season?: string;
  logo?: string;
  status: TeamStatus;
  createdAt: Date;
  updatedAt: Date;
}

const teamSchema = new Schema<ITeam>(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      maxlength: [100, 'Team name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Team slug is required'],
      unique: true, // Field-level unique index
      lowercase: true,
      trim: true,
      match: [
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Slug must be URL-safe alphanumeric kebab-case',
      ],
    },
    sport: {
      type: Schema.Types.ObjectId,
      ref: 'Sport',
      required: [true, 'Sport reference is required'],
      index: true,
    },
    ageGroup: {
      type: String,
      required: [true, 'Age group is required'],
      trim: true,
    },
    coach: {
      type: Schema.Types.ObjectId,
      ref: 'Coach',
    },
    season: {
      type: String,
      trim: true,
      default: () => new Date().getFullYear().toString(),
    },
    logo: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: TEAM_STATUSES,
        message: '{VALUE} is not a valid team status',
      },
      default: 'Active',
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

export const Team = model<ITeam>('Team', teamSchema);
