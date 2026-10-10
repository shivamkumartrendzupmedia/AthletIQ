import { Types } from 'mongoose';
import {
  User,
  Sport,
  Team,
  Coach,
  Athlete,
  TrainingSession,
  Attendance,
  AcademyDocument,
  Announcement,
} from '../src/models/index.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string): void {
  if (condition) {
    console.log(`  ✓ PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${description}`);
    failed++;
  }
}

console.log('\n--- VERIFYING MONGOOSE MODELS IN-MEMORY ---\n');

// 1. Model Validation: Valid Documents
console.log('1. Valid document instantiation & validateSync():');

const dummyUserId = new Types.ObjectId();
const dummySportId = new Types.ObjectId();
const dummyCoachId = new Types.ObjectId();
const dummyTeamId = new Types.ObjectId();
const dummyAthleteId = new Types.ObjectId();
const dummySessionId = new Types.ObjectId();

// User
const validUser = new User({
  name: 'Marcus Rashford',
  email: 'marcus@athletiq.test',
  passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
  role: 'Athlete',
});
assert(validUser.validateSync() === undefined, 'User passes validateSync()');

// Sport
const validSport = new Sport({
  name: 'Football',
  slug: 'football',
  category: 'Team',
  description: 'Full pitch 11v11 competitive football development program.',
  shortDescription: 'High performance football training',
  ageGroups: ['U14', 'U16', 'U18', 'Senior'],
});
assert(validSport.validateSync() === undefined, 'Sport passes validateSync()');

// Coach
const validCoach = new Coach({
  user: dummyUserId,
  title: 'Head Coach',
  specialization: 'Tactical Formations',
  specialties: ['High Press', 'Set Pieces'],
  sports: [dummySportId],
  experienceYears: 12,
  achievements: ['National Championship 2024'],
  certifications: [{ name: 'UEFA A License', issuer: 'UEFA', year: 2020 }],
});
assert(validCoach.validateSync() === undefined, 'Coach passes validateSync()');

// Team
const validTeam = new Team({
  name: 'U18 Elite Squad',
  slug: 'u18-elite-squad',
  sport: dummySportId,
  headCoach: dummyCoachId,
  ageGroup: 'U18',
  season: '2025/2026',
});
assert(validTeam.validateSync() === undefined, 'Team passes validateSync()');

// Athlete
const validAthlete = new Athlete({
  user: dummyUserId,
  sport: dummySportId,
  team: dummyTeamId,
  dateOfBirth: new Date('2006-05-15'),
  position: 'Forward',
  jerseyNumber: 9,
  status: 'Active',
  verificationStatus: 'Verified',
  medicalClearance: true,
  guardian: {
    name: 'Robert Rashford',
    phone: '+44 7700 900077',
    email: 'robert@family.test',
  },
});
assert(validAthlete.validateSync() === undefined, 'Athlete passes validateSync()');

// TrainingSession
const sessionStarts = new Date('2026-10-10T10:00:00Z');
const sessionEnds = new Date('2026-10-10T12:00:00Z');
const validSession = new TrainingSession({
  team: dummyTeamId,
  sport: dummySportId,
  coach: dummyCoachId,
  title: 'Morning Conditioning & Tactics',
  type: 'Training',
  startsAt: sessionStarts,
  endsAt: sessionEnds,
  venue: 'Main Pitch A, North Complex',
});
assert(validSession.validateSync() === undefined, 'TrainingSession passes validateSync()');

// Attendance
const validAttendance = new Attendance({
  session: dummySessionId,
  athlete: dummyAthleteId,
  status: 'Present',
  markedBy: dummyUserId,
});
assert(validAttendance.validateSync() === undefined, 'Attendance passes validateSync()');

// Document
const validDoc = new AcademyDocument({
  title: 'Season Waiver 2025',
  category: 'Policy',
  file: {
    originalName: 'waiver-001.pdf',
    storedName: 'waiver-001-uuid.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
  },
  visibility: 'Public',
  uploadedBy: dummyUserId,
});
assert(validDoc.validateSync() === undefined, 'Document passes validateSync()');

// Announcement
const validAnnouncement = new Announcement({
  title: 'Mid-Season Trials Announcement',
  body: 'Trials for U18 will be held next Saturday at Pitch B.',
  createdBy: dummyUserId,
  audience: 'Public',
});
assert(validAnnouncement.validateSync() === undefined, 'Announcement passes validateSync()');

// 2. Validation Failures (Invalid inputs caught)
console.log('\n2. Validation Rejections:');

const invalidEmailUser = new User({
  name: 'Test',
  email: 'not-an-email',
  passwordHash: 'hash123',
  role: 'Athlete',
});
const emailErr = invalidEmailUser.validateSync();
assert(emailErr?.errors['email'] !== undefined, 'User rejects invalid email address format');

const invalidRoleUser = new User({
  name: 'Test',
  email: 'test@athletiq.test',
  passwordHash: 'hash123',
  role: 'NonExistentRole' as any,
});
const roleErr = invalidRoleUser.validateSync();
assert(roleErr?.errors['role'] !== undefined, 'User rejects invalid role enum value');

const invalidAthleteStatus = new Athlete({
  sport: dummySportId,
  status: 'InvalidStatus' as any,
});
const statusErr = invalidAthleteStatus.validateSync();
assert(statusErr?.errors['status'] !== undefined, 'Athlete rejects invalid status enum');

