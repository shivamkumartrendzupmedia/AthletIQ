/**
 * ATHLETIQ Domain Constants and Enums
 * Single source of truth for schema validation and TypeScript types
 */

export const ROLES = ['Admin', 'Coach', 'Athlete', 'Organizer'] as const;
export type Role = (typeof ROLES)[number];

export const SPORT_STATUSES = ['Active', 'Inactive'] as const;
export type SportStatus = (typeof SPORT_STATUSES)[number];

export const TEAM_STATUSES = ['Active', 'Inactive'] as const;
export type TeamStatus = (typeof TEAM_STATUSES)[number];

export const ATHLETE_STATUSES = ['Active', 'Injured', 'Trial', 'Inactive'] as const;
export type AthleteStatus = (typeof ATHLETE_STATUSES)[number];

export const VERIFICATION_STATUSES = [
  'Verified',
  'Pending ID',
  'Medical Required',
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const PROFILE_VISIBILITY = ['Public', 'AcademyOnly', 'Private'] as const;
export type ProfileVisibility = (typeof PROFILE_VISIBILITY)[number];

export const GENDER_TYPES = ['Male', 'Female', 'Other'] as const;
export type GenderType = (typeof GENDER_TYPES)[number];

export const SESSION_TYPES = [
  'Training',
  'Match',
  'Gym',
  'Recovery',
  'Other',
] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export const SESSION_STATUSES = ['Scheduled', 'Completed', 'Cancelled'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const ATTENDANCE_STATUSES = [
  'Present',
  'Late',
  'Excused',
  'Absent',
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const DOCUMENT_TYPES = [
  'Waiver',
  'Medical',
  'ID',
  'Consent',
  'Contract',
  'Insurance',
  'Other',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_STATUSES = [
  'Pending',
  'Verified',
  'Rejected',
  'Expired',
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const ANNOUNCEMENT_PRIORITIES = ['Low', 'Normal', 'High'] as const;
export type AnnouncementPriority = (typeof ANNOUNCEMENT_PRIORITIES)[number];

export const AUDIT_ACTIONS = [
  'USER_CREATED',
  'USER_UPDATED',
  'USER_ROLE_CHANGED',
  'USER_DEACTIVATED',
  'USER_REACTIVATED',
  'USER_PASSWORD_RESET',
  'SPORT_CREATED',
  'SPORT_UPDATED',
  'SPORT_DELETED',
  'TEAM_CREATED',
  'TEAM_UPDATED',
  'TEAM_DELETED',
  'COACH_CREATED',
  'COACH_UPDATED',
  'COACH_DELETED',
  'ATHLETE_CREATED',
  'ATHLETE_UPDATED',
  'ATHLETE_DEACTIVATED',
  'ATHLETE_TEAM_ASSIGNED',
  'ATHLETE_TEAM_UNASSIGNED',
  'ATHLETE_VERIFICATION_UPDATED',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];


