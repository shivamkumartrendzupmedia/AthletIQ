# STEP 8A REVIEW: Tournaments Backend Implementation

## 1. Overview & Architecture
This step implements the complete backend domain for Tournaments, including:
- **Tournament**: Organizer lifecycle management from Draft through Registration Open, In Progress, and Completed / Cancelled.
- **TournamentTeam**: Team registration and roster assignment with atomic `maxTeams` validation and unique compound index `(tournament, team)`.
- **Venue & Official**: Venue facilities and match officials management with deletion protection against referenced matches.
- **Match**: Tournament fixtures scheduling with interval overlap checking (Venue, Home/Away Team, Referee) and score/result reporting.
- **Public API**: Sanitized endpoints for unauthenticated consumption omitting sensitive user IDs, reasons, and athlete profiles.

---

## 2. Models & Index Specifications
1. **Tournament (`Tournament.ts`)**:
   - `name`: string (1-150 chars)
   - `sport`: ObjectId (ref Sport)
   - `category`: string (1-50 chars)
   - `ageGroup`: string (1-20 chars)
   - `format`: enum ('League', 'Knockout')
   - `startDate`: Date
   - `endDate`: Date (validated >= startDate)
   - `rules`: optional string (max 2000 chars)
   - `maxTeams`: optional integer (2-64)
   - `approvedTeamsCount`: integer (atomic counter, default 0)
   - `status`: enum ('Draft', 'Registration Open', 'In Progress', 'Completed', 'Cancelled')
   - `organizer`: ObjectId (ref User, populated from JWT session)
   - Indexes: `{ sport: 1, status: 1 }`, `{ organizer: 1 }`

2. **TournamentTeam (`TournamentTeam.ts`)**:
   - `tournament`: ObjectId (ref Tournament)
   - `team`: ObjectId (ref Team)
   - `status`: enum ('Pending', 'Approved', 'Rejected')
   - `reason`: optional string (max 500 chars; required when Rejected)
   - `squad`: array of ObjectIds (ref Athlete, max 30)
   - `registeredBy`: ObjectId (ref User)
   - `reviewedBy`: optional ObjectId (ref User)
   - `reviewedAt`: optional Date
   - **Unique Index**: `{ tournament: 1, team: 1 }` (guarantees single registration per team even under concurrent storms)

3. **Venue (`Venue.ts`)**:
   - `name`: string (1-120 chars)
   - `address`: string (1-250 chars)
   - `capacity`: optional integer (>= 0)
   - `createdBy`: ObjectId (ref User)
   - `active`: boolean (default true)
   - Index: `{ createdBy: 1, active: 1 }`

4. **Official (`Official.ts`)**:
   - `name`: string (1-100 chars)
   - `type`: enum ('Referee', 'Assistant Referee', 'Scorer')
   - `createdBy`: ObjectId (ref User)
   - `active`: boolean (default true)
   - No contact details stored.
   - Index: `{ createdBy: 1, type: 1 }`

5. **Match (`Match.ts`)**:
   - `tournament`: ObjectId (ref Tournament)
   - `homeTeam`: ObjectId (ref TournamentTeam, must be Approved)
   - `awayTeam`: ObjectId (ref TournamentTeam, must be Approved, different from homeTeam)
   - `round`: string (1-40 chars)
   - `group`: optional string (max 20 chars)
   - `scheduledAt`: Date
   - `durationMinutes`: integer (30-240, default 90)
   - `endsAt`: Date (computed: scheduledAt + durationMinutes)
   - `venue`: ObjectId (ref Venue)
   - `referee`: optional ObjectId (ref Official)
   - `status`: enum ('Scheduled', 'Completed', 'Cancelled')
   - `result`: object { homeScore, awayScore (0-99), enteredBy, enteredAt } or null
   - Indexes: `{ tournament: 1, scheduledAt: 1 }`, `{ venue: 1, scheduledAt: 1, endsAt: 1 }`, `{ referee: 1, scheduledAt: 1, endsAt: 1 }`

---

## 3. Concurrency & Integrity Mechanics
- **MaxTeams Atomic Enforcement**:
  Uses an atomic conditional increment on the Tournament document:
  ```ts
  const tournament = await Tournament.findOneAndUpdate(
    {
      _id: tournamentId,
      $or: [
        { maxTeams: { $exists: false } },
        { maxTeams: null },
        { $expr: { $lt: ['$approvedTeamsCount', '$maxTeams'] } }
      ]
    },
    { $inc: { approvedTeamsCount: 1 } },
    { new: true }
  );
  ```
  If null, max limit is reached (400). If approved registration is subsequently modified or rejected, counter is atomically decremented.
- **Interval Query Window Pattern (Reused from Training Sessions)**:
  Collision check verifies that no non-cancelled match overlaps the interval `[scheduledAt, endsAt)`:
  `{ scheduledAt: { $lt: newEndsAt }, endsAt: { $gt: newScheduledAt }, status: { $ne: 'Cancelled' } }`
  Evaluated independently for:
  1. Venue conflict (409)
  2. Home/Away team conflict (409)
  3. Referee conflict (409)
