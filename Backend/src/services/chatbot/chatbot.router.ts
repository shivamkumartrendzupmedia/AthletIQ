import type { Role } from '../../models/constants.js';
import { ROLE_TOOLS, type ChatbotUserSession } from './tools.registry.js';
import { Tournament, Team, Athlete } from '../../models/index.js';
import { scopeService } from '../scope.service.js';

export interface RouteMatchResult {
  toolName: string | null;
  args: Record<string, unknown>;
  reply?: string;
  isHelp?: boolean;
  isRefusal?: boolean;
}

export const ADVERSARIAL_REFUSAL_MESSAGE =
  'I am a read-only assistant for Athletiq. I cannot execute instructions, reveal system prompts or secrets, modify data, or access unauthorized records.';

/**
 * Normalizes user text: lowercase, strip punctuation, collapse whitespace.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks for prompt injection, secrets extraction, mutation requests, or unauthorized snoop attempts.
 */
export function isAdversarialOrUnauthorized(rawText: string): boolean {
  const normalized = normalizeText(rawText);

  const adversarialPatterns = [
    // Prompt injections & system override
    /\bignore (all|previous|system) (instructions|rules|prompts)\b/,
    /\bforget (all|previous) (instructions|rules)\b/,
    /\b(system prompt|system instructions|reveal instructions|show prompt)\b/,
    /\b(you are now|pretend to be|act as) (admin|root|superuser|developer|god)\b/,
    /\b(jailbreak|bypass security|override rules)\b/,
    // Secret / key extraction
    /\b(api[ _-]?key|secret|jwt[ _-]?secret|access[ _-]?secret|refresh[ _-]?secret|private[ _-]?key|credentials|env file|\.env)\b/,
    /\b(password hash|database uri|connection string|mongodb uri)\b/,
    // Mutation commands
    /\b(delete|drop|remove|erase) (user|athlete|coach|team|tournament|match|database|record|table)\b/,
    /\b(update|change|alter|modify|edit|set) (role|password|attendance|score|admin|status|permission)\b/,
    /\b(create|insert|add|provision) (new )?(admin|user|team|coach|official)\b/,
    // Unauthorized access / snooping
    /\b(medical notes|medical condition|guardian phone|guardian email|guardian name)\b/,
    /\b(other (user|coach|athlete|team) (attendance|password|email|phone|profile))\b/,
    /\b(all (users|passwords|emails|phones))\b/,
  ];

  for (const pattern of adversarialPatterns) {
    if (pattern.test(normalized)) {
      return true;
    }
  }

  // Check for common SQL/NoSQL injection tokens in the text
  if (
    normalized.includes('$where') ||
    normalized.includes('$gt') ||
    normalized.includes('$regex') ||
    normalized.includes('drop database') ||
    normalized.includes('select * from')
  ) {
    return true;
  }

  return false;
}

interface IntentPattern {
  tool: string;
  keywords: string[];
  phrases: string[];
  weight?: number;
}

