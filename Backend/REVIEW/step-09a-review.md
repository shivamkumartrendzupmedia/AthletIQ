# Step 9A Review: Live Match Center Backend Architecture

## Overview
Step 9A implements the backend infrastructure for the Live Match Center in ATHLETIQ, introducing the `Official` role, an atomic match status state machine, match events, standings calculation, tournament performance statistics, and privacy-hardened public match endpoints.

---

## 1. Domain Definitions

### 1.1 Appearance Definition
An athlete's match appearance in a tournament:
- An athlete is credited with an appearance (match played) in a tournament if they are listed in the squad of their team's Approved registration for that match, OR they are referenced in at least one `MatchEvent` (Goal, OwnGoal, YellowCard, RedCard, Substitution, Injury) in that match.
- Only matches from `Completed` tournaments or with status `Completed` (or currently in progress for live stats) count toward match appearances.
- Appearances are deduplicated per distinct match (an athlete cannot have multiple appearances in the same match).

### 1.2 Minute Estimate Definition
For live matches without stopwatch clock syncing:
- **`Scheduled`**: Minute estimate is `null` or `0`.
- **`Live` (First Half)**: If `startedAt` is set and `secondHalfAt` is not set:
  $$\text{minute} = \max(1, \min(45, \lfloor (\text{serverTime} - \text{startedAt}) / 60000 \rfloor + 1))$$
  If past 45 minutes without transitioning to HalfTime, it renders as `45+` with stoppage allowance up to 60.
- **`HalfTime`**: Renders as `'HT'` (minute representation `45`).
- **`Live` (Second Half)**: If `secondHalfAt` is set:
  $$\text{minute} = \max(46, \min(90, 45 + \lfloor (\text{serverTime} - \text{secondHalfAt}) / 60000 \rfloor + 1))$$
  If past 90 minutes, it renders as `90+` with stoppage allowance up to 130.
- **`Completed`**: Renders as `'FT'` (minute representation `90`).
- **`Cancelled`**: Minute estimate is `null`.

### 1.3 Privacy Format Definition
Public match and tournament endpoints must strictly protect youth athletes and academy personnel:
- **Player Names**: Formatted strictly as `"FirstName L."` (first name followed by the capitalized first initial of the last name, e.g., "Liam C." or "Alex M.").
- **Sensitive Fields**: NEVER leaked in public responses:
  - No athlete IDs (use event IDs in event streams).
  - No user IDs, organizer IDs, coach IDs, or referee user IDs.
  - No email addresses, phone numbers, or emergency contacts.
  - No medical notes, guardian information, or verification status.
  - No full squad rosters or registration rejection reasons.
- **Draft Tournament Guard**: Any public request accessing matches or standings of a `Draft` tournament immediately returns `404 Not Found`.

### 1.4 Derived Score Definition
Scores are authoritative and derived from the immutable `MatchEvent` stream:
- $$\text{homeScore} = \text{Goals (home side)} + \text{OwnGoals (away side)}$$
- $$\text{awayScore} = \text{Goals (away side)} + \text{OwnGoals (home side)}$$
- **Atomic Synchronization**:
  - Whenever an event is created or deleted, `Match.liveScore { home, away }` is updated atomically.
  - When a match transitions to `Completed`, `result { homeScore, awayScore }` is locked from the derived event counts.
  - Manual score overrides (`PATCH /api/matches/:id/result`) are rejected with `409 Conflict` if any `MatchEvent` records exist for that match.

---

## 2. Match State Machine Transitions
Allowed status transitions via `POST /api/matches/:id/status`:
1. `Scheduled` $\rightarrow$ `Live`:
   - Allowed starting 60 minutes before `scheduledAt`.
   - Parent tournament status must be `In Progress` (else `400 Bad Request`).
   - Sets `startedAt = new Date()`.
2. `Live` $\rightarrow$ `HalfTime`:
   - Allowed while currently `Live`.
   - Sets `halfTimeAt = new Date()`.
3. `HalfTime` $\rightarrow$ `Live`:
   - Resumes match for second half.
   - Sets `secondHalfAt = new Date()`.
4. `Live` $\rightarrow$ `Completed`:
   - Finalizes match.
   - Sets `completedAt = new Date()`, derives final `result { homeScore, awayScore }`, and records `enteredBy`.
5. `Scheduled` $\rightarrow$ `Cancelled`:
   - Cancels match before start.
- Any attempt to leave `Completed` or `Cancelled` is rejected with `400 Bad Request`.
- Any transition with a mismatched current state or lost race condition returns `409 Conflict`.
- Executed using atomic MongoDB `findOneAndUpdate({ _id: matchId, status: expectedStatus }, { ... })`.

---

## 3. RBAC & Official Role Permissions
- **Official Role**:
  - Added to canonical `ROLES` enum (`Admin`, `Coach`, `Athlete`, `Organizer`, `Official`).
  - Linked to an `Official` document via optional `user` field (sparse unique index).
  - `GET /api/matches/assigned`: Official can view only matches where `match.referee.user == req.user.id`.
  - Workflow Operations (`POST status`, `POST events`, `DELETE events`):
    - Assigned Official: Allowed on assigned matches only. Other matches return `404 Not Found`.
    - Tournament Owning Organizer: Allowed on all matches in tournaments owned by them.
    - Admin: Allowed on all matches across all tournaments.
    - Coach, Athlete, Unassigned Official: Rejected with `403 Forbidden` or `404 Not Found`.
- **Public Endpoints**:
  - `GET /api/public/matches/live`
  - `GET /api/public/matches/:id`
  - `GET /api/public/tournaments/:id/standings`
  - `GET /api/public/tournaments/:id/top-scorers`
  - `GET /api/public/matches/:id/report`
  - All public endpoints include `Cache-Control: no-store` and `serverTime`.

---

## 4. Standings Computation
Computed on demand from `Completed` matches:
- Grouped by `group` (if present).
- Points: Win = 3, Draw = 1, Loss = 0.
- Ordering criteria:
  1. Points (descending)
  2. Goal Difference (`goalsFor - goalsAgainst`, descending)
  3. Goals For (descending)
  4. Team Name (alphabetical ascending)
- Only teams with status `Approved` in tournament registrations appear in standings.
