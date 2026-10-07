import { Schema, model, type Document, type Types } from 'mongoose';
import {
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
} from './constants.js';

export interface IAttendance extends Document {
  session: Types.ObjectId;
  athlete: Types.ObjectId;
  status: AttendanceStatus;
  note?: string;
  markedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    session: {
      type: Schema.Types.ObjectId,
      ref: 'TrainingSession',
      required: [true, 'Training session reference is required'],
    },
    athlete: {
      type: Schema.Types.ObjectId,
      ref: 'Athlete',
      required: [true, 'Athlete reference is required'],
    },
    status: {
      type: String,
      enum: {
        values: ATTENDANCE_STATUSES,
        message: '{VALUE} is not a valid attendance status',
      },
      default: 'Present',
      required: true,
    },
    note: {
      type: String,
      trim: true,
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'MarkedBy user reference is required'],
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

// Enforce one attendance record per athlete per training session
attendanceSchema.index({ session: 1, athlete: 1 }, { unique: true });

export const Attendance = model<IAttendance>('Attendance', attendanceSchema);
