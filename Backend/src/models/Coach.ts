import { Schema, model, type Document, type Types } from 'mongoose';

export interface ICoachCertification {
  name: string;
  issuer?: string;
  year?: number;
}

export interface ICoach extends Document {
  user: Types.ObjectId;
  title?: string;
  bio?: string;
  specialization?: string;
  specialties: string[];
  sports: Types.ObjectId[];
  certifications: ICoachCertification[];
  experienceYears: number;
  achievements: string[];
  photo?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const coachCertificationSchema = new Schema<ICoachCertification>(
  {
    name: { type: String, required: true, trim: true },
    issuer: { type: String, trim: true },
    year: { type: Number },
  },
  { _id: false }
);

const coachSchema = new Schema<ICoach>(
  {
    // Coach profile is strictly tied to an authenticated User account (1-to-1 required mapping)
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Coach must be linked to an existing User account'],
      unique: true, // Field-level unique index ensures exactly one coach profile per user
    },
    title: {
      type: String,
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    bio: {
      type: String,
      trim: true,
    },
    specialization: {
      type: String,
      trim: true,
    },
    specialties: {
      type: [String],
      default: [],
    },
    sports: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Sport',
      },
    ],
    certifications: {
      type: [coachCertificationSchema],
      default: [],
    },
    experienceYears: {
      type: Number,
      min: [0, 'Experience years cannot be negative'],
      default: 0,
    },
    achievements: {
      type: [String],
      default: [],
    },
    photo: {
      type: String,
      trim: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
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

export const Coach = model<ICoach>('Coach', coachSchema);
