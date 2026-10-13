# Step 12-Fix Review — Dashboard Card Mapping & Contract Test

## 1. Executive Summary & Root Cause Analysis

### Symptoms Reported
On the hosted site, the Admin dashboard cards display:
- "Total users 0"
- "Active coaches 0"
- "Active teams 0"
- "Unread inquiries 0"
while the card subtitle shows "2 active athletes".

### Root Causes
1. **Frontend Key & Type Mismatch for Total Users**:
   - Backend contract (`Backend/src/services/dashboard.service.ts:20-27`): Returns `userCounts: { Admin: number, Coach: number, Athlete: number, Organizer: number }`.
   - Frontend interface (`Frontend/src/services/academyApi.ts:1891-1899`): Incorrectly expected `{ total: number, admin: number, coach: number, athlete: number, organizer: number }`.
   - Rendering JSX (`AdminDashboard.tsx:111`): Rendered `{overview?.userCounts?.total ?? 0}`. Because `.total` is `undefined` on the backend response, it silently defaulted to `0`.
2. **Silent Default Masking (`?? 0`)**:
   - When keys were missing or misspelled, `?? 0` silently masked the absence of data, making contract bugs appear as genuine zero counts instead of rendering a visible missing indicator (`"-"`).
3. **Backend Service Filter Inconsistencies (Reported per Instruction)**:
   - `Backend/src/services/dashboard.service.ts:174`: Queries `Team.countDocuments({ active: true })`. However, `Team` schema (`Backend/src/models/Team.ts:60`) does not contain an `active` boolean field; it defines `status: TeamStatus` (`'Active' | 'Inactive'`). Therefore, queries for `{ active: true }` return 0.
   - `Backend/src/services/dashboard.service.ts:175`: Queries `Coach.countDocuments({ active: true })`. However, `Coach` schema (`Backend/src/models/Coach.ts`) does not contain an `active` boolean field; therefore, queries for `{ active: true }` return 0.
   - `Backend/src/services/dashboard.service.ts:538-539`: `getPublicOverview()` similarly queries `Coach.countDocuments({ active: true })` and `Team.countDocuments({ active: true })`.
   - *Action per User Directive*: The backend code is preserved as-is so `verify:dashboard` (107) and existing backend contracts remain untouched; the frontend mappers robustly format actual numbers (including 0 when returned by the backend) and use `"-"` solely when a key is undefined/missing.

---

## 2. Complete Evidence Table Across All 5 Dashboards & Public Overview

