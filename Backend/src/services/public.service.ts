import { Types } from 'mongoose';
import { User } from '../models/User.js';
import { Sport } from '../models/Sport.js';
import { Team } from '../models/Team.js';
import { Coach } from '../models/Coach.js';
import { Athlete } from '../models/Athlete.js';
import { ApiError } from '../utils/ApiError.js';
import {
  parsePagination,
  formatPaginatedResponse,
  type PaginatedResult,
} from '../utils/pagination.js';

interface SanitizedTeamJson {
  id?: string;
  name?: string;
  slug?: string;
  ageGroup?: string;
  season?: string;
  logo?: string;
  sport?: unknown;
  coach?: {
    user?: { name?: string };
    title?: string;
    photo?: string;
  } | null;
}

interface SanitizedCoachJson {
  id?: string;
  title?: string;
  bio?: string;
  specialization?: string;
  specialties?: string[];
  certifications?: string[];
  experienceYears?: number;
  achievements?: string[];
  photo?: string;
  sports?: unknown;
  user?: { name?: string };
}

export class PublicService {
  /**
   * List active sports for public catalog.
   */
  async listPublicSports(
    query: Record<string, unknown>
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const { page, limit, skip } = parsePagination(query);

    const [sports, total] = await Promise.all([
      Sport.find({ status: 'Active' })
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .select(
          'id name slug shortDescription description icon image ageGroups features'
        ),
      Sport.countDocuments({ status: 'Active' }),
    ]);

    const sanitized = sports.map((s) => s.toJSON());
    return formatPaginatedResponse(sanitized, total, page, limit);
  }

  /**
   * Get single active sport by slug.
   */
  async getPublicSportBySlug(slug: string): Promise<Record<string, unknown>> {
    const sport = await Sport.findOne({ slug, status: 'Active' }).select(
      'id name slug shortDescription description icon image ageGroups features'
    );

    if (!sport) {
      throw new ApiError(404, 'Sport discipline not found');
    }

    return sport.toJSON();
  }

  /**
   * List active teams for public directory.
   * Includes sport name, coach name/photo, and athlete count. Excludes athlete rosters and PII.
   */
  async listPublicTeams(
    query: Record<string, unknown>
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const { page, limit, skip } = parsePagination(query);

    const filter: Record<string, unknown> = { status: 'Active' };
    if (query.sport && typeof query.sport === 'string') {
      const sportDoc = await Sport.findOne({
        $or: [{ slug: query.sport }, ...(Types.ObjectId.isValid(query.sport) ? [{ _id: new Types.ObjectId(query.sport) }] : [])],
        status: 'Active',
      });
      if (sportDoc) {
        filter.sport = sportDoc._id;
      }
    }

    const [teams, total] = await Promise.all([
      Team.find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .populate('sport', 'name slug -_id')
        .populate({
          path: 'coach',
          match: { isPublic: true },
          select: 'title photo -_id',
          populate: {
            path: 'user',
            match: { isActive: true },
            select: 'name -_id',
          },
        })
        .select('id name slug ageGroup season logo sport coach'),
      Team.countDocuments(filter),
    ]);

    // Compute athlete counts per team without leaking rosters
    const teamIds = teams.map((t) => t._id);
    const athleteCounts = await Athlete.aggregate([
      { $match: { team: { $in: teamIds }, status: 'Active' } },
      { $group: { _id: '$team', count: { $sum: 1 } } },
    ]);
    const countsMap = new Map(
      athleteCounts.map((c) => [c._id.toString(), c.count])
    );

    const sanitized = teams.map((t) => {
      const json = t.toJSON() as unknown as SanitizedTeamJson;
      // If coach's linked user is deactivated, hide coach
      if (json.coach && (!json.coach.user || !json.coach.user.name)) {
        json.coach = null;
      }
      return {
        id: json.id,
        name: json.name,
        slug: json.slug,
        ageGroup: json.ageGroup,
        season: json.season,
        logo: json.logo,
        sport: json.sport,
        coach: json.coach
          ? {
              name: json.coach.user?.name,
              title: json.coach.title,
              photo: json.coach.photo,
            }
          : null,
        athleteCount: countsMap.get(t._id.toString()) || 0,
      };
    });

    return formatPaginatedResponse(sanitized, total, page, limit);
  }

