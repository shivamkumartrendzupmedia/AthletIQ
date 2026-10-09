# Step 5B Review: Render Bug & Rate Limit Fix

## 1. Crash Lines & Root Cause

### Crashing Code Lines
- `Frontend/src/pages/TeamsPage.tsx:82`: `<AthleticBadge variant="dark">{team.sport}</AthleticBadge>`
- `Frontend/src/pages/TeamDetailPage.tsx:85`: `<AthleticBadge variant="lime">{team.sport}</AthleticBadge>`
- `Frontend/src/pages/TeamDetailPage.tsx:117`: `{team.sport}`

### Root Cause
- In `Backend/src/services/public.service.ts` (`listPublicTeams` line 107 and `getPublicTeamBySlug` line 165), teams populate the `sport` reference:
  `.populate('sport', 'name slug -_id')`
  This returns an object `{ name: string, slug: string }` on `team.sport`.
- In `Frontend/src/services/academyApi.ts`, `PublicTeamItem` incorrectly declared `sport: string`.
- When rendering `/teams` or `/teams/:id`, React encountered an object as a child node in JSX and threw:
  `Error: Objects are not valid as a React child (found: object with keys {name, slug})`

---

## 2. Object-Valued Fields Table (Public & Admin Endpoints)

| Endpoint | Field | Backend Real Shape | Frontend Declared Type | Places in Frontend Rendering Field | Safe Handling Applied |
|---|---|---|---|---|---|
| `GET /api/public/teams`<br>`GET /api/public/teams/:slug` | `sport` | `{ name: string; slug: string }` | `{ name: string; slug: string }` | `TeamsPage.tsx:82`<br>`TeamDetailPage.tsx:85, 117` | `team.sport?.name \|\| 'Sport'` |
| `GET /api/public/teams`<br>`GET /api/public/teams/:slug` | `coach` | `{ name?: string; title?: string; photo?: string } \| null` | `{ name?: string; title?: string; photo?: string } \| null` | `TeamsPage.tsx:96`<br>`TeamDetailPage.tsx:93` | `team.coach?.name \|\| 'Assigned Staff'` |
| `GET /api/public/coaches`<br>`GET /api/public/coaches/:id` | `sports` | `Array<{ name: string; slug: string }>` | `Array<{ name: string; slug: string }>` | `CoachesPage.tsx`<br>`CoachDetailPage.tsx` | Array mapped via `s.name \|\| s` |
| `GET /api/public/sports`<br>`GET /api/public/sports/:slug` | — | All root fields primitive / string arrays (`ageGroups`, `features`) | Primitive / string arrays | `ProgramsPage.tsx`<br>`ProgramDetailPage.tsx` | N/A (no nested objects rendered directly) |
| `GET /api/teams`<br>`GET /api/teams/:id` | `sport` | `{ id: string; name: string; slug: string; ageGroups?: string[] }` | `{ id: string; name: string; slug: string; ageGroups?: string[] }` | `TeamManagementPage.tsx:273` | `typeof t.sport === 'object' && t.sport ? t.sport.name : 'Sport Program'` |
| `GET /api/teams`<br>`GET /api/teams/:id` | `coach` | `{ id: string; title: string; specialties?: string[]; photo?: string; user?: { id: string; name: string } } \| null` | `{ id: string; title: string; specialties?: string[]; photo?: string; user?: { id: string; name: string } } \| null` | `TeamManagementPage.tsx:278` | `t.coach?.user?.name \|\| 'Unassigned'` |
| `GET /api/teams/:id/roster` | `user` | `{ id: string; name: string; avatar?: string }` | `AthleteItem.user` | `RosterManagementPage.tsx:210` | `ath.user?.name \|\| 'Unnamed Athlete'` |
| `GET /api/coaches`<br>`GET /api/coaches/:id` | `user` | `{ id: string; name: string; email?: string; phone?: string; avatar?: string; isActive?: boolean }` | `{ id: string; name: string; email?: string; phone?: string; avatar?: string; isActive?: boolean }` | `CoachManagementPage.tsx:238, 242` | `c.user?.name \|\| 'Unnamed Coach'`, `c.user?.email \|\| 'No email'` |
| `GET /api/coaches`<br>`GET /api/coaches/:id` | `sports` | `Array<{ id: string; name: string; slug: string }>` | `Array<{ id: string; name: string; slug: string }>` | `CoachManagementPage.tsx:251` | `(c.sports \|\| []).map(s => typeof s === 'object' ? s.name : s).join(', ')` |
| `GET /api/athletes`<br>`GET /api/athletes/:id`<br>`GET /api/athletes/me` | `user` | `{ id: string; name: string; email?: string; phone?: string; avatar?: string } \| null` | `{ id: string; name: string; email?: string; phone?: string; avatar?: string } \| null` | `AthleteManagementPage.tsx:391, 392` | `ath.user?.name \|\| 'Unnamed Athlete'`, `ath.user?.email \|\| 'No email'` |
| `GET /api/athletes`<br>`GET /api/athletes/:id`<br>`GET /api/athletes/me` | `sport` | `{ id: string; name: string; slug: string; ageGroups?: string[] }` | `{ id: string; name: string; slug: string; ageGroups?: string[] }` | `AthleteManagementPage.tsx:395, 566`<br>`RosterManagementPage.tsx:213` | `typeof ath.sport === 'object' && ath.sport ? ath.sport.name : 'Sport'` |
| `GET /api/athletes`<br>`GET /api/athletes/:id`<br>`GET /api/athletes/me` | `team` | `{ id: string; name: string; slug: string; ageGroup?: string } \| null` | `{ id: string; name: string; slug: string; ageGroup?: string } \| null` | `AthleteManagementPage.tsx:400, 575` | `ath.team?.name \|\| 'Unassigned'` |
| `GET /api/users`<br>`GET /api/users/:id` | — | All fields primitive (`id, name, email, role, isActive, isLocked`) | `AdminUserItem` | `UserAccountsPage.tsx` | N/A (no nested objects rendered directly) |
| `GET /api/users/:id/audit` | `actor` | `{ id: string; name: string; email: string; role: string } \| null` | `{ id: string; name: string; email: string; role: string } \| null` | `UserAccountsPage.tsx:645` | `log.actor?.name \|\| 'System'` |