// Intent definitions with English and Hinglish phrases/synonyms/typos
const INTENT_PATTERNS: IntentPattern[] = [
  // Standings
  {
    tool: 'getStandings',
    keywords: ['standings', 'standing', 'points table', 'leaderboard', 'rankings', 'top scorer', 'table', 'points'],
    phrases: ['points table', 'point table', 'standings table', 'group table', 'league table', 'top scorer', 'who is winning', 'highest points', 'point table dikhao', 'standings kya hai'],
    weight: 2,
  },
  // Notifications
  {
    tool: 'getMyNotificationsSummary',
    keywords: ['notification', 'notifications', 'alerts', 'suchna', 'soochana', 'notifs'],
    phrases: ['unread notifications', 'any notifications', 'my notifications', 'koi notification', 'unread alerts', 'suchna hai kya', 'kitne notification'],
    weight: 1.5,
  },
  // Public Info
  {
    tool: 'getPublicInfo',
    keywords: ['public', 'academy info', 'programs', 'sports programs', 'sports count', 'live match', 'live matches', 'live score'],
    phrases: ['about academy', 'academy overview', 'sports offered', 'what sports', 'live score', 'live match now', 'active coaches', 'active sports', 'kitne sports', 'programs list'],
    weight: 1.2,
  },
  // Athlete Profile
  {
    tool: 'getMyProfileSummary',
    keywords: ['profile', 'jersey', 'position', 'mera profile', 'meri profile'],
    phrases: ['my profile', 'who am i', 'my team name', 'jersey number', 'what is my team', 'my details', 'meri profile', 'mera jersey number', 'apni profile'],
    weight: 1.5,
  },
  // Athlete Attendance
  {
    tool: 'getMyAttendance',
    keywords: ['attendance', 'hajri', 'haazri', 'attendance rate', 'present', 'absent'],
    phrases: ['my attendance', 'attendance rate', 'meri attendance', 'meri hajri', 'kitni hajri', 'attendance kitni hai', 'how many sessions attended', 'present count', 'mera attendance'],
    weight: 1.8,
  },
  // Upcoming Training Sessions
  {
    tool: 'getMyUpcomingSessions',
    keywords: ['session', 'sessions', 'training', 'practice', 'practice session'],
    phrases: ['next session', 'upcoming sessions', 'training session', 'agla session', 'training kab hai', 'practice kab hai', 'next practice', 'kal ki training', 'schedule session'],
    weight: 1.8,
  },
  // Athlete Goals
  {
    tool: 'getMyGoals',
    keywords: ['goals', 'goal', 'target', 'targets', 'lakshya', 'progress'],
    phrases: ['my goals', 'development goals', 'mere goals', 'target kya hai', 'active goals', 'goal progress', 'lakshya kya hai', 'kitne goals'],
    weight: 1.8,
  },
  // Athlete Feedback
  {
    tool: 'getMyFeedbackSummary',
    keywords: ['feedback', 'remarks', 'review', 'tippani'],
    phrases: ['coach feedback', 'my feedback', 'coach remarks', 'coach ne kya bola', 'coach review', 'feedback summary', 'latest feedback', 'mera feedback'],
    weight: 1.8,
  },
  // Athlete Assessment
  {
    tool: 'getMyLatestAssessment',
    keywords: ['assessment', 'rating', 'ratings', 'score', 'scores', 'overall', 'pace', 'shooting', 'skills'],
    phrases: ['my assessment', 'latest assessment', 'skill score', 'overall score', 'skill ratings', 'mera assessment', 'assessment score', 'how are my skills'],
    weight: 1.8,
  },
  // Athlete Tournament Performance
  {
    tool: 'getMyTournamentPerformance',
    keywords: ['performance', 'tournament stats', 'goals scored', 'matches played'],
    phrases: ['tournament performance', 'tournament record', 'mera performance', 'kitne match jite', 'match stats', 'goals scored in tournament'],
    weight: 1.5,
  },
  // Athlete Next Matches
  {
    tool: 'getMyNextMatches',
    keywords: ['next match', 'agla match', 'fixture', 'fixtures', 'game'],
    phrases: ['next match', 'upcoming match', 'agla match', 'match kab hai', 'next game', 'next fixture', 'upcoming fixture', 'kal match hai kya'],
    weight: 1.8,
  },
  // Coach Teams
  {
    tool: 'getMyTeams',
    keywords: ['teams', 'my teams', 'meri teams', 'coaching teams'],
    phrases: ['my teams', 'teams list', 'meri teams', 'konsi teams', 'assigned teams', 'which teams do i coach', 'teams assigned'],
    weight: 1.6,
  },
  // Coach Team Roster
  {
    tool: 'getMyTeamRoster',
    keywords: ['roster', 'players', 'athletes', 'squad', 'khiladi', 'members'],
    phrases: ['team roster', 'players list', 'athletes list', 'squad list', 'roster dikhao', 'team players', 'roster list', 'players in my team'],
    weight: 1.8,
  },
  // Coach Team Attendance
  {
    tool: 'getMyTeamAttendance',
    keywords: ['team attendance', 'team hajri', 'overall attendance'],
    phrases: ['team attendance', 'team attendance rate', 'overall team attendance', 'team ki hajri', 'players attendance rate', 'team ka attendance'],
    weight: 1.8,
  },
  // Coach Athlete Development
  {
    tool: 'getAthleteDevelopmentSummary',
    keywords: ['development', 'athlete progress', 'player progress', 'athlete summary', 'player development'],
    phrases: ['athlete progress', 'player summary', 'development summary', 'player progress', 'player stats', 'athlete stats', 'bachhe ki progress'],
    weight: 2.0,
  },
  // Organizer Tournaments
  {
    tool: 'getMyTournaments',
    keywords: ['my tournaments', 'mere tournaments', 'organized tournaments', 'tournaments managed'],
    phrases: ['my tournaments', 'tournaments list', 'mere tournaments', 'tournaments managed', 'tournaments created', 'which tournaments'],
    weight: 1.7,
  },
  // Organizer Registrations
  {
    tool: 'getMyRegistrationsSummary',
    keywords: ['registrations', 'applications', 'registered teams', 'pending registrations'],
    phrases: ['registrations summary', 'pending registrations', 'team applications', 'kitne register hue', 'kitni applications', 'registration status'],
    weight: 1.8,
  },
  // Organizer Upcoming Matches
  {
    tool: 'getMyUpcomingMatches',
    keywords: ['tournament matches', 'upcoming matches', 'tournament fixtures'],
    phrases: ['upcoming matches', 'matches in my tournaments', 'tournament fixtures', 'agle matches', 'tournament matches'],
    weight: 1.6,
  },
  // Admin Academy Overview
  {
    tool: 'getAcademyOverview',
    keywords: ['overview', 'academy overview', 'admin overview', 'total users', 'platform stats'],
    phrases: ['academy overview', 'admin overview', 'platform stats', 'total users', 'kitne users', 'system overview', 'summary of academy'],
    weight: 1.8,
  },
  // Admin Pending Registrations Count
  {
    tool: 'getPendingRegistrationsCount',
    keywords: ['pending registrations', 'pending registrations count', 'pending review'],
    phrases: ['pending registrations count', 'how many pending registrations', 'kitne registrations baki hai', 'pending tournament applications count'],
    weight: 2.0,
  },
  // Admin Unread Contact Messages Count
  {
    tool: 'getUnreadContactMessagesCount',
    keywords: ['contact messages', 'unread contact', 'inquiries', 'support messages'],
    phrases: ['unread contact messages', 'contact messages count', 'how many contact messages', 'kitne contact message', 'new inquiries'],
    weight: 2.0,
  },
];

