# Step 6A Review: Training Sessions & Attendance Engine

## 1. Overview
Step 6A implements the complete Training Session and Attendance domain across the backend and frontend:
- **Backend API**: Full CRUD on training sessions, overlap detection with concurrency race protection, attendance marking and roster merge, athlete attendance history and rate computation, role-based scoping and privacy enforcement.
- **Frontend Integration**: Updated `academyApi.ts` with exact TypeScript interfaces and list helpers, upgraded `TrainingCalendarPage.tsx` with live data, schedule modal (`SessionModal.tsx`), attendance modal (`AttendanceModal.tsx`), status badges ("Awaiting attendance", "Scheduled", "Completed", "Cancelled"), and personal attendance summary for athletes.
- **Pure Datetime Utilities**: Created `Frontend/src/lib/datetime.ts` for deterministic timezone handling with explicit IANA timezone identifiers.

---

## 2. Implementation of 10 Approved Corrections

### 1. File List
Every file created or modified in Step 6A:
- **Backend Created/Modified**:
  - `Backend/src/models/TrainingSession.ts` (Mongoose schema for training sessions)
  - `Backend/src/models/constants.ts` (SESSION_TYPES and AUDIT_ACTIONS)
  - `Backend/src/config/permissions.ts` (enforced permissions for training and attendance)
  - `Backend/src/validators/training.validator.ts` (strict canonical Zod schemas, aliases rejected with 400)
  - `Backend/src/services/training.service.ts` (core training session and attendance business logic)
  - `Backend/src/controllers/training.controller.ts` (HTTP handlers for sessions and attendance)
  - `Backend/src/routes/training-session.routes.ts` (mounted session and attendance routes)
  - `Backend/src/routes/athlete.routes.ts` (mounted athlete attendance endpoints)
  - `Backend/src/routes/index.ts` (registered training-session routes)
  - `Backend/package.json` (added `"verify:training"` script)
  - `Backend/scripts/verify-training.ts` (52-case comprehensive automated verification test suite)
- **Frontend Created/Modified**:
  - `Frontend/src/lib/datetime.ts` (pure date/time converter with explicit IANA time zones)
  - `Frontend/scripts/verify-datetime-helpers.ts` (verification test covering DST transitions and midnight crossovers)
  - `Frontend/src/services/academyApi.ts` (exact types and API client functions)
  - `Frontend/src/components/training/SessionModal.tsx` (schedule and edit session modal)
  - `Frontend/src/components/training/AttendanceModal.tsx` (roster attendance marking modal)
  - `Frontend/src/pages/dashboard/TrainingCalendarPage.tsx` (live calendar, list view, and filters)
- **Review**:
  - `Backend/REVIEW/step-06a-review.md`

### 2. Out-of-Scope = 404
- Coach B attempting to access Coach A's session or attendance returns **404 Not Found**.
- Athlete B attempting to access Athlete A's attendance returns **404 Not Found**.
- Coach attempting to access an athlete outside their teams returns **404 Not Found**.
- **403 Forbidden** is reserved exclusively for disallowed roles on routes (e.g. Organizer attempting attendance endpoints).

### 3. Privacy Protections
- **Organizer**: Receives session list and session details read-only with `attendanceSummary: null`. Completely blocked (403) from attendance endpoints.
- **Athlete**: Can list and view sessions for their squad, but receives `attendanceSummary: null`. Sees only their own attendance status via `myAttendance`.
- **Admin & Coach**: Only Admin and the assigned Coach receive the full `attendanceSummary` breakdown (`present`, `late`, `excused`, `absent`, `total`, `attendanceRate`).

### 4. Overlap Race Condition Protection
- Concurrent session creates are vulnerable to check-then-insert race conditions.
- In `trainingService.createSession` and `updateSession`, after saving, a post-insert query checks for overlapping sessions on the same team excluding itself.
- If an overlapping session exists with a lower `_id` (or earlier timestamp), the newly inserted session is immediately deleted (or times reverted) and **409 Conflict** is returned.
- Tested via `Promise.all` in `verify-training.ts`: two concurrent overlapping requests yield exactly one `201 Created` and one `409 Conflict` (no 500 errors, exactly one document in MongoDB).

### 5. Attendance & Status Transition Rules
- Attendance can only be marked when `session.startsAt <= now` (returns 400 if session is scheduled in the future).
- Admin and Coach may create sessions in the past.
- A Completed session cannot be cancelled again (returns 400).
- A Cancelled session cannot be cancelled again (returns 400).
- Auto-Completed rule: When `now > endsAt` and session is currently `Scheduled`, saving attendance transitions session status to `Completed`.

