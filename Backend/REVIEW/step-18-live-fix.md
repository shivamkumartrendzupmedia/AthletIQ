# STEP 18 — LIVE MATCH FIX AND ADMIN/ORGANIZER-ONLY CONTROL REPORT

## 1. Executive Summary
- **Objective**: Fix the live tournament and match center workflow, enforce strict Admin and Organizer control (with owning Organizer tournament scope restrictions) over live matches, ensure watch-only access for all other roles (Coach, Athlete, and visitors), and resolve React compiler warnings and submission race conditions.
- **Backend Status**:
  - `oxlint`: 0 warnings, 0 errors.
  - `tsc`: Exit 0 (zero errors).
- **Frontend Status**:
  - `oxlint`: 0 errors (React purity and effect warnings in `ScorerConsolePage.tsx` eliminated).
  - `tsc -b && vite build`: Exit 0 (built in 1.26s).

---

## 2. Bugs Found and Fixes Made

| Area | File & Line | Bug Description | Fix Made |
| :--- | :--- | :--- | :--- |
| **React Compiler Warning (Purity)** | `Frontend/src/pages/dashboard/ScorerConsolePage.tsx:120` | Impure `Date.now()` called directly inside `computeMinuteDisplay` within the component render cycle. | Replaced with interval-backed `currentTimeMs` state initialized once and ticked every 30 seconds via `setInterval` cleanup. |
| **React Compiler Warning (Effect)** | `Frontend/src/pages/dashboard/ScorerConsolePage.tsx:99` | Synchronous state setting in `useEffect` when calling `loadMatchAndEvents()`. | Wrapped in an `active` cancellation guard inside `useEffect` to avoid direct cascading renders. |
| **Double-Click / Event Race Condition** | `Frontend/src/pages/dashboard/ScorerConsolePage.tsx:176` | Rapid clicks on "Submit Event" could dispatch concurrent duplicate events before server response returned. | Added `isSubmittingEvent` guard that disables the button, adds a spinner, and blocks duplicate invocations until settled. |
| **RBAC / Component Level Security** | `Frontend/src/pages/dashboard/ScorerConsolePage.tsx:236` | Direct deep link to `/dashboard/live/:matchId` by Coach/Athlete only guarded at router level. | Added explicit inline role validation check displaying an "Access Forbidden" banner if any non-Admin/Organizer accesses the scorer page. |
| **Navigation & Broken Routes** | `Frontend/src/pages/PublicMatchDetailPage.tsx:108, 137` | Back buttons pointed to `/live` instead of the canonical public match center `/matches/live`. | Updated links to `/matches/live` for consistent routing and tab navigation. |
| **Console Hub Navigation** | `Frontend/src/pages/dashboard/LiveMatchesConsoleListPage.tsx:110` | "Public Live Center" link pointed to `/live` instead of `/matches/live`. | Updated to link to `/matches/live`. |

---

## 3. Final Permission Matrix (Live Matches & Scorer)

| Action / Route | Endpoint / Method | Admin | Organizer | Coach | Athlete | Public / Guest |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **View Live Center** | `GET /api/public/matches/live` | Allowed | Allowed | Allowed | Allowed | Allowed (Watch-only) |
| **View Public Match Detail & Timeline** | `GET /api/public/matches/:id` | Allowed | Allowed | Allowed | Allowed | Allowed (Watch-only) |
| **View Standings & Top Scorers** | `GET /api/public/tournaments/:id/standings` | Allowed | Allowed | Allowed | Allowed | Allowed (Watch-only) |
| **View Private Match Events** | `GET /api/matches/:id/events` | Allowed | Allowed (Owned tourney) | Allowed | Allowed | 401 Unauthorized |
| **Open Match Console Hub** | `/dashboard/live` | Allowed | Allowed | 403 Forbidden | 403 Forbidden | 401 Redirect to Login |
| **Open Scorer Console** | `/dashboard/live/:matchId` | Allowed | Allowed (Owned tourney) | 403 Forbidden | 403 Forbidden | 401 Redirect to Login |
| **Start / Pause / Complete Match** | `POST /api/matches/:id/status` | Allowed | Allowed (Owned tourney) | 403 Forbidden | 403 Forbidden | 401 Unauthorized |
| **Record Match Event (Goal/Card/Sub)** | `POST /api/matches/:id/events` | Allowed | Allowed (Owned tourney) | 403 Forbidden | 403 Forbidden | 401 Unauthorized |
| **Delete / Correct Event** | `DELETE /api/matches/:id/events/:eventId` | Allowed | Allowed (Owned tourney) | 403 Forbidden | 403 Forbidden | 401 Unauthorized |
| **Enter Final Result Directly** | `PATCH /api/matches/:id/result` | Allowed | Allowed (Owned tourney) | 403 Forbidden | 403 Forbidden | 401 Unauthorized |
| **Reschedule / Cancel Match** | `PATCH /api/matches/:id` | Allowed | Allowed (Owned tourney) | 403 Forbidden | 403 Forbidden | 401 Unauthorized |
| **Delete Fixture** | `DELETE /api/matches/:id` | Allowed | Allowed (Owned tourney) | 403 Forbidden | 403 Forbidden | 401 Unauthorized |

---

## 4. Manual Test Checklist

1. **Watch Experience (Public / Coach / Athlete)**:
   - [ ] Navigate to `/matches/live` as a logged-out visitor: Active live matches load without errors; LIVE badge and scores display.
   - [ ] Click a live match card: Navigates to `/matches/:id`. Event timeline updates chronologically with formatted player initials.
   - [ ] Polling: Confirm that polling runs every 8 seconds while the tab is active, stops when tab is backgrounded, and cleans up on unmount.
2. **Scorer Workflow (Admin / Owning Organizer)**:
   - [ ] Log in as Admin or Organizer: Navigate to `/dashboard/live` and select a match.
   - [ ] Click "Open Live Scorer Console": Transition match from Scheduled -> Live.
   - [ ] Record a Goal: Select home/away side, enter minute, submit. Verify liveScore increments immediately.
   - [ ] Record a Card and a Substitution: Verify events appear in timeline.
   - [ ] Delete a Goal: Verify liveScore decrements and reverts cleanly.
   - [ ] Full Time: Click "Full Time (Complete)" and confirm modal. Verify match transitions to Completed and locks final score.
3. **RBAC Guard Validation**:
   - [ ] Log in as Coach or Athlete: Navigate directly to `/dashboard/live` or `/dashboard/live/<matchId>`.
   - [ ] Verify that router redirects or displays "Access Forbidden", with zero write controls rendered.
