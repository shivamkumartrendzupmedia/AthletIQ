import type { AddressInfo, Server } from 'net';
import mongoose, { Types } from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User, type IUser } from '../src/models/User.js';
import { Coach } from '../src/models/Coach.js';
import { Athlete } from '../src/models/Athlete.js';
import { Team } from '../src/models/Team.js';
import { Sport } from '../src/models/Sport.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { hashPassword } from '../src/utils/password.js';
import { signAccessToken } from '../src/utils/jwt.js';

let passed = 0;
let failed = 0;
let totalHttpRequests = 0;
let failedAuthHttpCount = 0;

function assert(condition: boolean, description: string): void {
  if (condition) {
    console.log(`  ✓ PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${description}`);
    failed++;
  }
}

interface HttpResult {
  status: number;
  body: unknown;
  headers: Headers;
}

async function httpFetch(
  url: string,
  options: RequestInit = {}
): Promise<HttpResult> {
  totalHttpRequests++;
  const res = await fetch(url, options);
  if (url.includes('/api/auth') && res.status >= 400) {
    failedAuthHttpCount++;
  }
  let body: unknown = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await res.json().catch(() => null);
  } else {
    body = await res.text().catch(() => null);
  }
  return { status: res.status, body, headers: res.headers };
}

interface TestServerGroup {
  baseUrl: string;
  close: () => Promise<void>;
  getRequestCount: () => number;
}

