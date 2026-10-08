import { Types } from 'mongoose';
import { Athlete, type IAthlete } from '../models/Athlete.js';
import { Coach, type ICoach } from '../models/Coach.js';
import { Team } from '../models/Team.js';
import type { IUser } from '../models/User.js';

export class ScopeService {
  /**
   * Look up the athlete profile linked to a user account.
   */
  async getAthleteProfileForUser(
    userId: string | Types.ObjectId
  ): Promise<IAthlete | null> {
    const objectId =
      typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    return Athlete.findOne({ user: objectId });
  }

  /**
   * Look up the coach profile linked to a user account.
   */
  async getCoachProfileForUser(
    userId: string | Types.ObjectId
  ): Promise<ICoach | null> {
    const objectId =
      typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    return Coach.findOne({ user: objectId });
  }

  /**
   * Retrieve all Team ObjectIds currently assigned to a coach user.
   */
  async getCoachTeamIds(
    userId: string | Types.ObjectId
  ): Promise<Types.ObjectId[]> {
    const coach = await this.getCoachProfileForUser(userId);
    if (!coach) return [];

    const teams = await Team.find({ coach: coach._id }).select('_id');
    return teams.map((team) => team._id as Types.ObjectId);
  }

  /**
   * Determine if a coach has access to an athlete (athlete rostered in coach's team).
   * Administrators always have access.
   */
  async canCoachAccessAthlete(
    user: IUser,
    athleteId: string | Types.ObjectId
  ): Promise<boolean> {
    if (user.role === 'Admin') return true;
    if (user.role !== 'Coach') return false;

    const targetAthleteId =
      typeof athleteId === 'string' ? new Types.ObjectId(athleteId) : athleteId;
    const athlete = await Athlete.findById(targetAthleteId);
    if (!athlete || !athlete.team) return false;

    const coachTeamIds = await this.getCoachTeamIds(user._id);
    return coachTeamIds.some(
      (teamId) => teamId.toString() === athlete.team!.toString()
    );
  }

  /**
   * Determine if an athlete user can access an athlete record (own profile only).
   * Administrators always have access.
   */
  async canAthleteAccessAthlete(
    user: IUser,
    athleteId: string | Types.ObjectId
  ): Promise<boolean> {
    if (user.role === 'Admin') return true;

    const targetAthleteId =
      typeof athleteId === 'string' ? new Types.ObjectId(athleteId) : athleteId;
    const athlete = await Athlete.findById(targetAthleteId);
    if (!athlete || !athlete.user) return false;

    return athlete.user.toString() === user._id.toString();
  }
}

export const scopeService = new ScopeService();