| Page / Dashboard | Card Metric | Backend Key Path (`dashboard.service.ts`) | Frontend Type Field (`academyApi.ts`) | Exact JSX Rendering Variable | Match? | Silent Default Used? |
|---|---|---|---|---|---|---|
| **Admin** | Total Users | `overview.userCounts` (`{ Admin, Coach, Athlete, Organizer }`) | `userCounts.total: number` | `{overview?.userCounts?.total ?? 0}` | **NO** (key `total` does not exist on backend) | `?? 0` |
| **Admin** | Active Athletes | `overview.activeAthletes: number` | `activeAthletes: number` | `{overview?.activeAthletes ?? 0}` | YES | `?? 0` |
| **Admin** | Active Coaches | `overview.coaches: number` | `coaches: number` | `{overview?.coaches ?? 0}` | YES (returns 0 from backend) | `?? 0` |
| **Admin** | Active Teams | `overview.teams: number` | `teams: number` | `{overview?.teams ?? 0}` | YES (returns 0 from backend) | `?? 0` |
| **Admin** | Upcoming Sessions | `overview.upcomingSessions: number` | `upcomingSessions: number` | `{overview?.upcomingSessions ?? 0}` | YES | `?? 0` |
| **Admin** | Unread Inquiries | `overview.unreadContactMessages: number` | `unreadContactMessages: number` | `{overview?.unreadContactMessages ?? 0}` | YES | `?? 0` |
| **Admin** | Pending Registrations | `overview.pendingRegistrations: number` | `pendingRegistrations: number` | Subtitle / mapper | YES | N/A |
| **Coach** | Assigned Teams | `overview.teams: CoachTeamOverview[]` | `teams: Array<{ id, name, athleteCount }>` | `{overview?.teams?.length ?? 0}` | YES | `?? 0` |
| **Coach** | Rostered Athletes | `overview.teams[i].athleteCount` | `teams[i].athleteCount` | `totalAthletes` fallback | YES | `athletes.length` |
| **Coach** | Upcoming Drills | `overview.nextSessions: CoachSessionOverview[]` | `nextSessions: Array<{ id, teamName, ... }>` | `{overview?.nextSessions?.length ?? 0}` | YES | `?? 0` |
| **Coach** | Attendance Rate | `overview.attendanceRate: number \| null` | `attendanceRate: number \| null` | `${overview.attendanceRate}%` / `'—'` | YES | None |
| **Athlete** | Attendance Rate | `overview.attendanceRate: number \| null` | `attendanceRate: number \| null` | `attendanceRate` | YES | None (`'N/A'`) |
| **Athlete** | Active Goals | `overview.activeGoalsCount: number` | `activeGoalsCount: number` | `{overview?.activeGoalsCount ?? ... ?? 0}` | YES | `?? 0` |
| **Athlete** | Coach Feedback | `overview.unacknowledgedFeedbackCount: number` | `unacknowledgedFeedbackCount: number` | `{overview?.unacknowledgedFeedbackCount ?? ... ?? 0}` | YES | `?? 0` |
| **Athlete** | Next Matches | `overview.nextMatches: MatchOverviewItem[]` | `nextMatches: Array<{ ... }>` | `{overview?.nextMatches?.length ?? 0}` | YES | `?? 0` |
| **Organizer** | Total Tournaments | `overview.tournaments` (`{ Draft, 'Registration Open', ... }`) | `tournaments: Record<...>` | `totalTournaments` | YES | `: 0` |
| **Organizer** | Registration Open | `overview.tournaments['Registration Open']: number` | `tournaments['Registration Open']` | `{overview?.tournaments?.['Registration Open'] ?? 0}` | YES | `?? 0` |
| **Organizer** | Pending Registrations | `overview.pendingRegistrations: number` | `pendingRegistrations: number` | `{overview?.pendingRegistrations ?? 0}` | YES | `?? 0` |
| **Organizer** | In Progress Tournaments | `overview.tournaments['In Progress']: number` | `tournaments['In Progress']` | `{overview?.tournaments?.['In Progress'] ?? 0}` | YES | `?? 0` |
| **Organizer** | Upcoming Matches | `overview.nextMatches: MatchOverviewItem[]` | `nextMatches: Array<{ ... }>` | `{overview?.nextMatches?.length ?? 0}` | YES | `?? 0` |
| **Official** | Total Assigned | `overview.matches: MatchOverviewItem[]` | `matches: Array<{ ... }>` | `matches.length` | YES | `overview?.matches \|\| []` |
| **Official** | In Progress Matches | Derived from `overview.matches` | `matches: Array<{ ... }>` | `liveMatches.length` | YES | Filter on empty array |
| **Official** | Upcoming Matches | Derived from `overview.matches` | `matches: Array<{ ... }>` | `upcomingMatches.length` | YES | Filter on empty array |
| **Public / Home** | Enrolled Athletes | `publicOverview.activeAthletes: number` | `activeAthletes: number` | `{publicOverview ? ... : '500+'}` | YES | Fallback string |
| **Public / Home** | Licensed Coaches | `publicOverview.activeCoaches: number` | `activeCoaches: number` | `{publicOverview ? ... : '25+'}` | YES | Fallback string |
| **Public / Home** | Active Squads | `publicOverview.activeTeams: number` | `activeTeams: number` | `{publicOverview ? ... : '12+'}` | YES | Fallback string |
| **Public / Home** | Sports Programs | `publicOverview.sportsCount: number` | `sportsCount: number` | `{publicOverview ? ... : '6'}` | YES | Fallback string |

---

## 3. Solution Strategy

1. **Pure Mapper Module (`Frontend/src/lib/dashboardMappers.ts`)**:
   - Implements pure functions `mapAdminDashboardCards`, `mapCoachDashboardCards`, `mapAthleteDashboardCards`, `mapOrganizerDashboardCards`, and `mapOfficialDashboardCards`.
   - Computes `totalUsers` for Admin as `Admin + Coach + Athlete + Organizer`.
   - Replaces silent defaults (`?? 0`) with `"-"` when data is missing or undefined; preserves `0` when the backend legitimately returns numeric 0.
2. **Contract Fixtures Generator (`Backend/scripts/export-dashboard-fixtures.ts`)**:
   - Generates real JSON response fixtures for each role through `createApp()`.
   - Cleans up all created records with zero orphans and strict 23-collection count preservation.
3. **Contract Test Suite (`Frontend/scripts/verify-dashboard-contract.ts`)**:
   - Loads the generated fixtures and asserts 15+ non-zero card metrics (at least 3 per role).
   - Validates that mappers never access keys absent from fixtures.
