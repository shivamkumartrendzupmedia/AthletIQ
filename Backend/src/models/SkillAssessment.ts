import { Schema, model, type Document, type Types } from 'mongoose';

export interface ISkillCategories {
  technical: number;
  physical: number;
  tactical: number;
  mental: number;
}

export interface ISkillAssessment extends Document {
  athlete: Types.ObjectId;
  assessedBy: Types.ObjectId;
  date: Date;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  stamina: number;
  agility: number;
  decisionMaking: number;
  leadership: number;
  workRate: number;
  categories: ISkillCategories;
  overall: number;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const skillCategoriesSchema = new Schema<ISkillCategories>(
  {
    technical: { type: Number, required: true },
    physical: { type: Number, required: true },
    tactical: { type: Number, required: true },
    mental: { type: Number, required: true },
  },
  { _id: false }
);

const skillAssessmentSchema = new Schema<ISkillAssessment>(
  {
    athlete: {
      type: Schema.Types.ObjectId,
      ref: 'Athlete',
      required: [true, 'Athlete reference is required'],
      index: true,
    },
    assessedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'AssessedBy user reference is required'],
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
      required: true,
    },
    pace: { type: Number, required: true, min: 1, max: 10 },
    shooting: { type: Number, required: true, min: 1, max: 10 },
    passing: { type: Number, required: true, min: 1, max: 10 },
    dribbling: { type: Number, required: true, min: 1, max: 10 },
    defending: { type: Number, required: true, min: 1, max: 10 },
    stamina: { type: Number, required: true, min: 1, max: 10 },
    agility: { type: Number, required: true, min: 1, max: 10 },
    decisionMaking: { type: Number, required: true, min: 1, max: 10 },
    leadership: { type: Number, required: true, min: 1, max: 10 },
    workRate: { type: Number, required: true, min: 1, max: 10 },
    categories: {
      type: skillCategoriesSchema,
      required: true,
    },
    overall: {
      type: Number,
      required: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [1000, 'Note cannot exceed 1000 characters'],
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

// Compound index for efficient development timeline lookups
skillAssessmentSchema.index({ athlete: 1, date: -1 });

export const SkillAssessment = model<ISkillAssessment>(
  'SkillAssessment',
  skillAssessmentSchema
);