  /**
   * Get single active team by slug.
   */
  async getPublicTeamBySlug(slug: string): Promise<Record<string, unknown>> {
    const team = await Team.findOne({ slug, status: 'Active' })
      .populate('sport', 'name slug -_id')
      .populate({
        path: 'coach',
        match: { isPublic: true },
        select: 'title photo -_id',
        populate: {
          path: 'user',
          match: { isActive: true },
          select: 'name -_id',
        },
      })
      .select('id name slug ageGroup season logo sport coach');

    if (!team) {
      throw new ApiError(404, 'Team not found');
    }

    const athleteCount = await Athlete.countDocuments({
      team: team._id,
      status: 'Active',
    });

    const json = team.toJSON() as unknown as SanitizedTeamJson;
    if (json.coach && (!json.coach.user || !json.coach.user.name)) {
      json.coach = null;
    }

    return {
      id: json.id,
      name: json.name,
      slug: json.slug,
      ageGroup: json.ageGroup,
      season: json.season,
      logo: json.logo,
      sport: json.sport,
      coach: json.coach
        ? {
            name: json.coach.user?.name,
            title: json.coach.title,
            photo: json.coach.photo,
          }
        : null,
      athleteCount,
    };
  }

  /**
   * List public coaches.
   * Condition: isPublic === true AND linked user.isActive === true.
   * Paginated in the database via user id lookup, countDocuments, skip, limit.
   * Selects ONLY name from user (never email, phone, user id).
   */
  async listPublicCoaches(
    query: Record<string, unknown>
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const { page, limit, skip } = parsePagination(query);

    const activeUsers = await User.find({ isActive: true }).select('_id');
    const activeUserIds = activeUsers.map((u) => u._id);

    const filter = {
      isPublic: true,
      user: { $in: activeUserIds },
    };

    const [coaches, total] = await Promise.all([
      Coach.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'user',
          select: 'name -_id',
        })
        .populate('sports', 'name slug -_id')
        .select('id title bio specialization specialties certifications experienceYears achievements photo sports user'),
      Coach.countDocuments(filter),
    ]);

    const sanitized = coaches.map((c) => {
      const json = c.toJSON() as unknown as SanitizedCoachJson;
      return {
        id: json.id,
        name: json.user?.name,
        title: json.title,
        bio: json.bio,
        specialization: json.specialization,
        specialties: json.specialties,
        certifications: json.certifications,
        experienceYears: json.experienceYears,
        achievements: json.achievements,
        photo: json.photo,
        sports: json.sports,
      };
    });

    return formatPaginatedResponse(sanitized, total, page, limit);
  }

  /**
   * Get single public coach by ID.
   */
  async getPublicCoachById(id: string): Promise<Record<string, unknown>> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(404, 'Coach not found');
    }

    const coach = await Coach.findOne({ _id: new Types.ObjectId(id), isPublic: true })
      .populate({
        path: 'user',
        match: { isActive: true },
        select: 'name -_id',
      })
      .populate('sports', 'name slug -_id')
      .select('id title bio specialization specialties certifications experienceYears achievements photo sports user');

    if (!coach || !coach.user || !(coach.user as unknown as { name?: string }).name) {
      throw new ApiError(404, 'Coach not found');
    }

    const json = coach.toJSON() as unknown as SanitizedCoachJson;
    return {
      id: json.id,
      name: json.user?.name,
      title: json.title,
      bio: json.bio,
      specialization: json.specialization,
      specialties: json.specialties,
      certifications: json.certifications,
      experienceYears: json.experienceYears,
      achievements: json.achievements,
      photo: json.photo,
      sports: json.sports,
    };
  }
}

export const publicService = new PublicService();