---

## 3. First-Load API Request Count per Page

| Page | Route | Requests on First Load | Endpoints Called | Notes |
|---|---|---|---|---|
| **Login** | `/login` | **0** | None | AuthContext checks `athletiq_has_session` flag; unauthenticated startup bypasses silent refresh. |
| **Sports Management** | `/dashboard/sports` | **1** | `GET /api/sports?limit=100` | Single fetch on mount. |
| **Team Management** | `/dashboard/teams` | **3** | `GET /api/teams`, `GET /api/sports`, `GET /api/coaches` | Parallel `Promise.all` fetch on mount. |
| **Coach Management** | `/dashboard/coaches` | **3** | `GET /api/coaches`, `GET /api/sports`, `GET /api/users?role=Coach` | Parallel `Promise.all` fetch on mount. |
| **Athlete Management** | `/dashboard/athletes` | **4** | `GET /api/sports`, `GET /api/teams`, `GET /api/users?role=Athlete`, + `GET /api/athletes` | Dependencies in parallel + 1 debounced athlete list query. |
| **Roster Management** | `/dashboard/rosters` | **3** | `GET /api/athletes?unassigned=true`, `GET /api/teams`, `GET /api/teams/:id/roster` | `fetchTeams` dependency cycle resolved so selecting default team does not re-trigger fetch. |
| **User Accounts** | `/dashboard/users` | **1** | `GET /api/users?page=1&limit=20` | Single debounced fetch on mount. |
| **Public Programs** | `/programs` | **1** | `GET /api/public/sports?limit=100` | Single catalog fetch on mount. |
| **Public Teams** | `/teams` | **1** | `GET /api/public/teams?limit=100` | Single teams directory fetch on mount. |
| **Public Coaches** | `/coaches` | **1** | `GET /api/public/coaches?limit=100` | Single coaches directory fetch on mount. |
| **Program Detail** | `/programs/:id` | **1** | `GET /api/public/sports/:slug` | Single item query by slug. |
| **Team Detail** | `/teams/:id` | **1** | `GET /api/public/teams/:slug` | Single item query by slug. |
| **Coach Detail** | `/coaches/:id` | **1** | `GET /api/public/coaches/:id` | Single item query by ID. |

---

## 4. Rate Limiting Architecture Changes

1. **Configurable Global Rate Limiter**:
   - `Backend/src/config/env.ts`: Added `RATE_LIMIT_WINDOW_MS` (default `900000` = 15m) and `RATE_LIMIT_MAX` (defaults to `5000` when `NODE_ENV === 'development'` and `600` in production). Values validated via Zod without exposing secrets or values.
   - `Backend/.env.example`: Added configuration options with explanatory comments. `.env` was never read or modified.
2. **`createApp` Options & OPTIONS Preflight Bypass**:
   - `Backend/src/app.ts`: `createApp(options: { rateLimitMax?: number } = {})` accepts runtime overrides.
   - `skip: (req) => req.method === 'OPTIONS'` ensures CORS preflight calls do not decrement the rate limit window.
3. **Stricter Auth Limiter Integrity**:
   - `Backend/src/middlewares/rateLimiter.ts` (`authLimiter`) remains strictly unchanged (0 diff).
4. **Verification Test Script**:
   - `Backend/scripts/verify-ratelimit.ts` (`npm run verify:ratelimit`):
     - Starts in-process app on an ephemeral port with `rateLimitMax = 5`.
     - Validates that OPTIONS requests do not count toward the quota.
     - Confirms requests 1–5 return 200 OK.
     - Confirms requests 6 and 7 return 429 Too Many Requests with `{ success: false, message: ... }`.

---

## 5. Files Changed

### Backend
- `Backend/src/config/env.ts`: Added rate limit schema configuration with development/production defaults.
- `Backend/.env.example`: Documented `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX`.
- `Backend/src/app.ts`: Updated `createApp` to accept options and skip preflight OPTIONS requests.
- `Backend/package.json`: Added `verify:ratelimit` script.
- `Backend/scripts/verify-ratelimit.ts`: New standalone in-process rate limit test suite.
- `Backend/REVIEW/step-05b-render-fix-review.md`: This review report.

### Frontend
- `Frontend/src/services/academyApi.ts`: Refined types for `PublicTeamItem`, `PublicCoachItem`, `TeamItem`, `CoachItem`, and `AthleteItem` to exact populated object shapes.
- `Frontend/src/pages/TeamsPage.tsx`: Render `team.sport?.name || 'Sport'`.
- `Frontend/src/pages/TeamDetailPage.tsx`: Render `team.sport?.name || 'Sport'` in header badge and squad overview card.
- `Frontend/src/pages/dashboard/RosterManagementPage.tsx`: Eliminated redundant `fetchTeams` invocation cycle on initial load.
