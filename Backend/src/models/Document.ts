import { Schema, model, type Document as MongooseDocument, type Types } from 'mongoose';
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_VISIBILITIES,
  type DocumentCategory,
  type DocumentVisibility,
} from './constants.js';

export interface IDocumentFile {
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface IAcademyDocument extends MongooseDocument {
  title: string;
  category: DocumentCategory;
  file: IDocumentFile;
  visibility: DocumentVisibility;
  team?: Types.ObjectId | null;
  uploadedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const documentFileSchema = new Schema<IDocumentFile>(
  {
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    storedName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    sizeBytes: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const academyDocumentSchema = new Schema<IAcademyDocument>(
  {
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      maxlength: [150, 'Document title cannot exceed 150 characters'],
    },
    category: {
      type: String,
      enum: {
        values: DOCUMENT_CATEGORIES,
        message: '{VALUE} is not a valid document category',
      },
      required: [true, 'Document category is required'],
      index: true,
    },
    file: {
      type: documentFileSchema,
      required: [true, 'File metadata is required'],
    },
    visibility: {
      type: String,
      enum: {
        values: DOCUMENT_VISIBILITIES,
        message: '{VALUE} is not a valid visibility scope',
      },
      required: [true, 'Visibility scope is required'],
      index: true,
    },
    team: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'UploadedBy user reference is required'],
      index: true,
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

academyDocumentSchema.index({ createdAt: -1 });

export const AcademyDocument = model<IAcademyDocument>(
  'AcademyDocument',
  academyDocumentSchema
);