### 6. Roster Merge with Former Athletes
- Attendance roster merges:
  1. Current team roster (`Active`, `Injured`, `Trial`) with `onRoster: true`.
  2. Historical attendees who have attendance records for that session even if they have left the team (`onRoster: false`).
- Privacy: Returns athlete names only (`athleteId`, `athleteName`, `status`, `note`, `onRoster`), omitting sensitive user/email fields.

### 7. Date Filters & Validation
- Invalid `from` or `to` ISO timestamps return **400 Bad Request**.
- Filter range exceeding 366 days returns **400 Bad Request**.
- `to` filter is inclusive of the entire day (`23:59:59.999Z`).
- Pagination parameters are safely clamped (`limit` 1..100).

### 8. Pure Datetime Helper
- `Frontend/src/lib/datetime.ts` converts between UTC ISO strings and `<input type="datetime-local">` format.
- Uses `Intl.DateTimeFormat` with explicit IANA timezone parameter, ensuring deterministic output across all machines.
- `Frontend/scripts/verify-datetime-helpers.ts` verifies:
  1. America/New_York summer EDT (UTC-4) roundtrip.
  2. Midnight crossover in Asia/Kolkata (+05:30) to previous day UTC and back.
  3. US DST transition (winter EST vs summer EDT).
  4. Europe/London DST transition (BST UTC+1 to GMT UTC+0).
  5. Time range and duration formatting.
- Excluded from frontend build (located in `Frontend/scripts/`).

### 9. Missing Profiles
- A Coach without a Coach profile document receives `200 OK` with `{ items: [], pagination: { total: 0 } }`.
- An Athlete without an Athlete profile or assigned team receives `200 OK` with `{ items: [], pagination: { total: 0 } }` on session list and `/athletes/me/attendance`.
- Never crashes with 500 or throws unhandled errors.

### 10. UI & Empty States
- Sessions whose end time has passed but status is still `Scheduled` display an **"Awaiting attendance"** badge.
- Header, subtitle, filters, and "Schedule Session" button remain visible when the session list is empty.
- Athlete users see a dedicated Personal Attendance Summary card at the top displaying attendance rate and counts.

---

## 3. Role Access Matrix

| Endpoint | Admin | Coach | Athlete | Organizer |
| :--- | :---: | :---: | :---: | :---: |
| `GET /api/training-sessions` | All sessions + summary | Coached team sessions + summary | Own squad sessions (no team summary, `myAttendance` only) | All sessions read-only (`attendanceSummary: null`) |
| `POST /api/training-sessions` | Allowed | Allowed (coached teams) | 403 Forbidden | 403 Forbidden |
| `GET /api/training-sessions/:id` | Allowed + summary | Allowed (coached team only; else 404) | Allowed (own team only; else 404, `myAttendance` only) | Allowed read-only (`attendanceSummary: null`) |
| `PATCH /api/training-sessions/:id` | Allowed | Allowed (coached team only; else 404) | 403 Forbidden | 403 Forbidden |
| `POST /api/training-sessions/:id/cancel` | Allowed | Allowed (coached team only; else 404) | 403 Forbidden | 403 Forbidden |
| `DELETE /api/training-sessions/:id` | Allowed | 403 Forbidden | 403 Forbidden | 403 Forbidden |
| `GET /api/training-sessions/:id/attendance` | Allowed | Allowed (coached team only; else 404) | 403 Forbidden | 403 Forbidden |
| `PUT /api/training-sessions/:id/attendance` | Allowed | Allowed (coached team only; else 404) | 403 Forbidden | 403 Forbidden |
| `GET /api/athletes/me/attendance` | N/A | N/A | Own attendance record | 403 Forbidden |
| `GET /api/athletes/:id/attendance` | Allowed | Allowed (coached athletes only; else 404) | 404 if not self | 403 Forbidden |

---

## 4. Verification Results Summary

- **Backend Lint**: 0 warnings, 0 errors.
- **Backend Build**: Clean compilation (`tsc` exit 0).
- **Backend Verification Suites**:
  - `verify:models`: 27 passed, 0 failed.
  - `verify:auth`: 30 passed, 0 failed.
  - `verify:rbac`: 82 passed, 0 failed.
  - `verify:academy`: 133 passed, 0 failed.
  - `verify:ratelimit`: 6 passed, 0 failed.
  - `verify:training`: 52 passed, 0 failed.
- **Frontend Pure Datetime Suite**:
  - `verify-datetime-helpers.ts`: 5/5 cases passed (DST, midnight, roundtrips).
- **Frontend Build**: Clean compilation (`tsc -b && vite build` exit 0).
- **Frontend Lint**: 96 warnings, 0 errors (strictly matching baseline <= 96).
