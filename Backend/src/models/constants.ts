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

export const ANNOUNCEMENT_AUDIENCES = [
  'Public',
  'All',
  'Athletes',
  'Coaches',
  'Organizers',
  'Team',
] as const;
export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number];

export const DOCUMENT_CATEGORIES = [
  'Policy',
  'Form',
  'Schedule',
  'Report',
  'Other',
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_VISIBILITIES = [
  'Public',
  'All',
  'Athletes',
  'Coaches',
  'Organizers',
  'Team',
] as const;
export type DocumentVisibility = (typeof DOCUMENT_VISIBILITIES)[number];

export const AUDIT_ACTIONS = [
  'USER_CREATED',
  'USER_UPDATED',
  'USER_ROLE_CHANGED',
  'USER_DEACTIVATED',
  'USER_REACTIVATED',
  'USER_PASSWORD_RESET',
  'USER_UNLOCKED',
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
  'SESSION_CREATED',
  'SESSION_UPDATED',
  'SESSION_CANCELLED',
  'SESSION_DELETED',
  'ATTENDANCE_MARKED',
  'ANNOUNCEMENT_CREATED',
  'ANNOUNCEMENT_UPDATED',
  'ANNOUNCEMENT_DELETED',
  'DOCUMENT_UPLOADED',
  'DOCUMENT_DELETED',
  'SKILL_ASSESSMENT_CREATED',
  'COACH_FEEDBACK_CREATED',
  'COACH_FEEDBACK_ACKNOWLEDGED',
  'COACH_FEEDBACK_DELETED',
  'ATHLETE_GOAL_CREATED',
  'ATHLETE_GOAL_UPDATED',
  'REFRESH_GRACE_REUSE',
  'TOURNAMENT_CREATED',
  'TOURNAMENT_UPDATED',
  'TOURNAMENT_DELETED',
  'TOURNAMENT_TEAM_REGISTERED',
  'TOURNAMENT_TEAM_REVIEWED',
  'TOURNAMENT_TEAM_SQUAD_UPDATED',
  'TOURNAMENT_TEAM_WITHDRAWN',
  'VENUE_CREATED',
  'VENUE_UPDATED',
  'VENUE_DELETED',
  'OFFICIAL_CREATED',
  'OFFICIAL_UPDATED',
  'OFFICIAL_DELETED',
  'MATCH_CREATED',
  'MATCH_UPDATED',
  'MATCH_RESULT_ENTERED',
  'MATCH_DELETED',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const COACH_FEEDBACK_TYPES = ['Praise', 'Improvement', 'General'] as const;
export type CoachFeedbackType = (typeof COACH_FEEDBACK_TYPES)[number];

export const ATHLETE_GOAL_STATUSES = ['Active', 'Achieved', 'Dropped'] as const;
export type AthleteGoalStatus = (typeof ATHLETE_GOAL_STATUSES)[number];

export const SKILL_NAMES = [
  'pace',
  'shooting',
  'passing',
  'dribbling',
  'defending',
  'stamina',
  'agility',
  'decisionMaking',
  'leadership',
  'workRate',
] as const;
export type SkillName = (typeof SKILL_NAMES)[number];

export const TOURNAMENT_FORMATS = ['League', 'Knockout'] as const;
export type TournamentFormat = (typeof TOURNAMENT_FORMATS)[number];

export const TOURNAMENT_STATUSES = [
  'Draft',
  'Registration Open',
  'In Progress',
  'Completed',
  'Cancelled',
] as const;
export type TournamentStatus = (typeof TOURNAMENT_STATUSES)[number];

export const TOURNAMENT_TEAM_STATUSES = ['Pending', 'Approved', 'Rejected'] as const;
export type TournamentTeamStatus = (typeof TOURNAMENT_TEAM_STATUSES)[number];

export const OFFICIAL_TYPES = ['Referee', 'Assistant Referee', 'Scorer'] as const;
export type OfficialType = (typeof OFFICIAL_TYPES)[number];

export const MATCH_STATUSES = ['Scheduled', 'Completed', 'Cancelled'] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];