function startServerGroup(): {
  group: TestServerGroup;
  fetchGroup: (path: string, options?: RequestInit) => Promise<HttpResult>;
} {
  const app = createApp();
  const server: Server = app.listen(0);
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}/api`;
  let groupRequests = 0;

  const group: TestServerGroup = {
    baseUrl,
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
    getRequestCount: () => groupRequests,
  };

  const fetchGroup = async (path: string, options: RequestInit = {}) => {
    groupRequests++;
    return await httpFetch(`${baseUrl}${path}`, options);
  };

  return { group, fetchGroup };
}

function getDocId(data: unknown): Types.ObjectId {
  const obj = data as { id?: string; _id?: string } | null;
  const idStr = obj?.id || obj?._id;
  if (!idStr) {
    throw new Error(`Expected id in response data, got: ${JSON.stringify(data)}`);
  }
  return new Types.ObjectId(idStr);
}

function deepFindKeys(obj: unknown, forbiddenKeys: string[], found: string[] = []): string[] {
  if (obj === null || typeof obj !== 'object') return found;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      deepFindKeys(item, forbiddenKeys, found);
    }
    return found;
  }
  for (const [key, value] of Object.entries(obj)) {
    if (forbiddenKeys.includes(key)) {
      found.push(key);
    }
    deepFindKeys(value, forbiddenKeys, found);
  }
  return found;
}

async function run(): Promise<void> {
  console.log('\n--- VERIFYING ATHLETIQ ACADEMY CORE APIS (STEP 5) ---\n');

  await connectDB();

  // Snapshot database initial counts before running verification
  const initialUserCount = await User.countDocuments();
  const initialSportCount = await Sport.countDocuments();
  const initialTeamCount = await Team.countDocuments();
  const initialCoachCount = await Coach.countDocuments();
  const initialAthleteCount = await Athlete.countDocuments();
  const initialAuditCount = await AuditLog.countDocuments();

  console.log('Database state before test:');
  console.log(`  Users = ${initialUserCount}`);
  console.log(`  Sports = ${initialSportCount}`);
  console.log(`  Teams = ${initialTeamCount}`);
  console.log(`  Coaches = ${initialCoachCount}`);
  console.log(`  Athletes = ${initialAthleteCount}`);
  console.log(`  AuditLogs = ${initialAuditCount}\n`);

  // ID tracking arrays for strict cleanup of test records only
  const createdUserIds: Types.ObjectId[] = [];
  const createdSportIds: Types.ObjectId[] = [];
  const createdTeamIds: Types.ObjectId[] = [];
  const createdCoachIds: Types.ObjectId[] = [];
  const createdAthleteIds: Types.ObjectId[] = [];

  const runId = Math.random().toString(36).substring(2, 9);
  const defaultPassword = 'Password123!';
  const hashedPassword = await hashPassword(defaultPassword);

  try {
    // 1. Provision Test Users
    console.log('\n--- PROVISIONING ISOLATED USERS FOR ROLES ---');
    const roles = ['Admin', 'Coach', 'Athlete', 'Organizer'] as const;
    const testUsers: Record<string, IUser> = {};
    const tokens: Record<string, string> = {};

    for (const role of roles) {
      const user = await User.create({
        name: `Academy Test ${role}`,
        email: `verify-acad-${runId}-${role.toLowerCase()}@athletiq.test`,
        role,
        passwordHash: hashedPassword,
        isActive: true,
      });
      testUsers[role] = user;
      createdUserIds.push(user._id);
      tokens[role] = signAccessToken(user.id, user.role);
    }
    assert(Object.keys(testUsers).length === 4, 'Provisioned Admin, Coach, Athlete, Organizer test users');

    // Create a secondary coach user for multi-coach isolation tests
    const coach2User = await User.create({
      name: `Academy Test Coach 2`,
      email: `verify-acad-${runId}-coach2@athletiq.test`,
      role: 'Coach',
      passwordHash: hashedPassword,
      isActive: true,
    });
    createdUserIds.push(coach2User._id);
    const coach2Token = signAccessToken(coach2User.id, coach2User.role);

    // Create a secondary athlete user for IDOR isolation tests
    const athlete2User = await User.create({
      name: `Academy Test Athlete 2`,
      email: `verify-acad-${runId}-athlete2@athletiq.test`,
      role: 'Athlete',
      passwordHash: hashedPassword,
      isActive: true,
    });
    createdUserIds.push(athlete2User._id);
    const athlete2Token = signAccessToken(athlete2User.id, athlete2User.role);

    // -------------------------------------------------------------
    // GROUP 1: PUBLIC CATALOG, DIRECTORY & DEEP SCAN (Fresh createApp())
    // -------------------------------------------------------------
    console.log('\n--- GROUP 1: PUBLIC CATALOG & DIRECTORY ENDPOINTS ---');
    const { group: g1, fetchGroup: fetch1 } = startServerGroup();

    // Seed 1 public sport, 1 public coach, 1 public team for public endpoints verification
    const pubSport = await Sport.create({
      name: `Public Football ${runId}`,
      slug: `public-football-${runId}`,
      description: 'Public test sport discipline',
      ageGroups: ['U16', 'U18'],
      features: ['FIFA Standard'],
      status: 'Active',
    });
    createdSportIds.push(pubSport._id);

    const pubCoach = await Coach.create({
      user: testUsers.Coach._id,
      title: `Head Public Coach ${runId}`,
      sports: [pubSport._id],
      isPublic: true,
    });
    createdCoachIds.push(pubCoach._id);

    const pubTeam = await Team.create({
      name: `Public Lions ${runId}`,
      slug: `public-lions-${runId}`,
      sport: pubSport._id,
      ageGroup: 'U16',
      season: '2026',
      coach: pubCoach._id,
      status: 'Active',
    });
    createdTeamIds.push(pubTeam._id);

    // Missing test e: Create an Inactive sport, Inactive team, and coach with isPublic=false
    const inactSport = await Sport.create({
      name: `Inactive Sport ${runId}`,
      slug: `inactive-sport-${runId}`,
      description: 'Inactive sport description',
      status: 'Inactive',
    });
    createdSportIds.push(inactSport._id);

    const inactTeam = await Team.create({
      name: `Inactive Team ${runId}`,
      slug: `inactive-team-${runId}`,
      sport: pubSport._id,
      ageGroup: 'U16',
      season: '2026',
      status: 'Inactive',
    });
    createdTeamIds.push(inactTeam._id);

    const privateCoachUser = await User.create({
      name: `Academy Test Hidden Coach`,
      email: `verify-acad-${runId}-hidden-coach@athletiq.test`,
      role: 'Coach',
      passwordHash: hashedPassword,
      isActive: true,
    });
    createdUserIds.push(privateCoachUser._id);

    const privateCoach = await Coach.create({
      user: privateCoachUser._id,
      title: `Private Coach Hidden ${runId}`,
      sports: [pubSport._id],
      isPublic: false,
    });
    createdCoachIds.push(privateCoach._id);

    // Test 1.1: List public sports
    const resSports = await fetch1('/public/sports');
    assert(resSports.status === 200, 'GET /public/sports returns 200 OK');
    assert(
      resSports.headers.get('cache-control')?.includes('public, max-age=60') ?? false,
      'GET /public/sports sets Cache-Control header'
    );
    const sportsList = (resSports.body as { data: { slug: string }[] }).data;
    assert(
      Array.isArray(sportsList) && sportsList.some((s) => s.slug === pubSport.slug),
      'Public sports listing contains published active sport'
    );
    assert(
      !sportsList.some((s) => s.slug === inactSport.slug),
      'Inactive sport does NOT appear in /public/sports list (test e)'
    );

    // Test 1.2: Get single public sport by slug
    const resSportSlug = await fetch1(`/public/sports/${pubSport.slug}`);
    assert(resSportSlug.status === 200, 'GET /public/sports/:slug returns 200 OK');
    assert((resSportSlug.body as { data: { name: string } }).data.name === pubSport.name, 'Public sport detail matches name');

    const resInactSportSlug = await fetch1(`/public/sports/${inactSport.slug}`);
    assert(resInactSportSlug.status === 404, 'GET /public/sports/:slug returns 404 for Inactive sport (test e)');

    const resSportNotFound = await fetch1(`/public/sports/non-existent-sport-${runId}`);
    assert(resSportNotFound.status === 404, 'GET /public/sports/non-existent returns 404 Not Found');

    // Test 1.3: List public teams
    const resTeams = await fetch1('/public/teams');
    assert(resTeams.status === 200, 'GET /public/teams returns 200 OK');
    interface PublicTeamItem {
      slug: string;
      coach?: { name?: string; email?: string } | null;
      athleteCount: number;
    }
    const teamsList = (resTeams.body as { data: PublicTeamItem[] }).data;
    const lionTeam = teamsList.find((t) => t.slug === pubTeam.slug);
    assert(lionTeam !== undefined, 'Public team directory contains active lion team');
    assert(lionTeam?.coach?.name === testUsers.Coach.name, 'Public team includes coach name');
    assert(lionTeam?.coach?.email === undefined, 'Public team does NOT leak coach email');
    assert(lionTeam?.athleteCount === 0, 'Public team includes computed athlete count without leaking rosters');
    assert(
      !teamsList.some((t) => t.slug === inactTeam.slug),
      'Inactive team does NOT appear in /public/teams list (test e)'
    );

    const resInactTeamSlug = await fetch1(`/public/teams/${inactTeam.slug}`);
    assert(resInactTeamSlug.status === 404, 'GET /public/teams/:slug returns 404 for Inactive team (test e)');

    // Test 1.4: List public coaches (Correction 4: name only, no email/phone/id)
    const resCoaches = await fetch1('/public/coaches');
    assert(resCoaches.status === 200, 'GET /public/coaches returns 200 OK');
    interface PublicCoachItem {
      id: string;
      title: string;
      name?: string;
      email?: string;
      phone?: string;
    }
    const coachesList = (resCoaches.body as { data: PublicCoachItem[] }).data;
    const pubCoachItem = coachesList.find((c) => c.title === pubCoach.title);
    assert(pubCoachItem !== undefined, 'Public coach directory lists coach with isPublic=true and active user');
    assert(pubCoachItem?.name === testUsers.Coach.name, 'Coach has populated user.name');
    assert(pubCoachItem?.email === undefined && pubCoachItem?.phone === undefined, 'Coach omits user email and phone');
    assert(
      !coachesList.some((c) => c.id === privateCoach.id),
      'Coach with isPublic=false does NOT appear in /public/coaches list (test e)'
    );

    const resPrivateCoachDetail = await fetch1(`/public/coaches/${privateCoach.id}`);
    assert(resPrivateCoachDetail.status === 404, 'GET /public/coaches/:id returns 404 for isPublic=false coach (test e)');

    // Test 1.5: Deactivated coach disappears from public endpoints (Correction 4)
    testUsers.Coach.isActive = false;
    await testUsers.Coach.save();

    const resCoachesAfterDeact = await fetch1('/public/coaches');
    assert(
      !(resCoachesAfterDeact.body as { data: PublicCoachItem[] }).data.some((c) => c.title === pubCoach.title),
      'Deactivated coach immediately disappears from GET /public/coaches'
    );

    const resSingleCoachDeact = await fetch1(`/public/coaches/${pubCoach.id}`);
    assert(resSingleCoachDeact.status === 404, 'GET /public/coaches/:id returns 404 for deactivated coach');

    // Restore coach user active status
    testUsers.Coach.isActive = true;
    await testUsers.Coach.save();

    // Test 1.6: DEEP SCAN every /api/public response for forbidden keys (test e)
    const forbiddenPublicKeys = [
      'email',
      'phone',
      'dateOfBirth',
      'guardian',
      'medicalNotes',
      'passwordHash',
      'user',
      'userId',
      'refreshTokens',
    ];
    const resSingleTeam = await fetch1(`/public/teams/${pubTeam.slug}`);
    const resSingleCoach = await fetch1(`/public/coaches/${pubCoach.id}`);

    const allPublicResponses = [
      resSports.body,
      resSportSlug.body,
      resTeams.body,
      resSingleTeam.body,
      resCoaches.body,
      resSingleCoach.body,
    ];

    let leakedKeysCount = 0;
    for (const body of allPublicResponses) {
      const leaked = deepFindKeys(body, forbiddenPublicKeys);
      if (leaked.length > 0) {
        leakedKeysCount += leaked.length;
        console.error('    Leaked keys found in public response:', leaked);
      }
    }
    assert(leakedKeysCount === 0, 'DEEP SCAN: Zero forbidden keys found in all /api/public responses (test e)');

    // Test 1.7: Pagination metadata and limit=1000 clamped (test e)
    const paginationMeta = (resSports.body as { pagination: { page: number; limit: number; total: number; totalPages: number } }).pagination;
    assert(
      paginationMeta &&
      typeof paginationMeta.page === 'number' &&
      typeof paginationMeta.limit === 'number' &&
      typeof paginationMeta.total === 'number' &&
      typeof paginationMeta.totalPages === 'number',
      'GET /public/sports response contains complete pagination metadata (test e)'
    );

    const resClampedLimit = await fetch1('/public/sports?limit=1000');
    const clampedLimit = (resClampedLimit.body as { pagination: { limit: number } }).pagination.limit;
    assert(
      clampedLimit === 20 || clampedLimit <= 100,
      `GET /public/sports?limit=1000 is safely clamped (got limit=${clampedLimit} <= 100) (test e)`
    );

    console.log(`  Group 1 Request Count: ${g1.getRequestCount()} (strictly < 90)`);
    assert(g1.getRequestCount() < 90, 'Group 1 total requests strictly below 90');
    await g1.close();

    // -------------------------------------------------------------
    // GROUP 2: ADMIN CRUD, GUARDS & ROSTER ASSIGNMENT RBAC (Fresh createApp())
    // -------------------------------------------------------------
    console.log('\n--- GROUP 2: ADMIN CRUD, ENTITY GUARDS & ROSTER RBAC ---');
    const { group: g2, fetchGroup: fetch2 } = startServerGroup();

    // Test 2.1: Unauthenticated routes return 401
    const resUnauthSport = await fetch2('/sports');
    assert(resUnauthSport.status === 401, 'GET /sports unauthenticated returns 401');
    const resUnauthTeam = await fetch2('/teams');
    assert(resUnauthTeam.status === 401, 'GET /teams unauthenticated returns 401');

    // Test 2.2: Sport Admin CRUD
    const createSportRes = await fetch2('/sports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.Admin}`,
      },
      body: JSON.stringify({
        name: `Basketball Acad ${runId}`,
        description: 'Elite basketball program',
        ageGroups: ['U14', 'U16', 'U18'],
        features: ['Indoor Court'],
        status: 'Active',
      }),
    });
    assert(createSportRes.status === 201, 'POST /sports (Admin) returns 201 Created');
    const createdSportId = getDocId((createSportRes.body as { data: unknown }).data);
    createdSportIds.push(createdSportId);

    // Get sport by ID
    const getSportRes = await fetch2(`/sports/${createdSportId}`, {
      headers: { Authorization: `Bearer ${tokens.Admin}` },
    });
    assert(getSportRes.status === 200, 'GET /sports/:id returns 200 OK');
    assert((getSportRes.body as { data: { teamCount: number } }).data.teamCount === 0, 'GET /sports/:id returns teamCount');

    // Test 2.3: Team Admin CRUD
    const createTeamRes = await fetch2('/teams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.Admin}`,
      },
      body: JSON.stringify({
        name: `Tigers Basketball ${runId}`,
        sport: createdSportId.toString(),
        ageGroup: 'U16',
        season: '2026',
        coach: pubCoach.id,
      }),
    });
    assert(createTeamRes.status === 201, 'POST /teams (Admin) returns 201 Created');
    const createdTeamId = getDocId((createTeamRes.body as { data: unknown }).data);
    createdTeamIds.push(createdTeamId);

    // Test team age group rejection if not in sport.ageGroups
    const invalidAgeTeamRes = await fetch2('/teams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.Admin}`,
      },
      body: JSON.stringify({
        name: `Invalid Age Team ${runId}`,
        sport: createdSportId.toString(),
        ageGroup: 'U99', // not in U14, U16, U18
        season: '2026',
      }),
    });
    assert(invalidAgeTeamRes.status === 400, 'POST /teams rejects ageGroup not supported by sport (400)');

    // Test 2.4: Sport Deletion Guard (409 if referenced by team)
    const delSportRes = await fetch2(`/sports/${createdSportId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokens.Admin}` },
    });
    assert(delSportRes.status === 409, 'DELETE /sports/:id with active teams returns 409 Conflict');

    // Test 2.5: Coach Creation & 1:1 user profile guard
    const createCoach2Res = await fetch2('/coaches', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.Admin}`,
      },
      body: JSON.stringify({
        user: coach2User.id,
        title: 'Assistant Coach',
        sports: [createdSportId.toString()],
        specialization: 'Shooting',
        experienceYears: 5,
        isPublic: true,
      }),
    });
    assert(createCoach2Res.status === 201, 'POST /coaches creates coach profile (201)');
    const coach2ProfileId = getDocId((createCoach2Res.body as { data: unknown }).data);
    createdCoachIds.push(coach2ProfileId);

    // Duplicate profile on same user returns 409
    const dupCoachRes = await fetch2('/coaches', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.Admin}`,
      },
      body: JSON.stringify({
        user: coach2User.id,
        title: 'Duplicate Coach',
      }),
    });
    assert(dupCoachRes.status === 409, 'POST /coaches on user with existing profile returns 409 Conflict');

    // Test 2.6: Orphan Profile Protection on User Role Change (Correction 3)
    const changeRoleRes = await fetch2(`/users/${coach2User.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.Admin}`,
      },
      body: JSON.stringify({
        role: 'Athlete', // Attempting to change role away from Coach while profile exists
      }),
    });
    assert(
      changeRoleRes.status === 409,
      'PATCH /users/:id changing role away from Coach with existing profile returns 409 Conflict'
    );

    // Test 2.7: Athlete Create with linked user (Correction 5)
    // Non-athlete role user fails (400)
    const invalidUserAthleteRes = await fetch2('/athletes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.Admin}`,
      },
      body: JSON.stringify({
        dateOfBirth: '2010-01-01',
        gender: 'Male',
        sport: createdSportId.toString(),
        user: testUsers.Admin.id, // Admin role is not Athlete
      }),
    });
    assert(invalidUserAthleteRes.status === 400, 'POST /athletes rejects linking user who does not have Athlete role (400)');

    // Valid athlete with linked user
    const validAthleteRes = await fetch2('/athletes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.Admin}`,
      },
      body: JSON.stringify({
        dateOfBirth: '2010-02-17',
        gender: 'Male',
        position: 'Shooting Guard',
        sport: createdSportId.toString(),
        team: createdTeamId.toString(),
        jerseyNumber: 23,
        user: testUsers.Athlete.id,
        medicalNotes: 'Slight ankle sprain history',
      }),
    });
    assert(validAthleteRes.status === 201, 'POST /athletes creates athlete linked to Athlete user (201)');
    const athlete1Id = getDocId((validAthleteRes.body as { data: unknown }).data);
    createdAthleteIds.push(athlete1Id);

    // Duplicate link to same athlete user returns 409 (Correction 5)
    const dupAthleteLinkRes = await fetch2('/athletes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.Admin}`,
      },
      body: JSON.stringify({
        dateOfBirth: '2010-05-05',
        gender: 'Male',
        sport: createdSportId.toString(),
        user: testUsers.Athlete.id, // Already linked to athlete1
      }),
    });
    assert(dupAthleteLinkRes.status === 409, 'POST /athletes rejects user already linked to another athlete (409)');

    // Changing Athlete user's role away while profile exists returns 409 (Correction 3)
    const changeAthleteRoleRes = await fetch2(`/users/${testUsers.Athlete.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.Admin}`,
      },
      body: JSON.stringify({
        role: 'Coach',
      }),
    });
    assert(
      changeAthleteRoleRes.status === 409,
      'PATCH /users/:id changing role away from Athlete with linked profile returns 409 Conflict'
    );

    // Create an unlinked athlete (user is undefined)
    const unlinkedAthleteRes = await fetch2('/athletes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.Admin}`,
      },
      body: JSON.stringify({
        dateOfBirth: '2010-08-23',
        gender: 'Male',
        position: 'Forward',
        sport: createdSportId.toString(),
      }),
    });
    assert(unlinkedAthleteRes.status === 201, 'POST /athletes supports unlinked athlete without user account (201)');
    const unlinkedAthleteId = getDocId((unlinkedAthleteRes.body as { data: unknown }).data);
    createdAthleteIds.push(unlinkedAthleteId);

    // Test 2.8a: Unassigned athletes filter (Correction 2)
    const unassignedAthRes = await fetch2('/athletes?unassigned=true', {
      headers: { Authorization: `Bearer ${tokens.Admin}` },
    });
    assert(unassignedAthRes.status === 200, 'GET /athletes?unassigned=true returns 200 for Admin (Correction 2)');
    const unassignedAthletes = (unassignedAthRes.body as { data: Array<{ id: string; team?: unknown }> }).data;
    const hasUnlinked = unassignedAthletes.some((a) => a.id === unlinkedAthleteId.toString());
    const hasAssigned = unassignedAthletes.some((a) => a.id === athlete1Id.toString());
    assert(hasUnlinked && !hasAssigned, 'GET /athletes?unassigned=true includes athletes without a team and excludes assigned athletes (Correction 2)');

    // Test 2.8b: Teams list populates coach name and sport name safely (Correction 3)
    const teamsListRes = await fetch2('/teams', {
      headers: { Authorization: `Bearer ${tokens.Admin}` },
    });
    assert(teamsListRes.status === 200, 'GET /teams returns 200 for Admin');
    const adminTeamsList = (teamsListRes.body as { data: Array<{ sport?: { name?: string }; coach?: { user?: { name?: string; email?: string; phone?: string } } }> }).data;
    const sampleTeam = adminTeamsList.find((t) => t.coach && t.coach.user);
    assert(
      Boolean(sampleTeam?.sport?.name && sampleTeam?.coach?.user?.name),
      'GET /teams returns coach name and sport name (Correction 3)'
    );
    const forbiddenCoachUserKeys = deepFindKeys(adminTeamsList.map((t) => t.coach?.user).filter(Boolean), ['email', 'phone', 'password', 'passwordHash']);
    assert(forbiddenCoachUserKeys.length === 0, 'DEEP SCAN: coach.user in GET /teams never contains email, phone, or password (Correction 3)');

    // Test 2.8: Missing test c: Coach, Organizer, Athlete cannot PUT or DELETE /athletes/:id/team (403)
    const assignPayload = JSON.stringify({ team: createdTeamId.toString(), jerseyNumber: 50 });
    const cPut = await fetch2(`/athletes/${athlete1Id}/team`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.Coach}` },
      body: assignPayload,
    });
    assert(cPut.status === 403, 'Coach cannot PUT /athletes/:id/team (403 Forbidden) (test c)');

    const cDel = await fetch2(`/athletes/${athlete1Id}/team`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokens.Coach}` },
    });
    assert(cDel.status === 403, 'Coach cannot DELETE /athletes/:id/team (403 Forbidden) (test c)');

    const oPut = await fetch2(`/athletes/${athlete1Id}/team`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.Organizer}` },
      body: assignPayload,
    });
    assert(oPut.status === 403, 'Organizer cannot PUT /athletes/:id/team (403 Forbidden) (test c)');

    const oDel = await fetch2(`/athletes/${athlete1Id}/team`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokens.Organizer}` },
    });
    assert(oDel.status === 403, 'Organizer cannot DELETE /athletes/:id/team (403 Forbidden) (test c)');

    const aPut = await fetch2(`/athletes/${athlete1Id}/team`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.Athlete}` },
      body: assignPayload,
    });
    assert(aPut.status === 403, 'Athlete cannot PUT /athletes/:id/team (403 Forbidden) (test c)');

    const aDel = await fetch2(`/athletes/${athlete1Id}/team`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokens.Athlete}` },
    });
    assert(aDel.status === 403, 'Athlete cannot DELETE /athletes/:id/team (403 Forbidden) (test c)');

    console.log(`  Group 2 Request Count: ${g2.getRequestCount()} (strictly < 90)`);
    assert(g2.getRequestCount() < 90, 'Group 2 total requests strictly below 90');
    await g2.close();

    // -------------------------------------------------------------
    // GROUP 3: ROLE × ENDPOINT AUTHORIZATION MATRIX (Fresh createApp())
    // -------------------------------------------------------------
    console.log('\n--- GROUP 3: ROLE × ENDPOINT AUTHORIZATION MATRIX ---');
    const { group: g3, fetchGroup: fetch3 } = startServerGroup();

    // Create team 2 coached by coach 2 with athlete 2
    const team2Res = await fetch3('/teams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.Admin}`,
      },
      body: JSON.stringify({
        name: `Eagles Team 2 ${runId}`,
        sport: createdSportId.toString(),
        ageGroup: 'U16',
        season: '2026',
        coach: coach2ProfileId.toString(),
      }),
    });
    const team2Id = getDocId((team2Res.body as { data: unknown }).data);
    createdTeamIds.push(team2Id);

    const athlete2Res = await fetch3('/athletes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.Admin}`,
      },
      body: JSON.stringify({
        dateOfBirth: '2010-12-30',
        gender: 'Male',
        position: 'Small Forward',
        sport: createdSportId.toString(),
        team: team2Id.toString(),
        jerseyNumber: 6,
        user: athlete2User.id,
      }),
    });
    const athlete2Id = getDocId((athlete2Res.body as { data: unknown }).data);
    createdAthleteIds.push(athlete2Id);

    // Role x Endpoint Authorization & Scope Matrix
    const matrixActors = [
      { name: 'Admin', token: tokens.Admin },
      { name: 'Coach A', token: tokens.Coach },
      { name: 'Coach B', token: coach2Token },
      { name: 'Athlete A', token: tokens.Athlete },
      { name: 'Athlete B', token: athlete2Token },
      { name: 'Organizer', token: tokens.Organizer },
      { name: 'Anonymous', token: '' },
    ];

    const matrixEndpoints = [
      { method: 'GET', path: '/sports', body: undefined, label: 'GET /sports' },
      { method: 'POST', path: '/sports', body: { name: `Matrix Sport ${runId}`, description: 'Test matrix sport' }, label: 'POST /sports' },
      { method: 'GET', path: '/teams', body: undefined, label: 'GET /teams' },
      { method: 'POST', path: '/teams', body: { name: `Matrix Team ${runId}`, sport: createdSportId.toString(), ageGroup: 'U16', season: '2026' }, label: 'POST /teams' },
      { method: 'GET', path: '/coaches', body: undefined, label: 'GET /coaches' },
      { method: 'GET', path: '/athletes', body: undefined, label: 'GET /athletes' },
      { method: 'GET', path: `/athletes/${athlete1Id}`, body: undefined, label: 'GET /athletes/:athA' },
      { method: 'PATCH', path: `/athletes/${athlete1Id}`, body: { position: 'Forward' }, label: 'PATCH /athletes/:athA' },
    ];

    const matrixResults: { label: string; statuses: Record<string, number> }[] = [];

    for (const ep of matrixEndpoints) {
      const statuses: Record<string, number> = {};
      for (const actor of matrixActors) {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (actor.token) {
          headers.Authorization = `Bearer ${actor.token}`;
        }
        const res = await fetch3(ep.path, {
          method: ep.method,
          headers,
          body: ep.body ? JSON.stringify(ep.body) : undefined,
        });
        statuses[actor.name] = res.status;
        if (actor.name === 'Admin' && res.status === 201) {
          if (ep.path === '/sports') createdSportIds.push(getDocId((res.body as { data: unknown }).data));
          if (ep.path === '/teams') createdTeamIds.push(getDocId((res.body as { data: unknown }).data));
        }
      }
      matrixResults.push({ label: ep.label, statuses });
    }

    console.log('\n  ROLE × ENDPOINT AUTHORIZATION & SCOPE MATRIX:');
    console.log('  +-----------------------------+-------+---------+---------+-----------+-----------+-----------+-----------+');
    console.log('  | Endpoint                    | Admin | Coach A | Coach B | Athlete A | Athlete B | Organizer | Anonymous |');
    console.log('  +-----------------------------+-------+---------+---------+-----------+-----------+-----------+-----------+');
    for (const ep of matrixResults) {
      console.log(`  | ${ep.label.padEnd(27)} | ${String(ep.statuses['Admin']).padEnd(5)} | ${String(ep.statuses['Coach A']).padEnd(7)} | ${String(ep.statuses['Coach B']).padEnd(7)} | ${String(ep.statuses['Athlete A']).padEnd(9)} | ${String(ep.statuses['Athlete B']).padEnd(9)} | ${String(ep.statuses['Organizer']).padEnd(9)} | ${String(ep.statuses['Anonymous']).padEnd(9)} |`);
    }
    console.log('  +-----------------------------+-------+---------+---------+-----------+-----------+-----------+-----------+\n');

    console.log(`  Group 3 Request Count: ${g3.getRequestCount()} (strictly < 90)`);
    assert(g3.getRequestCount() < 90, 'Group 3 total requests strictly below 90');
    await g3.close();

    // -------------------------------------------------------------
    // GROUP 4: SCOPED ACCESS, PRIVACY & SELF MANAGEMENT (Fresh createApp())
    // -------------------------------------------------------------
    console.log('\n--- GROUP 4: SCOPED ACCESS, PRIVACY & SELF MANAGEMENT ---');
    const { group: g4, fetchGroup: fetch4 } = startServerGroup();

    // Test 4.1: Route role permissions
    const orgAthletesRes = await fetch4('/athletes', {
      headers: { Authorization: `Bearer ${tokens.Organizer}` },
    });
    assert(orgAthletesRes.status === 403, 'GET /athletes with Organizer role returns 403 Forbidden');

    const athleteListRes = await fetch4('/athletes', {
      headers: { Authorization: `Bearer ${tokens.Athlete}` },
    });
    assert(athleteListRes.status === 403, 'GET /athletes with Athlete role returns 403 Forbidden');

    // Test 4.2: Missing test b: Coach A GET /athletes returns ONLY Coach A's athletes
    const coachAGetList = await fetch4('/athletes', {
      headers: { Authorization: `Bearer ${tokens.Coach}` },
    });
    assert(coachAGetList.status === 200, 'Coach A GET /athletes returns 200 OK');
    interface AthleteListItem { id?: string; _id?: string }
    const coachAAthleteIds = ((coachAGetList.body as { data: AthleteListItem[] }).data || []).map(
      (a) => (a.id || a._id)!.toString()
    );
    assert(
      coachAAthleteIds.includes(athlete1Id.toString()),
      'Coach A list contains Athlete A from his team (test b)'
    );
    assert(
      !coachAAthleteIds.includes(athlete2Id.toString()),
      'Coach A list does NOT contain Athlete B from Coach B team (test b)'
    );

    const coachBGetList = await fetch4('/athletes', {
      headers: { Authorization: `Bearer ${coach2Token}` },
    });
    assert(coachBGetList.status === 200, 'Coach B GET /athletes returns 200 OK');
    const coachBAthleteIds = ((coachBGetList.body as { data: AthleteListItem[] }).data || []).map(
      (a) => (a.id || a._id)!.toString()
    );
    assert(
      coachBAthleteIds.includes(athlete2Id.toString()),
      'Coach B list contains Athlete B from his team (test b)'
    );
    assert(
      !coachBAthleteIds.includes(athlete1Id.toString()),
      'Coach B list does NOT contain Athlete A from Coach A team (test b)'
    );

    // Test 4.3: Missing test f: Athlete A GET /teams returns only his own team
    const athAGetTeams = await fetch4('/teams', {
      headers: { Authorization: `Bearer ${tokens.Athlete}` },
    });
    assert(athAGetTeams.status === 200, 'Athlete A GET /teams returns 200 OK');
    interface TeamListItem { id?: string; _id?: string }
    const athATeamIds = ((athAGetTeams.body as { data: TeamListItem[] }).data || []).map(
      (t) => (t.id || t._id)!.toString()
    );
    assert(
      athATeamIds.length === 1 && athATeamIds[0] === createdTeamId.toString(),
      `Athlete A GET /teams returns exactly his own team (${createdTeamId}) (test f)`
    );

    const athBGetTeams = await fetch4('/teams', {
      headers: { Authorization: `Bearer ${athlete2Token}` },
    });
    assert(athBGetTeams.status === 200, 'Athlete B GET /teams returns 200 OK');
    const athBTeamIds = ((athBGetTeams.body as { data: TeamListItem[] }).data || []).map(
      (t) => (t.id || t._id)!.toString()
    );
    assert(
      !athBTeamIds.includes(createdTeamId.toString()),
      'Athlete B does NOT see Athlete A team in GET /teams (test f)'
    );
    assert(
      athBTeamIds.includes(team2Id.toString()),
      'Athlete B sees his own assigned team (team 2) (test f)'
    );

    // Test 4.4: Coach scoping & IDOR prevention (Correction 2: return 404 for out-of-scope)
    const coach1GetAth1 = await fetch4(`/athletes/${athlete1Id}`, {
      headers: { Authorization: `Bearer ${tokens.Coach}` },
    });
    assert(coach1GetAth1.status === 200, 'Coach accessing athlete in their coached team returns 200 OK');

    const coach1GetAth2 = await fetch4(`/athletes/${athlete2Id}`, {
      headers: { Authorization: `Bearer ${tokens.Coach}` },
    });
    assert(
      coach1GetAth2.status === 404,
      'Coach accessing athlete NOT in their team returns 404 (does not reveal record exists)'
    );

    const coach1PatchAth2 = await fetch4(`/athletes/${athlete2Id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.Coach}`,
      },
      body: JSON.stringify({ position: 'Center' }),
    });
    assert(
      coach1PatchAth2.status === 404,
      'Coach modifying athlete NOT in their team returns 404'
    );

    // Test 4.5: Athlete IDOR prevention (Correction 2)
    const ath1GetAth2 = await fetch4(`/athletes/${athlete2Id}`, {
      headers: { Authorization: `Bearer ${tokens.Athlete}` },
    });
    assert(
      ath1GetAth2.status === 404,
      'Athlete accessing another athlete record returns 404 (Correction 2)'
    );

    // Test 4.6: Athlete self profile & strict schema validation (Missing test a)
    const athSelfMe = await fetch4('/athletes/me', {
      headers: { Authorization: `Bearer ${tokens.Athlete}` },
    });
    assert(athSelfMe.status === 200, 'Athlete accessing GET /athletes/me returns 200 OK');

    // Forbidden fields on PATCH /athletes/me return 400 each (test a)
    const forbiddenSelfPatchFields = [
      { name: 'team', payload: { team: team2Id.toString() } },
      { name: 'status', payload: { status: 'Inactive' } },
      { name: 'verificationStatus', payload: { verificationStatus: 'Verified' } },
      { name: 'jerseyNumber', payload: { jerseyNumber: 77 } },
      { name: 'medicalNotes', payload: { medicalNotes: 'Confidential hacker data' } },
    ];

    for (const testField of forbiddenSelfPatchFields) {
      const resForbiddenPatch = await fetch4('/athletes/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.Athlete}`,
        },
        body: JSON.stringify(testField.payload),
      });
      assert(
        resForbiddenPatch.status === 400,
        `Athlete A PATCH /athletes/me with "${testField.name}" returns 400 (strict schema) (test a)`
      );
    }

    // Allowed fields on PATCH /athletes/me work (test a)
    const resAllowedPatch = await fetch4('/athletes/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.Athlete}`,
      },
      body: JSON.stringify({ heightCm: 198, weightKg: 98, position: 'Small Forward' }),
    });
    assert(resAllowedPatch.status === 200, 'Athlete A PATCH /athletes/me with allowed fields returns 200 OK (test a)');

    // Coach self routes
    const coachSelfRes = await fetch4('/coaches/me', {
      headers: { Authorization: `Bearer ${tokens.Coach}` },
    });
    assert(coachSelfRes.status === 200, 'Coach accessing GET /coaches/me returns 200 OK');

    const coachUpdateSelfRes = await fetch4('/coaches/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.Coach}`,
      },
      body: JSON.stringify({ bio: 'Experienced youth trainer' }),
    });
    assert(coachUpdateSelfRes.status === 200, 'Coach updating PATCH /coaches/me returns 200 OK');

    // Test 4.7: Missing test d: medicalNotes privacy assertions across responses
    const adminSingleAth1 = await fetch4(`/athletes/${athlete1Id}`, {
      headers: { Authorization: `Bearer ${tokens.Admin}` },
    });
    assert(
      (adminSingleAth1.body as { data: { medicalNotes?: string } }).data?.medicalNotes === 'Slight ankle sprain history',
      'medicalNotes present on Admin single GET /athletes/:id (test d)'
    );

    const adminListAthletes = await fetch4('/athletes', {
      headers: { Authorization: `Bearer ${tokens.Admin}` },
    });

    const adminPatchAth1 = await fetch4(`/athletes/${athlete1Id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.Admin}`,
      },
      body: JSON.stringify({ position: 'Power Forward' }),
    });
    assert(adminPatchAth1.status === 200, 'Admin PATCH /athletes/:id returns 200 OK');

    const teamRosterRes = await fetch4(`/teams/${createdTeamId}/roster`, {
      headers: { Authorization: `Bearer ${tokens.Admin}` },
    });

    assert(
      deepFindKeys(athSelfMe.body, ['medicalNotes']).length === 0,
      'medicalNotes absent in Athlete GET /athletes/me (deep scan) (test d)'
    );
    assert(
      deepFindKeys(coachAGetList.body, ['medicalNotes']).length === 0,
      'medicalNotes absent in Coach GET /athletes list (deep scan) (test d)'
    );
    assert(
      deepFindKeys(adminListAthletes.body, ['medicalNotes']).length === 0,
      'medicalNotes absent in Admin GET /athletes LIST (deep scan) (test d)'
    );
    assert(
      deepFindKeys(teamRosterRes.body, ['medicalNotes']).length === 0,
      'medicalNotes absent in team roster response (deep scan) (test d)'
    );
    assert(
      deepFindKeys(adminPatchAth1.body, ['medicalNotes']).length === 0,
      'medicalNotes absent in Admin PATCH response on athlete (deep scan) (test d)'
    );

    console.log(`  Group 4 Request Count: ${g4.getRequestCount()} (strictly < 90)`);
    assert(g4.getRequestCount() < 90, 'Group 4 total requests strictly below 90');
    await g4.close();

    // -------------------------------------------------------------
    // GROUP 5: ROSTER, VERIFICATION, AUDIT & SOFT DELETION (Fresh createApp())
    // -------------------------------------------------------------
    console.log('\n--- GROUP 5: ROSTER, VERIFICATION, AUDIT & SOFT DEACTIVATION ---');
    const { group: g5, fetchGroup: fetch5 } = startServerGroup();

    // Test 5.1: Assign team to unlinked athlete
    const assignTeamRes = await fetch5(`/athletes/${unlinkedAthleteId}/team`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.Admin}`,
      },
      body: JSON.stringify({
        team: createdTeamId.toString(),
        jerseyNumber: 24, // unlinked athlete gets #24
      }),
    });
    assert(assignTeamRes.status === 200, 'PUT /athletes/:id/team assigns athlete to team (200)');

    // Test jersey number collision in same team returns 409
    const collisionJerseyRes = await fetch5(`/athletes/${athlete2Id}/team`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.Admin}`,
      },
      body: JSON.stringify({
        team: createdTeamId.toString(),
        jerseyNumber: 23, // Already taken by athlete1
      }),
    });
    assert(collisionJerseyRes.status === 409, 'Assigning duplicate jersey number in same team returns 409 Conflict');

    // Test 5.2: Verification Status Update (Admin only)
    const verifCoachRes = await fetch5(`/athletes/${athlete1Id}/verification`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.Coach}`,
      },
      body: JSON.stringify({ verificationStatus: 'Verified' }),
    });
    assert(verifCoachRes.status === 403, 'Coach updating athlete verification returns 403 Forbidden');

    const verifAdminRes = await fetch5(`/athletes/${athlete1Id}/verification`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.Admin}`,
      },
      body: JSON.stringify({
        verificationStatus: 'Verified',
        documents: ['https://cdn.athletiq.test/docs/passport.pdf'],
      }),
    });
    assert(verifAdminRes.status === 200, 'Admin updating athlete verification returns 200 OK');
    assert((verifAdminRes.body as { data: { verificationStatus: string } }).data.verificationStatus === 'Verified', 'Verification status updated to Verified');

    // Test 5.3: Unassign athlete from team
    const unassignRes = await fetch5(`/athletes/${unlinkedAthleteId}/team`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokens.Admin}` },
    });
    assert(unassignRes.status === 200, 'DELETE /athletes/:id/team unassigns athlete from team');

    // Test 5.4: Soft delete athlete (DELETE /athletes/:id)
    const softDelRes = await fetch5(`/athletes/${unlinkedAthleteId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokens.Admin}` },
    });
    assert(softDelRes.status === 200, 'DELETE /athletes/:id soft-deactivates athlete');
    const deactAth = await Athlete.findById(unlinkedAthleteId);
    assert(deactAth?.status === 'Inactive', 'Athlete status set to Inactive (soft deactivation)');

    // Test 5.5: Missing test h: Assert audit log trail and deep scan meta
    const testEntityIds = [
      ...createdUserIds,
      ...createdSportIds,
      ...createdTeamIds,
      ...createdCoachIds,
      ...createdAthleteIds,
    ];

    const auditEntries = await AuditLog.find({
      $or: [{ actor: { $in: createdUserIds } }, { targetId: { $in: testEntityIds } }],
    });

    const requiredActions = [
      'SPORT_CREATED',
      'TEAM_CREATED',
      'COACH_CREATED',
      'ATHLETE_CREATED',
      'ATHLETE_TEAM_ASSIGNED',
      'ATHLETE_VERIFICATION_UPDATED',
    ];

    for (const action of requiredActions) {
      const exists = auditEntries.some((entry) => entry.action === action);
      assert(exists, `Audit log entry exists for "${action}" (test h)`);
    }

    const forbiddenAuditMetaKeys = ['medicalNotes', 'phone', 'email', 'password', 'passwords', 'passwordHash'];
    let leakedAuditMetaCount = 0;
    for (const entry of auditEntries) {
      if (entry.meta) {
        const found = deepFindKeys(entry.meta, forbiddenAuditMetaKeys);
        if (found.length > 0) {
          leakedAuditMetaCount += found.length;
          console.error(`    Audit log [${entry.action}] meta leaked:`, found);
        }
      }
    }
    assert(
      leakedAuditMetaCount === 0,
      'DEEP SCAN: No audit meta contains medicalNotes, phone, email, or passwords (test h)'
    );

    console.log(`  Group 5 Request Count: ${g5.getRequestCount()} (strictly < 90)`);
    assert(g5.getRequestCount() < 90, 'Group 5 total requests strictly below 90');
    await g5.close();

    // -------------------------------------------------------------
    // GROUP 6: INJECTION, MALFORMED IDS, REGEX SEARCH & RACES (Fresh createApp())
    // -------------------------------------------------------------
    console.log('\n--- GROUP 6: INJECTION, MALFORMED IDS, REGEX SEARCH & RACES ---');
    const { group: g6, fetchGroup: fetch6 } = startServerGroup();

    // Test 6.1: Missing test g: NoSQL injection in body and query
    // Injection in body: {"$ne": ...}
    const bodyInjectionRes = await fetch6('/sports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.Admin}`,
      },
      body: JSON.stringify({
        $ne: 'injection',
        name: `Injection Sport ${runId}`,
      }),
    });
    assert(bodyInjectionRes.status === 400, 'POST /sports with {"$ne": ...} in body rejected with 400 (never 500) (test g)');

    // Injection in query: ?name[$ne]=x
    const queryInjectionSport = await fetch6('/sports?name[$ne]=Football', {
      headers: { Authorization: `Bearer ${tokens.Admin}` },
    });
    assert(queryInjectionSport.status === 400, 'GET /sports?name[$ne]=x rejected with 400 (never 500) (test g)');

    const queryInjectionTeam = await fetch6('/teams?name[$ne]=Lions', {
      headers: { Authorization: `Bearer ${tokens.Admin}` },
    });
    assert(queryInjectionTeam.status === 400, 'GET /teams?name[$ne]=x rejected with 400 (never 500) (test g)');

    const queryInjectionAth = await fetch6('/athletes?status[$ne]=Active', {
      headers: { Authorization: `Bearer ${tokens.Admin}` },
    });
    assert(queryInjectionAth.status === 400, 'GET /athletes?status[$ne]=x rejected with 400 (never 500) (test g)');

    // Test 6.2: Malformed IDs on routes
    const malformedSport = await fetch6('/sports/malformed-id-12345', {
      headers: { Authorization: `Bearer ${tokens.Admin}` },
    });
    assert(
      malformedSport.status === 404 || malformedSport.status === 400,
      `GET /sports/malformed-id returns ${malformedSport.status} (never 500) (test g)`
    );

    const malformedCoach = await fetch6('/coaches/not-a-valid-object-id', {
      headers: { Authorization: `Bearer ${tokens.Admin}` },
    });
    assert(malformedCoach.status === 400, 'GET /coaches/malformed-id returns 400 via validateObjectId (test g)');

    const malformedAthlete = await fetch6('/athletes/not-a-valid-object-id', {
      headers: { Authorization: `Bearer ${tokens.Admin}` },
    });
    assert(malformedAthlete.status === 400, 'GET /athletes/malformed-id returns 400 via validateObjectId (test g)');

    const malformedPublicCoach = await fetch6('/public/coaches/not-a-valid-object-id');
    assert(malformedPublicCoach.status === 404, 'GET /public/coaches/malformed-id returns 404 (never 500) (test g)');

    // Test 6.3: Regex search "a.*" is safe on new routes
    const regexSportSearch = await fetch6('/public/sports?search=a.*');
    assert(regexSportSearch.status === 200, 'GET /public/sports?search=a.* handled safely (200 OK, never 500) (test g)');

    const regexTeamSearch = await fetch6('/teams?search=a.*', {
      headers: { Authorization: `Bearer ${tokens.Admin}` },
    });
    assert(regexTeamSearch.status === 200, 'GET /teams?search=a.* handled safely (200 OK, never 500) (test g)');

    const regexAthSearch = await fetch6('/athletes?search=a.*', {
      headers: { Authorization: `Bearer ${tokens.Admin}` },
    });
    assert(regexAthSearch.status === 200, 'GET /athletes?search=a.* handled safely (200 OK, never 500) (test g)');

    // Test 6.4: HTTPS URL validation
    const insecureIconRes = await fetch6('/sports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.Admin}`,
      },
      body: JSON.stringify({
        name: `Insecure Icon Sport ${runId}`,
        description: 'Test sport with insecure http image',
        icon: 'http://insecure.test/icon.png',
      }),
    });
    assert(insecureIconRes.status === 400, 'POST /sports rejects non-https icon URL (400)');

    // Test 6.5: Strict schema rejection of unknown fields
    const unknownFieldRes = await fetch6('/sports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.Admin}`,
      },
      body: JSON.stringify({
        name: `Unknown Field Sport ${runId}`,
        description: 'Testing .strict() validation',
        hackerField: 'Malicious payload',
      }),
    });
    assert(unknownFieldRes.status === 400, 'POST /sports rejects unknown fields with .strict() (400)');

    // Test 6.6: Parallel race test: Sport slug generation with same name (Correction 6)
    console.log('  * Executing parallel sport creation with identical name (Promise.all)...');
    const identicalSportName = `Parallel Racing Sport ${runId}`;
    const [pSport1, pSport2] = await Promise.all([
      fetch6('/sports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.Admin}`,
        },
        body: JSON.stringify({
          name: identicalSportName,
          description: 'Racing slug sport A',
        }),
      }),
      fetch6('/sports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.Admin}`,
        },
        body: JSON.stringify({
          name: identicalSportName,
          description: 'Racing slug sport B',
        }),
      }),
    ]);

    const sportStatuses = [pSport1.status, pSport2.status].sort();
    assert(
      sportStatuses[0] === 201 && sportStatuses[1] === 409,
      `Parallel sports with same name: exactly one succeeded (201) and one rejected with 409 (no 500 error)`
    );
    if (pSport1.status === 201) createdSportIds.push(getDocId((pSport1.body as { data: unknown }).data));
    if (pSport2.status === 201) createdSportIds.push(getDocId((pSport2.body as { data: unknown }).data));

    const sportsInDb = await Sport.find({ name: identicalSportName });
    assert(sportsInDb.length === 1, 'Parallel sports race: verified 0 duplicates in database (count === 1)');

    // Test slug auto-retry on duplicate slug key (different name, colliding base slug)
    const sportWithCollidingSlug = await fetch6('/sports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.Admin}`,
      },
      body: JSON.stringify({
        name: `${identicalSportName}!`,
        description: 'Sport triggering slug collision retry',
      }),
    });
    assert(sportWithCollidingSlug.status === 201, 'POST /sports with colliding base slug retries and succeeds (201)');
    const createdSlug = (sportWithCollidingSlug.body as { data: { slug: string } }).data.slug;
    assert(
      createdSlug.endsWith('-2'),
      `Slug collision retry appended unique suffix: ${createdSlug}`
    );
    createdSportIds.push(getDocId((sportWithCollidingSlug.body as { data: unknown }).data));

    // Test 6.7: Parallel race test: Two athletes with same jersey in same team (Correction 6)
    console.log('  * Executing parallel athlete creation with identical jersey in same team (Promise.all)...');
    const [pAth1, pAth2] = await Promise.all([
      fetch6('/athletes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.Admin}`,
        },
        body: JSON.stringify({
          position: 'Storm Alpha',
          dateOfBirth: '2010-04-01',
          gender: 'Female',
          sport: createdSportId.toString(),
          team: team2Id.toString(),
          jerseyNumber: 99,
        }),
      }),
      fetch6('/athletes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.Admin}`,
        },
        body: JSON.stringify({
          position: 'Storm Beta',
          dateOfBirth: '2010-04-02',
          gender: 'Female',
          sport: createdSportId.toString(),
          team: team2Id.toString(),
          jerseyNumber: 99,
        }),
      }),
    ]);

    const statuses = [pAth1.status, pAth2.status].sort();
    assert(
      statuses[0] === 201 && statuses[1] === 409,
      `Parallel identical jersey race: exactly one succeeded (201) and one rejected with 409 (got ${pAth1.status} and ${pAth2.status}), no 500`
    );

    if (pAth1.status === 201) createdAthleteIds.push(getDocId((pAth1.body as { data: unknown }).data));
    if (pAth2.status === 201) createdAthleteIds.push(getDocId((pAth2.body as { data: unknown }).data));

    const jerseysInDb = await Athlete.find({ team: team2Id, jerseyNumber: 99 });
    assert(jerseysInDb.length === 1, 'Parallel athletes race: verified 0 duplicates in database (count === 1)');

    console.log(`  Group 6 Request Count: ${g6.getRequestCount()} (strictly < 90)`);
    assert(g6.getRequestCount() < 90, 'Group 6 total requests strictly below 90');
    await g6.close();
  } catch (err: unknown) {
    console.error('Unexpected error during verification:', err);
    failed++;
  } finally {
    console.log('\n--- CLEANING UP VERIFICATION RESOURCES ---');

    // Delete created athletes
    if (createdAthleteIds.length > 0) {
      await Athlete.deleteMany({ _id: { $in: createdAthleteIds } });
    }
    // Delete created teams
    if (createdTeamIds.length > 0) {
      await Team.deleteMany({ _id: { $in: createdTeamIds } });
    }
    // Delete created coaches
    if (createdCoachIds.length > 0) {
      await Coach.deleteMany({ _id: { $in: createdCoachIds } });
    }
    // Delete created sports
    if (createdSportIds.length > 0) {
      await Sport.deleteMany({ _id: { $in: createdSportIds } });
    }
    // Delete created users
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    // Delete ONLY audit logs created about IDs this script created
    const testIds = [
      ...createdUserIds,
      ...createdSportIds,
      ...createdTeamIds,
      ...createdCoachIds,
      ...createdAthleteIds,
    ];
    if (testIds.length > 0) {
      await AuditLog.deleteMany({
        $or: [{ actor: { $in: createdUserIds } }, { targetId: { $in: testIds } }],
      });
    }

    // Verify database counts restored
    const finalUserCount = await User.countDocuments();
    const finalSportCount = await Sport.countDocuments();
    const finalTeamCount = await Team.countDocuments();
    const finalCoachCount = await Coach.countDocuments();
    const finalAthleteCount = await Athlete.countDocuments();
    const finalAuditCount = await AuditLog.countDocuments();

    console.log('Database state after test:');
    console.log(`  Users = ${finalUserCount}`);
    console.log(`  Sports = ${finalSportCount}`);
    console.log(`  Teams = ${finalTeamCount}`);
    console.log(`  Coaches = ${finalCoachCount}`);
    console.log(`  Athletes = ${finalAthleteCount}`);
    console.log(`  AuditLogs = ${finalAuditCount}\n`);

    assert(finalUserCount === initialUserCount, `User count restored (${finalUserCount} === ${initialUserCount})`);
    assert(finalSportCount === initialSportCount, `Sport count restored (${finalSportCount} === ${initialSportCount})`);
    assert(finalTeamCount === initialTeamCount, `Team count restored (${finalTeamCount} === ${initialTeamCount})`);
    assert(finalCoachCount === initialCoachCount, `Coach count restored (${finalCoachCount} === ${initialCoachCount})`);
    assert(finalAthleteCount === initialAthleteCount, `Athlete count restored (${finalAthleteCount} === ${initialAthleteCount})`);
    assert(finalAuditCount === initialAuditCount, `AuditLog count restored (${finalAuditCount} === ${initialAuditCount})`);

    await mongoose.disconnect();
    console.log('ℹ️  MongoDB disconnected.');
  }

  console.log('\n========================================');
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log(`Total HTTP Requests Executed: ${totalHttpRequests}`);
  console.log('Note on rate limit: Total requests exceed 100 because each group uses its own createApp() with an independent in-memory rate limiter.');
  console.log(`Total Failed /api/auth HTTP Requests: ${failedAuthHttpCount} (strictly <= 8)`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