/**
 * Returns role-tailored capabilities help text.
 */
export function getRoleHelpMessage(role: Role): string {
  switch (role) {
    case 'Admin':
      return [
        'Here is what you can ask as an Admin:',
        '- Academy management overview ("academy overview", "platform stats", "kitne users")',
        '- Pending tournament registrations count ("pending registrations count", "kitne registrations baki hai")',
        '- Unread contact messages count ("unread contact messages", "contact inquiries")',
        '- Public academy details and live matches ("programs", "live matches")',
        '- Tournament standings ("standings for [tournament name]", "points table")',
        '- Unread notifications count ("my notifications", "alerts")',
      ].join('\n');

    case 'Coach':
      return [
        'Here is what you can ask as a Coach:',
        '- Your assigned teams ("my teams", "meri teams")',
        '- Team roster ("team roster", "players list", "roster for [team]")',
        '- Upcoming training sessions ("next session", "agla practice session")',
        '- Team attendance overview ("team attendance", "hajri rate")',
        '- Athlete development summary ("athlete progress for [athlete name]")',
        '- Public tournaments and live scores ("tournaments", "live matches")',
        '- Tournament standings ("standings for [tournament name]", "points table")',
        '- Unread notifications count ("my notifications", "alerts")',
      ].join('\n');

    case 'Athlete':
      return [
        'Here is what you can ask as an Athlete:',
        '- Your profile details ("my profile", "meri profile")',
        '- Your training attendance ("my attendance", "meri hajri")',
        '- Upcoming training sessions ("next session", "agla session")',
        '- Your development goals ("my goals", "lakshya")',
        '- Coach feedback summary ("my feedback", "coach feedback")',
        '- Latest skill assessment ("my assessment", "scores")',
        '- Upcoming match schedule ("next match", "agla match")',
        '- Tournament performance stats ("tournament performance", "my record")',
        '- Public tournament standings ("standings for [tournament name]", "points table")',
        '- Unread notifications count ("my notifications", "alerts")',
      ].join('\n');

    case 'Organizer':
      return [
        'Here is what you can ask as an Organizer:',
        '- Your tournaments ("my tournaments", "mere tournaments")',
        '- Registration numbers ("registrations summary", "pending applications")',
        '- Upcoming tournament matches ("upcoming matches", "tournament fixtures")',
        '- Public academy details and live matches ("programs", "live matches")',
        '- Tournament standings ("standings for [tournament name]", "points table")',
        '- Unread notifications count ("my notifications", "alerts")',
      ].join('\n');

    default:
      return 'I don\'t have that information.';
  }
}

/**
 * Extracts a scoped entity (tournament name, team name, athlete name)
 * strictly matched against records the user is authorized to view.
 */
