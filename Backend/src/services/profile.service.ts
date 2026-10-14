import { User } from '../models/User.js';
import { Athlete } from '../models/Athlete.js';
import { AuditLog } from '../models/AuditLog.js';
import { ApiError } from '../utils/ApiError.js';
import { computeAge, type UpdateProfileInput } from '../validators/profile.validator.js';

export interface ProfileResponse {
  id: string;
  name: string;
  role: string;
  dateOfBirth: string | null;
  age: number | null;
}

function formatDateToIsoString(date?: Date | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

export class ProfileService {
  /**
   * Retrieves profile for any authenticated user.
   * For role Athlete, dateOfBirth is sourced from the Athlete document (single source of truth).
   * For Admin, Coach, and Organizer, dateOfBirth is sourced from the User document.
   */
  async getProfile(userId: string): Promise<ProfileResponse> {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User account not found');
    }

    let dob: Date | undefined = undefined;

    if (user.role === 'Athlete') {
      const athlete = await Athlete.findOne({ user: user._id });
      if (athlete?.dateOfBirth) {
        dob = athlete.dateOfBirth;
      }
    } else {
      if (user.dateOfBirth) {
        dob = user.dateOfBirth;
      }
    }

    const formattedDob = formatDateToIsoString(dob);
    const age = formattedDob ? computeAge(formattedDob) : null;

    return {
      id: user.id,
      name: user.name,
      role: user.role,
      dateOfBirth: formattedDob,
      age,
    };
  }

  /**
   * Updates profile name and/or dateOfBirth.
   * Athlete user without an Athlete profile document may change the name; dateOfBirth change returns 400.
   * When name changes, public entity documents (e.g. Coach.name) are kept in sync.
   * Records AuditLog action PROFILE_UPDATED with the list of changed field names only (never values).
   */
  async updateProfile(
    userId: string,
    input: UpdateProfileInput
  ): Promise<ProfileResponse> {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User account not found');
    }

    const changedFields: string[] = [];

    // Handle name change
    if (input.name !== undefined && input.name !== user.name) {
      user.name = input.name;
      changedFields.push('name');
    }

    // Handle dateOfBirth change
    if (input.dateOfBirth !== undefined) {
      const [y, m, d] = input.dateOfBirth.split('-').map(Number);
      const newDob = new Date(Date.UTC(y, m - 1, d));

      if (user.role === 'Athlete') {
        const athlete = await Athlete.findOne({ user: user._id });
        if (!athlete) {
          throw new ApiError(
            400,
            'Athlete profile document does not exist yet. You can only update your name until an administrator creates your athlete profile.'
          );
        }
        athlete.dateOfBirth = newDob;
        await athlete.save();
        changedFields.push('dateOfBirth');
      } else {
        user.dateOfBirth = newDob;
        changedFields.push('dateOfBirth');
      }
    }

    await user.save();

    // Create AuditLog entry if changes occurred
    if (changedFields.length > 0) {
      await AuditLog.create({
        actor: user._id,
        action: 'PROFILE_UPDATED',
        targetType: 'User',
        targetId: user._id,
        meta: {
          changedFields,
        },
      });
    }

    return await this.getProfile(userId);
  }
}

export const profileService = new ProfileService();
