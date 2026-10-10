# STEP 8B REVIEW: Tournaments Frontend Pages & Client Architecture

## 1. Overview
Step 8B implements the complete tournament web application interface for AthletiQ across all platform roles and the public portal:
- **Organizer / Admin**: Management of tournaments, venues, officials, team registrations (approval / rejection), match fixture creation with real-time overlap error display, and match result reporting.
- **Coach**: Browsing open tournaments, registering owned teams with athlete squads (max 30), viewing review status and rejection reasons, editing squad while open, and withdrawing pending registrations.
- **Athlete**: Read-only view of active tournaments, team registration status, fixtures, and results.
- **Public**: Public tournament catalog (`/tournaments`) and tournament details (`/tournaments/:id`) consuming strictly `/api/public/*` endpoints with round-based fixture groupings.

---

## 2. Page & Routing Architecture
| Route | Roles / Access | API Functions Used | First-Load Requests | Empty State Primary Button |
|---|---|---|---|---|
| `/dashboard/tournaments` | Admin, Organizer, Coach, Athlete | `getTournaments`, `getSports`, `getMyTeams` (Coach), `getMyRegistrations` (Coach/Athlete) | <= 3 | "+ Create Tournament" (Admin/Org) / "Browse Open" (Coach) |
| `/dashboard/tournaments/:id` | Admin, Organizer | `getTournamentById`, `getTournamentRegistrations`, `getTournamentMatches`, `getVenues`, `getOfficials` | <= 4 (paginated/tabbed) | "+ Add Fixture" / "+ Review Registrations" |
| `/dashboard/venues` | Admin, Organizer | `getVenues` | 1 | "+ Add Venue" |
| `/dashboard/officials` | Admin, Organizer | `getOfficials` | 1 | "+ Add Official" |
| `/tournaments` (Public) | All (Public Layout) | `getPublicTournaments`, `getPublicSports` | 2 | None / Filter Reset |
| `/tournaments/:id` (Public) | All (Public Layout) | `getPublicTournamentById`, `getPublicTournamentMatches` | 2 | None (Return to Catalog) |

---

## 3. Data Integrity & Validation
1. **Pure Payload Builders**:
   - `buildTournamentPayload`: validates and parses name, sport, category, ageGroup, format, dates, rules, maxTeams.
   - `buildVenuePayload`: validates name, address, capacity, active.
   - `buildOfficialPayload`: validates name, type, active.
   - `buildRegistrationPayload`: validates team and squad (array of athlete ObjectIds, max 30).
   - `buildMatchPayload`: validates fixture scheduling, home/away distinction, venue, referee, duration, scheduledAt.
   - `buildMatchResultPayload`: validates homeScore and awayScore integers (0-99).
   All tested directly against backend Zod schemas in `Frontend/scripts/verify-tournament-payload.ts`.

2. **Error Handling & User Feedback**:
   - 409 Overlap errors on match scheduling display specific conflict messages (venue occupied, team playing, or referee assigned).
   - 409 Deletion errors on venues/officials warn the organizer that fixtures are scheduled at the facility.
   - Modal field error banners map `err.fieldErrors` into `field: message` items.

3. **Date and Time Safety**:
   - Form inputs use local datetime strings handled via `Frontend/src/lib/datetime.ts` and sent over the wire as standard ISO strings.