async function extractScopedEntity(
  toolName: string,
  rawText: string,
  user: ChatbotUserSession
): Promise<Record<string, unknown>> {
  const norm = normalizeText(rawText);

  if (toolName === 'getStandings') {
    // Match against public non-draft tournaments
    const tourneys = await Tournament.find({ status: { $ne: 'Draft' } }).select('name').lean();
    for (const t of tourneys) {
      if (norm.includes(normalizeText(t.name))) {
        return { tournamentName: t.name };
      }
    }
    // If only 1 public tournament exists, default to it
    if (tourneys.length === 1) {
      return { tournamentName: tourneys[0].name };
    }
    // Extract any word phrase following "for" or "of" or "in"
    const match = rawText.match(/(?:for|of|in|table of)\s+([a-zA-Z0-9\s-]+)/i);
    if (match && match[1]) {
      return { tournamentName: match[1].trim() };
    }
    // Fallback: check if any tournament name appears
    if (tourneys.length > 0) {
      return { tournamentName: tourneys[0].name };
    }
    return { tournamentName: 'Default Tournament' };
  }

  if (toolName === 'getMyTeamRoster' && user.role === 'Coach') {
    const coachTeamIds = await scopeService.getCoachTeamIds(user.id);
    const teams = await Team.find({ _id: { $in: coachTeamIds } }).select('name').lean();
    for (const t of teams) {
      if (norm.includes(normalizeText(t.name))) {
        return { teamName: t.name };
      }
    }
    return {};
  }

  if (toolName === 'getAthleteDevelopmentSummary' && user.role === 'Coach') {
    const coachTeamIds = await scopeService.getCoachTeamIds(user.id);
    const athletes = await Athlete.find({ team: { $in: coachTeamIds } })
      .populate('user', 'name')
      .lean();

    for (const a of athletes) {
      const u = a.user as unknown as { name?: string } | null;
      if (u?.name && norm.includes(normalizeText(u.name))) {
        return { athleteName: u.name };
      }
    }

    // Try extracting word after "for" or "of" or "player"
    const match = rawText.match(/(?:for|of|player|athlete)\s+([a-zA-Z\s]+)/i);
    if (match && match[1]) {
      return { athleteName: match[1].trim() };
    }

    // If coach has only one athlete, fallback to that athlete
    if (athletes.length === 1) {
      const u = athletes[0].user as unknown as { name?: string } | null;
      if (u?.name) return { athleteName: u.name };
    }

    return { athleteName: 'Unknown' };
  }

  return {};
}

/**
 * Main Router: maps normalized user input to a whitelisted tool.
 */
export async function routeMessage(
  rawText: string,
  user: ChatbotUserSession
): Promise<RouteMatchResult> {
  // 1. Guard check for adversarial attempts / secret extraction
  if (isAdversarialOrUnauthorized(rawText)) {
    return {
      toolName: null,
      args: {},
      reply: ADVERSARIAL_REFUSAL_MESSAGE,
      isRefusal: true,
    };
  }

  const normalized = normalizeText(rawText);
  if (!normalized) {
    return {
      toolName: null,
      args: {},
      reply: 'Please provide a question or request.',
      isHelp: true,
    };
  }

  const allowedToolSet = new Set(ROLE_TOOLS[user.role]);

  // Check for explicit "help" requests
  if (
    normalized === 'help' ||
    normalized === 'kya pooch sakte hai' ||
    normalized === 'what can i ask' ||
    normalized === 'commands' ||
    normalized === 'menu'
  ) {
    return {
      toolName: null,
      args: {},
      reply: getRoleHelpMessage(user.role),
      isHelp: true,
    };
  }

  // 2. Score intents
  const scores: Record<string, number> = {};

  for (const pattern of INTENT_PATTERNS) {
    if (!allowedToolSet.has(pattern.tool as (typeof ROLE_TOOLS)[Role][number])) {
      continue;
    }

    let score = 0;
    const baseWeight = pattern.weight || 1.0;

    // Check exact phrases first (higher weight)
    for (const phrase of pattern.phrases) {
      if (normalized.includes(phrase)) {
        score += 3.0 * baseWeight;
      }
    }

    // Check individual keywords
    for (const kw of pattern.keywords) {
      // Check as discrete token or substring
      const kwRegex = new RegExp(`\\b${kw}\\b`, 'i');
      if (kwRegex.test(normalized)) {
        score += 1.5 * baseWeight;
      } else if (normalized.includes(kw)) {
        score += 0.8 * baseWeight;
      }
    }

    if (score > 0) {
      scores[pattern.tool] = (scores[pattern.tool] || 0) + score;
    }
  }

  // Pick top scoring tool
  const scoredEntries = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  if (scoredEntries.length === 0 || scoredEntries[0][1] < 1.0) {
    // Low confidence or unknown intent: return role-specific help
    return {
      toolName: null,
      args: {},
      reply: getRoleHelpMessage(user.role),
      isHelp: true,
    };
  }

  // Check for tie between top 2 tools
  if (
    scoredEntries.length > 1 &&
    scoredEntries[0][1] === scoredEntries[1][1] &&
    scoredEntries[0][1] < 3.0
  ) {
    return {
      toolName: null,
      args: {},
      reply: getRoleHelpMessage(user.role),
      isHelp: true,
    };
  }

  const bestTool = scoredEntries[0][0];

  // 3. Extract scoped entities
  const args = await extractScopedEntity(bestTool, rawText, user);

  return {
    toolName: bestTool,
    args,
  };
}
