import { Schema, model, type Document, type Types } from 'mongoose';
import { AUDIT_ACTIONS, type AuditAction } from './constants.js';

export interface IAuditLog extends Document {
  actor: Types.ObjectId;
  action: AuditAction;
  targetType: string;
  targetId: Types.ObjectId;
  meta?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Audit log actor is required'],
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Audit log action is required'],
      enum: {
        values: AUDIT_ACTIONS,
        message: '{VALUE} is not a supported audit action',
      },
    },
    targetType: {
      type: String,
      required: [true, 'Target type is required'],
      trim: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Target identifier is required'],
    },
    meta: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ip: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
    timestamps: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for efficient historical timeline audits
auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
