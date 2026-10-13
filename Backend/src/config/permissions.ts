import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';
import type { Role } from '../models/constants.js';

export type Resource =
  | 'users'
  | 'sports'
  | 'teams'
  | 'coaches'
  | 'athletes'
  | 'rosters'
  | 'training'
  | 'attendance'
  | 'documents'
  | 'announcements'
  | 'tournaments'
  | 'registrations'
  | 'venues'
  | 'officials'
  | 'matches'
  | 'reports'
  | 'contactMessages'
  | 'dashboard'
  | 'chatbot'
  | 'achievements';

export type Action = 'create' | 'read' | 'update' | 'delete' | 'resetPassword' | 'unlock' | 'manage';

export type EnforcementStatus = 'enforced_now' | 'enforced_later';

export interface PermissionRule {
  roles: readonly Role[];
  status: EnforcementStatus;
  description?: string;
}

/**
 * Platform-wide RBAC Matrix mapping resource actions to authorized roles.
 * References the permissions established in Step 3B sidebar and dashboard routes.
 */
export const PERMISSION_MATRIX: Record<
  Resource,
  Partial<Record<Action, PermissionRule>>
> = {
  users: {
    create: { roles: ['Admin'], status: 'enforced_now', description: 'Admin provisions any user account' },
    read: { roles: ['Admin'], status: 'enforced_now', description: 'Admin lists and views users' },
    update: { roles: ['Admin'], status: 'enforced_now', description: 'Admin updates user roles/status' },
    delete: { roles: ['Admin'], status: 'enforced_now', description: 'Admin deactivates users' },
    resetPassword: { roles: ['Admin'], status: 'enforced_now', description: 'Admin resets user password' },
    unlock: { roles: ['Admin'], status: 'enforced_now', description: 'Admin unlocks locked user account' },
  },
  sports: {
    create: { roles: ['Admin'], status: 'enforced_now' },
    read: { roles: ['Admin', 'Coach', 'Athlete', 'Organizer'], status: 'enforced_now' },
    update: { roles: ['Admin'], status: 'enforced_now' },
    delete: { roles: ['Admin'], status: 'enforced_now' },
  },
  teams: {
    create: { roles: ['Admin'], status: 'enforced_now' },
    read: { roles: ['Admin', 'Coach', 'Organizer', 'Athlete'], status: 'enforced_now' },
    update: { roles: ['Admin'], status: 'enforced_now' },
    delete: { roles: ['Admin'], status: 'enforced_now' },
  },
  coaches: {
    create: { roles: ['Admin'], status: 'enforced_now' },
    read: { roles: ['Admin', 'Organizer', 'Coach'], status: 'enforced_now' },
    update: { roles: ['Admin', 'Coach'], status: 'enforced_now' },
    delete: { roles: ['Admin'], status: 'enforced_now' },
  },
  athletes: {
    create: { roles: ['Admin'], status: 'enforced_now' },
    read: { roles: ['Admin', 'Coach', 'Athlete'], status: 'enforced_now' },
    update: { roles: ['Admin', 'Coach', 'Athlete'], status: 'enforced_now' },
    delete: { roles: ['Admin'], status: 'enforced_now' },
  },
  rosters: {
    create: { roles: ['Admin'], status: 'enforced_now' },
    read: { roles: ['Admin', 'Coach'], status: 'enforced_now' },
    update: { roles: ['Admin'], status: 'enforced_now' },
    delete: { roles: ['Admin'], status: 'enforced_now' },
  },
  training: {
    create: { roles: ['Admin', 'Coach'], status: 'enforced_now' },
    read: { roles: ['Admin', 'Coach', 'Athlete', 'Organizer'], status: 'enforced_now' },
    update: { roles: ['Admin', 'Coach'], status: 'enforced_now' },
    delete: { roles: ['Admin'], status: 'enforced_now' },
  },
  attendance: {
    create: { roles: ['Admin', 'Coach'], status: 'enforced_now' },
    read: { roles: ['Admin', 'Coach', 'Athlete'], status: 'enforced_now' },
    update: { roles: ['Admin', 'Coach'], status: 'enforced_now' },
    delete: { roles: ['Admin'], status: 'enforced_now' },
  },
  documents: {
    create: { roles: ['Admin', 'Coach'], status: 'enforced_now' },
    read: { roles: ['Admin', 'Coach', 'Athlete', 'Organizer'], status: 'enforced_now' },
    delete: { roles: ['Admin', 'Coach'], status: 'enforced_now' },
  },
  announcements: {
    create: { roles: ['Admin', 'Coach'], status: 'enforced_now' },
    read: { roles: ['Admin', 'Coach', 'Athlete', 'Organizer'], status: 'enforced_now' },
    update: { roles: ['Admin', 'Coach'], status: 'enforced_now' },
    delete: { roles: ['Admin', 'Coach'], status: 'enforced_now' },
  },
  tournaments: {
    create: { roles: ['Admin', 'Organizer'], status: 'enforced_now', description: 'Admin or Organizer creates tournament' },
    read: { roles: ['Admin', 'Organizer', 'Coach', 'Athlete'], status: 'enforced_now', description: 'View tournaments' },
    update: { roles: ['Admin', 'Organizer'], status: 'enforced_now', description: 'Admin or owning Organizer updates tournament' },
    delete: { roles: ['Admin', 'Organizer'], status: 'enforced_now', description: 'Admin or owning Organizer deletes Draft tournament' },
  },
  registrations: {
    create: { roles: ['Admin', 'Coach'], status: 'enforced_now', description: 'Admin or Coach registers coached team' },
    read: { roles: ['Admin', 'Organizer', 'Coach', 'Athlete'], status: 'enforced_now', description: 'View registrations' },
    update: { roles: ['Admin', 'Organizer', 'Coach'], status: 'enforced_now', description: 'Review (Admin/Org) or update squad (Coach)' },
    delete: { roles: ['Admin', 'Coach'], status: 'enforced_now', description: 'Withdraw Pending registration' },
  },
  venues: {
    create: { roles: ['Admin', 'Organizer'], status: 'enforced_now', description: 'Admin or Organizer creates venue' },
    read: { roles: ['Admin', 'Organizer', 'Coach', 'Athlete'], status: 'enforced_now', description: 'View venues' },
    update: { roles: ['Admin', 'Organizer'], status: 'enforced_now', description: 'Admin or creator Organizer updates venue' },
    delete: { roles: ['Admin', 'Organizer'], status: 'enforced_now', description: 'Admin or creator Organizer deletes venue' },
  },
  officials: {
    create: { roles: ['Admin', 'Organizer'], status: 'enforced_now', description: 'Admin or Organizer creates official' },
    read: { roles: ['Admin', 'Organizer', 'Coach', 'Athlete'], status: 'enforced_now', description: 'View officials' },
    update: { roles: ['Admin', 'Organizer'], status: 'enforced_now', description: 'Admin or creator Organizer updates official' },
    delete: { roles: ['Admin', 'Organizer'], status: 'enforced_now', description: 'Admin or creator Organizer deletes official' },
  },
  matches: {
    create: { roles: ['Admin', 'Organizer'], status: 'enforced_now', description: 'Admin or owning Organizer schedules match' },
    read: { roles: ['Admin', 'Organizer', 'Coach', 'Athlete', 'Official'], status: 'enforced_now', description: 'View matches' },
    update: { roles: ['Admin', 'Organizer', 'Official'], status: 'enforced_now', description: 'Admin or owning Organizer updates match or enters result; Official live workflow' },
    delete: { roles: ['Admin', 'Organizer'], status: 'enforced_now', description: 'Admin or owning Organizer deletes match' },
  },
  reports: {
    create: { roles: ['Admin', 'Organizer'], status: 'enforced_later' },
    read: { roles: ['Admin', 'Coach', 'Organizer'], status: 'enforced_later' },
    update: { roles: ['Admin'], status: 'enforced_later' },
    delete: { roles: ['Admin'], status: 'enforced_later' },
  },
  contactMessages: {
    read: { roles: ['Admin'], status: 'enforced_now', description: 'Admin lists and views contact messages' },
    update: { roles: ['Admin'], status: 'enforced_now', description: 'Admin updates contact message status' },
  },
  dashboard: {
    read: { roles: ['Admin', 'Coach', 'Athlete', 'Organizer', 'Official'], status: 'enforced_now', description: 'Authenticated role reads overview' },
  },
  chatbot: {
    create: { roles: ['Admin', 'Coach', 'Athlete', 'Organizer', 'Official'], status: 'enforced_now', description: 'Authenticated role interacts with chatbot' },
    read: { roles: ['Admin', 'Coach', 'Athlete', 'Organizer', 'Official'], status: 'enforced_now', description: 'Authenticated role reads own conversation history' },
    delete: { roles: ['Admin', 'Coach', 'Athlete', 'Organizer', 'Official'], status: 'enforced_now', description: 'Authenticated role clears own conversation history' },
  },
  achievements: {
    create: { roles: ['Admin'], status: 'enforced_now', description: 'Admin creates achievement' },
    read: { roles: ['Admin'], status: 'enforced_now', description: 'Admin lists and views achievements' },
    update: { roles: ['Admin'], status: 'enforced_now', description: 'Admin updates achievement' },
    delete: { roles: ['Admin'], status: 'enforced_now', description: 'Admin deletes achievement' },
  },
};

/**
 * Checks if a given role is granted permission for a specific resource action.
 */
export const can = (role: Role, resource: Resource, action: Action): boolean => {
  const resourceRules = PERMISSION_MATRIX[resource];
  if (!resourceRules) return false;
  const rule = resourceRules[action];
  if (!rule) return false;
  return rule.roles.includes(role);
};

/**
 * Express middleware requiring specific resource action permission.
 * Must run after requireAuth.
 */
export const requirePermission = (resource: Resource, action: Action) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (!can(req.user.role, resource, action)) {
      return next(
        new ApiError(
          403,
          `Access forbidden: role "${req.user.role}" does not have permission to ${action} ${resource}`
        )
      );
    }

    next();
  };
};
