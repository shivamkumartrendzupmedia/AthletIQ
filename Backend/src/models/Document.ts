import { Schema, model, type Document as MongooseDocument, type Types } from 'mongoose';
import {
  DOCUMENT_TYPES,
  DOCUMENT_STATUSES,
  type DocumentType,
  type DocumentStatus,
} from './constants.js';

export interface IAcademyDocument extends MongooseDocument {
  owner: Types.ObjectId;
  athlete?: Types.ObjectId;
  type: DocumentType;
  title: string;
  fileUrl: string;
  status: DocumentStatus;
  expiresAt?: Date;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const academyDocumentSchema = new Schema<IAcademyDocument>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Document owner user reference is required'],
    },
    athlete: {
      type: Schema.Types.ObjectId,
      ref: 'Athlete',
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: DOCUMENT_TYPES,
        message: '{VALUE} is not a valid document type',
      },
      required: [true, 'Document type is required'],
    },
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      maxlength: [150, 'Document title cannot exceed 150 characters'],
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL reference is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: DOCUMENT_STATUSES,
        message: '{VALUE} is not a valid document status',
      },
      default: 'Pending',
      required: true,
    },
    expiresAt: {
      type: Date,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
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

// Indexes for compliance and user document retrieval
academyDocumentSchema.index({ owner: 1, type: 1 });
academyDocumentSchema.index({ status: 1 });

export const AcademyDocument = model<IAcademyDocument>(
  'AcademyDocument',
  academyDocumentSchema
);