const invalidSessionTimes = new TrainingSession({
  team: dummyTeamId,
  sport: dummySportId,
  coach: dummyCoachId,
  title: 'Invalid Timing',
  startsAt: new Date('2026-10-10T14:00:00Z'),
  endsAt: new Date('2026-10-10T12:00:00Z'), // ends before start
});
const timeErr = invalidSessionTimes.validateSync();
assert(timeErr?.errors['endsAt'] !== undefined, 'TrainingSession rejects endsAt <= startsAt');

// 3. User toJSON security & sensitive field stripping
console.log('\n3. User toJSON Security:');
const sensitiveUser = new User({
  name: 'Security Test',
  email: 'security@athletiq.test',
  passwordHash: '$2b$10$supersecretstringshouldneverleak',
  refreshTokens: ['token_abc_123', 'token_def_456'],
  role: 'Admin',
});
const userJson = sensitiveUser.toJSON();
assert(userJson.passwordHash === undefined, 'User.toJSON() strips passwordHash');
assert(userJson.refreshTokens === undefined, 'User.toJSON() strips refreshTokens');
assert(userJson._id === undefined && userJson.id !== undefined, 'User.toJSON() converts _id to string id');

// 4. Clarification 1: Two athletes without `user` link
console.log('\n4. Clarification 1 — Optional Athlete.user and Non-Colliding Unlinked Athletes:');
const unlinkedAthlete1 = new Athlete({
  sport: dummySportId,
  team: dummyTeamId,
  jerseyNumber: 10,
  status: 'Active',
  verificationStatus: 'Verified',
});
const unlinkedAthlete2 = new Athlete({
  sport: dummySportId,
  team: dummyTeamId,
  jerseyNumber: 11,
  status: 'Trial',
  verificationStatus: 'Pending ID',
});
assert(unlinkedAthlete1.validateSync() === undefined, 'Unlinked Athlete #1 (user undefined) passes validateSync()');
assert(unlinkedAthlete2.validateSync() === undefined, 'Unlinked Athlete #2 (user undefined) passes validateSync()');

// Coach.user is strictly required
const coachWithoutUser = new Coach({
  title: 'Coach Without User',
  experienceYears: 5,
});
const coachErr = coachWithoutUser.validateSync();
assert(coachErr?.errors['user'] !== undefined, 'Coach requires user link (validation fails if missing)');

// 5. Clarification 2: Athlete virtual `age` computation and toJSON virtuals
console.log('\n5. Clarification 2 — Athlete Computed Age and toJSON Output:');
const testDob = new Date('2008-01-15');
const athleteWithAge = new Athlete({
  sport: dummySportId,
  dateOfBirth: testDob,
  status: 'Active',
});

// Calculate expected age dynamically relative to current date
const expectedAge = (() => {
  const today = new Date();
  let age = today.getFullYear() - testDob.getFullYear();
  const m = today.getMonth() - testDob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < testDob.getDate())) {
    age--;
  }
  return age;
})();

assert(athleteWithAge.age === expectedAge, `Athlete virtual getter returns correct age (${athleteWithAge.age})`);
const athleteJson = athleteWithAge.toJSON();
assert(athleteJson.age === expectedAge, `Athlete.toJSON() includes virtual 'age' (${athleteJson.age})`);
assert(athleteJson.medicalNotes === undefined, 'Athlete.toJSON() strips private medicalNotes');

// 6. Schema Index Specifications Verification
console.log('\n6. Schema Index Specifications:');
const athleteIndexes = Athlete.schema.indexes();

// Check partial unique index on { user: 1 }
const userPartialIndex = athleteIndexes.find(
  ([spec, opts]) => spec.user === 1 && opts?.unique === true && opts?.partialFilterExpression?.user?.$type === 'objectId'
);
assert(userPartialIndex !== undefined, 'Athlete has unique index on { user: 1 } with partialFilterExpression for objectId');

// Check partial compound unique index on { team: 1, jerseyNumber: 1 }
const jerseyIndex = athleteIndexes.find(
  ([spec, opts]) => spec.team === 1 && spec.jerseyNumber === 1 && opts?.unique === true && opts?.partialFilterExpression?.team?.$type === 'objectId' && opts?.partialFilterExpression?.jerseyNumber?.$type === 'number'
);
assert(jerseyIndex !== undefined, 'Athlete has compound unique index on (team, jerseyNumber) with partialFilterExpression');

// Check Attendance compound unique index on { session: 1, athlete: 1 }
const attendanceIndexes = Attendance.schema.indexes();
const attendanceUniqueIndex = attendanceIndexes.find(
  ([spec, opts]) => spec.session === 1 && spec.athlete === 1 && opts?.unique === true
);
assert(attendanceUniqueIndex !== undefined, 'Attendance has compound unique index on (session, athlete)');

// Check TrainingSession compound index on { team: 1, startsAt: 1 }
const sessionIndexes = TrainingSession.schema.indexes();
const sessionTeamTimeIndex = sessionIndexes.find(
  ([spec]) => spec.team === 1 && spec.startsAt === 1
);
assert(sessionTeamTimeIndex !== undefined, 'TrainingSession has compound index on (team, startsAt)');

// Check Coach user unique index
const coachUserPath = Coach.schema.path('user');
assert((coachUserPath as any)?._index?.unique === true || (coachUserPath as any)?.options?.unique === true, 'Coach.user is defined with field-level unique: true');

console.log(`\n========================================`);
console.log(`Summary: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All model validations and schema index assertions passed successfully!');
  process.exit(0);
}
