import { Schema, model, type Document, type Types } from 'mongoose';
import {
  ATHLETE_STATUSES,
  VERIFICATION_STATUSES,
  PROFILE_VISIBILITY,
  GENDER_TYPES,
  type AthleteStatus,
  type VerificationStatus,
  type ProfileVisibility,
  type GenderType,
} from './constants.js';

export interface IGuardian {
  name: string;
  phone: string;
  email?: string;
}

export interface IAthlete extends Document {
  user?: Types.ObjectId;
  sport: Types.ObjectId;
  team?: Types.ObjectId;
  dateOfBirth?: Date;
  age?: number; // Virtual getter
  gender?: GenderType;
  position?: string;
  jerseyNumber?: number;
  heightCm?: number;
  weightKg?: number;
  status: AthleteStatus;
  verificationStatus: VerificationStatus;
  medicalClearance: boolean;
  guardian?: IGuardian;
  medicalNotes?: string;
  profileVisibility: ProfileVisibility;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const guardianSchema = new Schema<IGuardian>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
  },
  { _id: false }
);

const athleteSchema = new Schema<IAthlete>(
  {
    // Optional link to User account: an administrator can roster an athlete before they create an account.
    // Uniqueness is enforced via partialFilterExpression below to prevent collisions on null/undefined.
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    sport: {
      type: Schema.Types.ObjectId,
      ref: 'Sport',
      required: [true, 'Sport reference is required'],
      index: true,
    },
    team: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      index: true,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: {
        values: GENDER_TYPES,
        message: '{VALUE} is not a valid gender',
      },
    },
    position: {
      type: String,
      trim: true,
      maxlength: [50, 'Position cannot exceed 50 characters'],
    },
    jerseyNumber: {
      type: Number,
      min: [0, 'Jersey number cannot be negative'],
      max: [99, 'Jersey number cannot exceed 99'],
    },
    heightCm: {
      type: Number,
      min: [50, 'Height must be realistic'],
      max: [260, 'Height must be realistic'],
    },
    weightKg: {
      type: Number,
      min: [20, 'Weight must be realistic'],
      max: [200, 'Weight must be realistic'],
    },
    status: {
      type: String,
      enum: {
        values: ATHLETE_STATUSES,
        message: '{VALUE} is not a valid athlete status',
      },
      default: 'Active',
      required: true,
    },
    verificationStatus: {
      type: String,
      enum: {
        values: VERIFICATION_STATUSES,
        message: '{VALUE} is not a valid verification status',
      },
      default: 'Pending ID',
      required: true,
    },
    medicalClearance: {
      type: Boolean,
      default: false,
    },
    guardian: {
      type: guardianSchema,
    },
    medicalNotes: {
      type: String,
      select: false,
      trim: true,
    },
    profileVisibility: {
      type: String,
      enum: {
        values: PROFILE_VISIBILITY,
        message: '{VALUE} is not a valid profile visibility',
      },
      default: 'AcademyOnly',
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        const docWithSelect = doc as unknown as { isSelected?: (field: string) => boolean };
        if (typeof docWithSelect.isSelected === 'function' && !docWithSelect.isSelected('medicalNotes')) {
          delete ret.medicalNotes;
        }
        return ret;
      },
    },
  }
);

// Virtual getter calculating age dynamically in full years from dateOfBirth
athleteSchema.virtual('age').get(function (this: IAthlete) {
  if (!this.dateOfBirth) return undefined;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let computedAge = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    computedAge--;
  }
  return computedAge;
});

// Index 1: Unique User Account constraint applied ONLY when user ObjectId exists.
// This allows multiple athletes to exist without an account without colliding on null.
athleteSchema.index(
  { user: 1 },
  {
    unique: true,
    partialFilterExpression: { user: { $type: 'objectId' } },
  }
);

// Index 2: Compound Unique Index on (team, jerseyNumber) applied ONLY when both fields are assigned.
// Uses partialFilterExpression instead of sparse so unassigned athletes or athletes without kit numbers do not collide.
athleteSchema.index(
  { team: 1, jerseyNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      team: { $type: 'objectId' },
      jerseyNumber: { $type: 'number' },
    },
  }
);

export const Athlete = model<IAthlete>('Athlete', athleteSchema);
