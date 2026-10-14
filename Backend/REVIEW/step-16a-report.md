# STEP 16A — READ-ONLY HEALTH CHECK REPORT

Date: 2026-10-14  
Scope: Repository-wide read-only health check across Git history, verification suites, route & banner audits, API contracts, schemas, security configurations, and assets.  
Constraint: Strict read-only execution; no source, test, or config files were modified or deleted.

---

## 1. Git State

### Recent Commit History (`git log -15 --oneline`)
```text
36e2181 step 14b: achievements UI and mock data removal
a721ab9 step 14: achievements CRUD backend and public endpoints
54d54a6 step 13-routes-fix: restore role guards
96b83c1 step 13-routes: restore dashboard routes and add route coverage test
fb068ff step 13-check: env names, contact config, audit rules
bf42b92 step 13b: banner fix, legal pages, code splitting, deployment docs
2bd05e5 step 13a: fix active team/coach counts
334ae43 step 12-fix: dashboard card mapping and contract test
e0c3485 step 12: role-based chatbot (rule-based)
932284e step 11A: production cookie/CORS fix and test user cleanup
9fd1cfa step 10-fix: restore refresh single-flight assertions
7dd6da5 step 10: notifications, password reset, analytics
1cf3424 step 9B-fix: standings, performance, official linking, squads
6dde98b step 9B: live match center frontend
7f8a29c step 9A-fix: official role completeness
```

### Committed Steps Status
- **13-routes**: **COMMITTED** (`96b83c1 step 13-routes: restore dashboard routes and add route coverage test`)
- **13-routes-fix**: **COMMITTED** (`54d54a6 step 13-routes-fix: restore role guards`)
- **14a**: **COMMITTED** (`a721ab9 step 14: achievements CRUD backend and public endpoints`)
- **14b (achievements UI + mock removal)**: **COMMITTED** (`36e2181 step 14b: achievements UI and mock data removal`)
- **15 (remove Official role)**: **NOT COMMITTED** (Pending execution)

### Working Tree Status
- `git status --short`: Empty (0 uncommitted files prior to this report).
- `git diff --stat HEAD`: 0 files changed.
- Uncommitted files: None.

---

## 2. Fresh Verification Suite Executions

Every command below was freshly executed in this session via terminal commands:

| Suite / Check | Baseline | Result This Session | Status |
| :--- | :--- | :--- | :--- |
| **Backend Build (`tsc`)** | Exit 0 | **Exit 0** | **OK** |
| **Backend Lint (`oxlint`)** | 0 warnings, 0 errors | **0 warnings, 0 errors** (145 files, 72 rules, 39ms) | **OK** |
| `npm run verify:models` | 27 passed, 0 failed | **27 passed, 0 failed** | **OK** |
| `npm run verify:auth` | 66 passed, 0 failed | **66 passed, 0 failed** | **OK** |
| `npm run verify:rbac` | 82 passed, 0 failed | **82 passed, 0 failed** | **OK** |
| `npm run verify:academy` | 133 passed, 0 failed | **133 passed, 0 failed** | **OK** |
| `npm run verify:ratelimit` | 6 passed, 0 failed | **6 passed, 0 failed** | **OK** |
| `npm run verify:training` | 89 passed, 0 failed | **89 passed, 0 failed** | **OK** |
| `npm run verify:comms` | 119 passed, 0 failed | **119 passed, 0 failed** | **OK** |
| `npm run verify:development` | 114 passed, 0 failed | **114 passed, 0 failed** | **OK** |
| `npm run verify:tournaments` | 118 passed, 0 failed | **118 passed, 0 failed** | **OK** |
| `npm run verify:dashboard` | 119 passed, 0 failed | **119 passed, 0 failed** | **OK** |
| `npm run verify:live` | 109 passed, 0 failed | **109 passed, 0 failed** | **OK** |
| `npm run verify:notifications` | 30 passed, 0 failed | **30 passed, 0 failed** | **OK** |
| `npm run verify:password-reset` | 32 passed, 0 failed | **32 passed, 0 failed** | **OK** |
| `npm run verify:analytics` | 64 passed, 0 failed | **64 passed, 0 failed** | **OK** |
| `npm run verify:chatbot` | 266 passed, 0 failed | **266 passed, 0 failed** | **OK** |
| `npm run verify:achievements` | 73 passed, 0 failed | **73 passed, 0 failed** | **OK** |
| `npm run cleanup:orphans -- --dry-run` | 0 orphans | **0 orphans identified** | **OK** |
| **Frontend Build (`vite build`)** | Exit 0 | **Exit 0** (2323 modules transformed in 1.06s) | **OK** |
| **Frontend Lint (`oxlint`)** | <= 31 warnings | **32 warnings, 0 errors** (115 files, 116 rules, 275ms) | **BELOW BASELINE** (1 over 31 baseline) |
| `audit-banners.ts` | 0 unexplained | **120 suspects, 2 fixed, 118 false positives, 0 unexplained** | **OK** |
| `audit-mock-data.ts` | 0 hits | **0 hits across 94 scanned files** | **OK** |
| `verify-achievement-payload.ts` | 15 passed, 0 failed | **15 passed, 0 failed** | **OK** |
| `verify-chatbot-payload.ts` | 11 passed, 0 failed | **11 passed, 0 failed** | **OK** |
| `verify-comms-payload.ts` | 12 passed, 0 failed | **12 passed, 0 failed** | **OK** |
| `verify-contact-payload.ts` | 11 passed, 0 failed | **11 passed, 0 failed** | **OK** |
| `verify-dashboard-contract.ts` | 35 passed, 0 failed | **35 passed, 0 failed** | **OK** |
| `verify-datetime-helpers.ts` | 7 passed, 0 failed | **7 passed, 0 failed** | **OK** |
| `verify-development-payload.ts` | 12 passed, 0 failed | **12 passed, 0 failed** | **OK** |
| `verify-legal-links.ts` | 27 passed, 0 failed | **27 passed, 0 failed** | **OK** |
| `verify-list-helpers.ts` | 7 passed, 0 failed | **7 passed, 0 failed** | **OK** |
| `verify-match-payloads.ts` | 12 passed, 0 failed | **12 passed, 0 failed** | **OK** |
| `verify-notification-payloads.ts` | 10 passed, 0 failed | **10 passed, 0 failed** | **OK** |
| `verify-polling.ts` | 8 passed, 0 failed | **8 passed, 0 failed** | **OK** |
| `verify-recovery-payloads.ts` | 6 passed, 0 failed | **6 passed, 0 failed** | **OK** |
| `verify-refresh-singleflight.ts` | 8 passed, 0 failed | **8 passed, 0 failed** | **OK** |
| `verify-routes.ts` | 166 passed, 0 failed | **166 passed, 0 failed** | **OK** |
| `verify-safe-image.ts` | 9 passed, 0 failed | **9 passed, 0 failed** | **OK** |
| `verify-session-payload.ts` | 11 passed, 0 failed | **11 passed, 0 failed** | **OK** |
| `verify-tournament-payload.ts` | 13 passed, 0 failed | **13 passed, 0 failed** | **OK** |

---

## 3. Checklist Findings

### a. Hardcoded demo accounts, emails, or passwords in `Frontend/src`
- **Evidence**:
  - `grep_search` across `Frontend/src` for credentials returned no hardcoded credentials or initial form state logins.
  - `LoginPage.tsx:91`: `placeholder="your.email@athletiq.com"` (generic domain hint, input value defaults to `""`).
  - `RegisterPage.tsx:98`: `placeholder="Marcus Rashford"` (athlete name hint, value defaults to `""`).
  - `RegisterPage.tsx:117`: `placeholder="marcus@athlete.com"` (input placeholder hint, value defaults to `""`).
  - `AuthContext.tsx`: Initial context state is `user: null`, `isAuthenticated: false`. No hardcoded dummy users or tokens.
- **Status**: **OK** (No hardcoded credentials; only HTML input placeholders).

### b. Sidebar items, Navbar/Footer links, and `getRoleDashboard()`
- **Evidence**:
  - `verify-routes.ts` validates all sidebar items across all 5 roles against declared routes.
  - Navbar links: `/about`, `/coaches`, `/teams`, `/achievements`, `/tournaments`, `/live`, `/contact` — all routes exist and match declared public routes.
  - Footer links: `/about`, `/programs`, `/coaches`, `/teams`, `/achievements`, `/tournaments`, `/matches/live`, `/contact`, `/privacy`, `/terms`, `/code-of-conduct` — all routes exist in `App.tsx`.
  - `getRoleDashboard()` mapping:
    - `Admin` -> `/dashboard/admin` (`allowedRoles={['Admin']}`)
    - `Coach` -> `/dashboard/coach` (`allowedRoles={['Coach']}`)
    - `Athlete` -> `/dashboard/athlete` (`allowedRoles={['Athlete']}`)
    - `Organizer` -> `/dashboard/organizer` (`allowedRoles={['Organizer', 'Admin']}`)
    - `Official` -> `/dashboard/official` (`allowedRoles={['Official']}`)
- **Status**: **OK**

### c. `Frontend/src/services/academyApi.ts` vs Backend Routes (Method, Path, Roles)
- **Evidence**:
  - All 95+ methods in `academyApi.ts` map to active backend Express endpoints in `Backend/src/routes/`.
  - Full parity verified:
    - Achievements: `GET /public/achievements`, `GET /public/achievements/:id`, `GET /achievements`, `POST /achievements`, `PATCH /achievements/:id`, `DELETE /achievements/:id`. RequireRole: `Admin`.
    - Tournaments: `POST /tournaments`, `GET /tournaments`, `GET /tournaments/:id`, `PATCH /tournaments/:id`, `DELETE /tournaments/:id`. RequireRole: `Admin`, `Organizer`.
    - Matches: `GET /matches`, `POST /matches`, `GET /matches/:id`, `PATCH /matches/:id`, `POST /matches/:id/events`, `POST /matches/:id/result`. RequireRole: `Admin`, `Organizer`, `Official`.
    - Training Sessions & Attendance: `GET /training-sessions`, `POST /training-sessions`, `GET /training-sessions/:id/attendance`, `POST /training-sessions/:id/attendance`. RequireRole: `Admin`, `Coach`.
    - Development: `GET /athletes/:id/assessments`, `POST /athletes/:id/assessments`, `GET /athletes/:id/goals`, `POST /athletes/:id/goals`, `PATCH /goals/:id`. RequireRole: `Admin`, `Coach` (and Athlete self on goals).
    - Chatbot: `POST /chatbot/message`, `GET /chatbot/history`, `DELETE /chatbot/history`. RequireAuth (all roles).
    - Analytics: `GET /analytics/overview`. RequireRole: `Admin`, `Coach`, `Organizer`, `Athlete`.
- **Status**: **OK** (0 route, method, or authorization mismatches detected).

### d. Silent Defaults on API Values (`?? 0`, `|| 0`) in `Frontend/src/pages`
- **Evidence**:
  - `TournamentDetailPage.tsx:407`: `{s.assists ?? 0}` — Backend `topScorers` aggregation groups player events and calculates `assists: { $sum: ... }`. The key exists as an optional counter on the standing record.
  - `dashboard/TeamManagementPage.tsx:317`: `{t.athleteCount ?? 0}` — Backend `team.service.ts:89` attaches `athleteCount` via `$lookup`/count. The key exists in backend response.
  - `dashboard/SportManagementPage.tsx:270`: `{s.teamCount ?? 0}` — Backend `sport.service.ts:107` attaches `teamCount`. The key exists in backend response.
  - `dashboard/CoachManagementPage.tsx:314`: `{c.experienceYears ?? 0}` — Backend Coach schema defines `experienceYears: { type: Number, default: 0 }`. The key exists.
  - `AthleteProfilePage.tsx:466`: `score={attendanceRate ?? 0}` — In `AthleteProfilePage.tsx:143`, `attendanceRate` is state initialized to `null`. If attendance API hasn't loaded or athlete has no sessions, it defaults score bar to 0. (Cosmetic rendering fallback).
  - `dashboard/TournamentDetailPage.tsx:418`: `{tournament?.approvedTeamsCount || 0}` — Backend tournament controller computes `approvedTeamsCount`.
  - `dashboard/TournamentDetailPage.tsx:572`: `Squad ({r.squad?.length || 0} athletes)` — `r.squad` is an array from `TournamentTeam`.
- **Status**: **OK** (All backend keys exist in the schema and API response payloads; no required API data is masked).

### e. Backend Query Filters Missing from Schemas
- **Evidence**:
  - Examined all 250+ occurrences of `find`, `findOne`, `countDocuments`, `aggregate`, `exists` in `Backend/src/services/`.
  - Cross-referenced model schemas in `Backend/src/models/`:
    - `User`: `email`, `role`, `isActive`, `_id` — All defined.
    - `Athlete`: `user`, `team`, `sport`, `status`, `verificationStatus`, `jerseyNumber` — All defined.
    - `Coach`: `user`, `sports`, `status`, `_id` — All defined.
    - `Team`: `sport`, `coach`, `name`, `slug`, `status` — All defined.
    - `Sport`: `slug`, `name`, `isActive` — All defined.
    - `TrainingSession`: `team`, `coach`, `status`, `startTime`, `endTime`, `venue` — All defined.
    - `Attendance`: `session`, `athlete`, `status` — All defined.
    - `Tournament`: `status`, `sport`, `startDate`, `endDate`, `slug` — All defined.
    - `TournamentTeam`: `tournament`, `team`, `status` — All defined.
    - `Match`: `tournament`, `status`, `scheduledTime`, `venue`, `referee` — All defined.
    - `Official`: `user`, `role`, `status` — All defined.
    - `Achievement`: `featured`, `category`, `isActive`, `createdBy` — All defined.
    - `AuditLog`: `targetId`, `action`, `performedBy` — All defined.
    - `Notification`: `recipient`, `read`, `category` — All defined.
- **Status**: **OK** (0 field name discrepancies).

### f. `Backend/.env.example` vs `env.ts` / `process.env` / `DEPLOYMENT.md`
- **Evidence**:
  - Variables declared in `Backend/.env.example`:
    `NODE_ENV`, `PORT`, `MONGODB_URI`, `CLIENT_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_EXPIRES`, `REFRESH_GRACE_MS`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `DOCUMENT_UPLOAD_DIR`, `MAX_DOCUMENT_SIZE_BYTES`, `RATE_LIMIT_CONTACT_WINDOW_MS`, `RATE_LIMIT_CONTACT_MAX`, `RATE_LIMIT_FORGOT_PASSWORD_WINDOW_MS`, `RATE_LIMIT_FORGOT_PASSWORD_MAX`, `TRUST_PROXY`, `CORS_ORIGINS`, `FRONTEND_URL`, `COOKIE_SAMESITE`, `COOKIE_SECURE`, `COOKIE_DOMAIN`, `CHATBOT_RATE_LIMIT_WINDOW_MS`, `CHATBOT_RATE_LIMIT_MAX`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
  - Variables parsed in `Backend/src/config/env.ts`:
    Matches all core server and cookie settings.
  - Direct `process.env` readers in `mailer.service.ts`:
    Uses `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
  - Rate limit readers in `rateLimiter.ts`:
    Uses `RATE_LIMIT_CONTACT_WINDOW_MS`, `RATE_LIMIT_CONTACT_MAX`, `RATE_LIMIT_FORGOT_PASSWORD_WINDOW_MS`, `RATE_LIMIT_FORGOT_PASSWORD_MAX`, `CHATBOT_RATE_LIMIT_WINDOW_MS`, `CHATBOT_RATE_LIMIT_MAX`.
  - Comparison with `Backend/REVIEW/DEPLOYMENT.md`:
    `DEPLOYMENT.md` line 69 specifies `SMTP_FROM` (not `MAIL_FROM`), which matches `.env.example` and `mailer.service.ts` perfectly.
- **Status**: **OK** (100% naming consistency across `.env.example`, `env.ts`, `process.env`, and `DEPLOYMENT.md`).

### g. Scope Creep in Recent 15 Commits
- **Evidence**:
  1. `36e2181 step 14b: achievements UI and mock data removal` — All 28 files relate to achievements UI and removing static mock data arrays.
  2. `a721ab9 step 14: achievements CRUD backend and public endpoints` — Achievement models, routes, controllers, tests.
  3. `54d54a6 step 13-routes-fix: restore role guards` — Route guards and verify-routes assertions.
  4. `96b83c1 step 13-routes: restore dashboard routes and add route coverage test` — Restoring missing dashboard routes and test.
  5. `fb068ff step 13-check: env names, contact config, audit rules` — Included `ScorerConsolePage.tsx:211-255` wrapping the 404/loading/container divs in dark `min-h-screen bg-neutral-950` to satisfy banner audit rule without modifying scoring logic.
  6. `bf42b92 step 13b: banner fix, legal pages, code splitting, deployment docs` — Banner fixes, legal routes, and deployment documentation.
  7. `2bd05e5 step 13a: fix active team/coach counts` — Overview service counts and tests.
  8. `334ae43 step 12-fix: dashboard card mapping and contract test` — Card mapping null-safety.
  9. `e0c3485 step 12: role-based chatbot (rule-based)` — Chatbot engine, tests, UI.
  10. `932284e step 11A: production cookie/CORS fix and test user cleanup` — Cookie samesite/secure, CORS, orphan test cleaner.
  11. `9fd1cfa step 10-fix: restore refresh single-flight assertions` — Test suite assertions.
  12. `7dd6da5 step 10: notifications, password reset, analytics` — Notification, recovery, analytics vertical.
  13. `1cf3424 step 9B-fix: standings, performance, official linking, squads` — Fixes across tournament, official, and scorer console pages.
  14. `6dde98b step 9B: live match center frontend` — Live match center UI, polling hook, scorer console.
  15. `7f8a29c step 9A-fix: official role completeness` — Added `Official` check in `user.service.ts:191` to prevent role mutation if an official profile is linked (preventing dangling official records, mirroring coach/athlete guards).
- **Status**: **OK** (All touchpoints have clear contextual justification in commit logs).

### h. Mock or Fake Data Remaining on Website
- **Evidence**:
  - `audit-mock-data.ts`: Scanned 94 files in `Frontend/src`, returned **0 hits**.
  - `HomePage.tsx`: Featured achievements and coaches load dynamically via `/api/public/achievements?featured=true` and `/api/public/coaches`. Brackets, fake scores, and Alex Morgan spotlight have been removed.
  - `GalleryPage.tsx` and `NewsPage.tsx`: Replaced with honest "Coming Soon" status banners.
  - `AboutPage.tsx`: Unsplash URLs removed, styled with brand gradient athletic containers.
  - Placeholder strings:
    - `RegisterPage.tsx:98`: `placeholder="Marcus Rashford"` (input placeholder hint).
    - `RegisterPage.tsx:117`: `placeholder="marcus@athlete.com"` (input placeholder hint).
    - `LoginPage.tsx:91`: `placeholder="your.email@athletiq.com"` (input placeholder hint).
    - `ContactPage.tsx`: Generic field hints (`"Enter your full name"`).
    - `siteConfig.ts`: Legal placeholders (`"[LEGAL_ENTITY_NAME]"`, `"[CONTACT_PHONE]"`, `"[CONTACT_EMAIL]"`, `"[CONTACT_ADDRESS]"`, `"[GOVERNING_LAW]"`).
- **Status**: **OK** (No active mock data or sample photos on live pages).

### i. Remnants of the Official LOGIN Role (Step 15 Pending)
- **Evidence**:
  - Step 15 has NOT been committed yet.
  - Official role login/dashboard remnants present in active codebase:
    - `Frontend/src/context/AuthContext.tsx:17`: `export type UserRole = 'Admin' | 'Coach' | 'Athlete' | 'Organizer' | 'Official';`
    - `Frontend/src/App.tsx:140`: Route `/dashboard/official` (`allowedRoles={['Official']}`)
    - `Frontend/src/components/DashboardLayout.tsx:131`: Sidebar navigation items for `case 'Official'`
    - `Frontend/src/components/Navbar.tsx:38`: `getRoleDashboard()` case `'Official': return '/dashboard/official';`
    - `Frontend/src/pages/dashboard/OfficialDashboardPage.tsx`: Page component
    - `Backend/src/models/User.ts:10`: User role enum includes `'Official'`
    - `Backend/src/services/dashboard.service.ts:502`: Official dashboard overview mapper
- **Status**: **DEFECT / PENDING STEP 15** (Expected prior to Step 15 execution).

### j. `audit-banners.ts` Classification Rules & 10 Sample False Positives
- **Classification Rules**:
  1. Scans every `.tsx` file in `Frontend/src/pages/` for heading/paragraph tags (`h1`-`h6`, `p`) containing `text-white`.
  2. Inspects up to 200 preceding lines looking for dark background indicator classes (`bg-[#171044]`, `bg-neutral-900`, `bg-neutral-950`, `bg-black`, `bg-[#0F0B26]`, `bg-[#FF5A00]`, `from-[#171044]`, `from-black`, etc.).
  3. If found within a dark container, the item is classified as a verified **FALSE POSITIVE** (intended high-contrast white text on dark background).
  4. If explicitly wrapped by an approved banner fix (such as `NotificationsPage.tsx:115`), classified as **FIXED**.
  5. Any `text-white` element lacking a dark ancestor is flagged as an **UNEXPLAINED SUSPECT** (fails the build).
- **10 Sample False Positives**:
  1. `Frontend/src/pages/LoginPage.tsx:84`: `<label className="... text-white/80">` — Justified by ancestor at line 67 (`bg-[#171044]` card container).
  2. `Frontend/src/pages/RegisterPage.tsx:91`: `<label className="... text-white/80">` — Justified by ancestor at line 68 (`bg-[#171044]` card container).
  3. `Frontend/src/pages/ForgotPasswordPage.tsx:81`: `<label className="... text-white/80">` — Justified by ancestor at line 64 (`bg-[#171044]` card container).
  4. `Frontend/src/pages/ResetPasswordPage.tsx:103`: `<label className="... text-white/80">` — Justified by ancestor at line 84 (`bg-[#171044]` card container).
  5. `Frontend/src/pages/ContactPage.tsx:156`: `<label className="... text-white/80">` — Justified by ancestor at line 132 (`bg-[#171044]` card container).
  6. `Frontend/src/pages/HomePage.tsx:758`: `<label className="... text-white/80">` — Justified by ancestor at line 737 (`bg-[#171044]` banner container).
  7. `Frontend/src/pages/dashboard/AdminDashboard.tsx:61`: `<h1 className="... text-white">` — Justified by ancestor at line 59 (`bg-[#171044]` header banner).
  8. `Frontend/src/pages/dashboard/CoachDashboard.tsx:68`: `<h1 className="... text-white">` — Justified by ancestor at line 66 (`bg-[#171044]` header banner).
  9. `Frontend/src/pages/dashboard/AthleteDashboard.tsx:78`: `<h1 className="... text-white">` — Justified by ancestor at line 76 (`bg-[#171044]` header banner).
  10. `Frontend/src/pages/dashboard/ScorerConsolePage.tsx:219`: `<h2 className="... text-white">` — Justified by ancestor at line 214 (`bg-neutral-950` dark console layout).

### k. `npm audit --omit=dev` Results
- **Backend**:
  ```text
  found 0 vulnerabilities
  ```
  Status: **OK** (Clean production dependencies).
- **Frontend**:
  ```text
  # npm audit report

  source-map-js  1.0.0 - 1.2.1
  Severity: high
  source-map-js allows event-loop denial of service through indexed source-map section offsets - https://github.com/advisories/GHSA-68fv-2mgg-jv7q
  fix available via `npm audit fix`
  node_modules/source-map-js

  1 high severity vulnerability
  ```
  Dependency chain: `source-map-js` is an indirect sub-dependency brought in by `postcss` (via `vite`) and `@tailwindcss/node` (via `@tailwindcss/vite`).
  Status: **SECURITY (DEV/BUILD SUB-DEPENDENCY)**.

### l. Images in `Frontend/src/assets` Above 300 kB
- Directory listing of `Frontend/src/assets`:
  1. `hero_athlete.jpg`: **991,994 bytes (~968 kB)**
     - Usage: `Frontend/src/pages/HomePage.tsx:22` (Hero section visual asset).
  2. `trophy_spotlight.jpg`: **798,610 bytes (~780 kB)**
     - Usage: `Frontend/src/pages/HomePage.tsx:23` (Tournament CTA section visual asset).
  3. `hero.png`: 13,057 bytes (< 300 kB)
  4. `react.svg`: 4,126 bytes (< 300 kB)
  5. `vite.svg`: 8,709 bytes (< 300 kB)
- Both large images are actively imported in `HomePage.tsx`. Optimization/compression (e.g., WebP conversion) would reduce initial bundle transfer weight.
- Status: **COSMETIC / PERFORMANCE OPTIMIZATION**.

---

## 4. Comprehensive Health Findings & Action Table

| ID | Area | Evidence | Severity | Proposed Minimal Fix | Files Touched |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **H-01** | Official Role Remnants | Official role enum in `AuthContext.tsx`, `User.ts`, `App.tsx`, `DashboardLayout.tsx` (Step 15 task) | **BLOCKS DEMO / CLEANUP** | Complete Step 15 to remove Official login role while preserving match referee entity and tournament assignment relations. | `Backend/src/models/User.ts`, `Frontend/src/context/AuthContext.tsx`, `Frontend/src/App.tsx`, `Frontend/src/components/DashboardLayout.tsx`, `Frontend/src/components/Navbar.tsx` |
| **H-02** | Frontend ESLint Warning Baseline | `oxlint` reported 32 warnings (baseline was <= 31); 2 unused imports in `HomePage.tsx:15-16` (`Trophy`, `Award`) | **COSMETIC** | Remove unused imports `Trophy`, `Award` in `HomePage.tsx` to restore warning count to 30 (below 31 baseline). | `Frontend/src/pages/HomePage.tsx` |
| **H-03** | Frontend Sub-dependency Vulnerability | `npm audit --omit=dev` flagged `source-map-js` (GHSA-68fv-2mgg-jv7q) under `@tailwindcss/vite` and `vite`/`postcss` | **SECURITY (BUILD TOOLING)** | Run `npm audit fix` or update Vite/Tailwind plugin packages to pick up patched `source-map-js` version. | `Frontend/package.json`, `Frontend/package-lock.json` |
| **H-04** | Large Hero Image Assets | `hero_athlete.jpg` (968 kB) and `trophy_spotlight.jpg` (780 kB) in `Frontend/src/assets` | **COSMETIC / PERF** | Compress images to WebP format or reduce JPEG quality to bring both files under 250 kB. | `Frontend/src/assets/hero_athlete.jpg`, `Frontend/src/assets/trophy_spotlight.jpg` |
| **H-05** | Production Site Configuration | `siteConfig.ts` contains template placeholders (`[LEGAL_ENTITY_NAME]`, `[CONTACT_PHONE]`, `[CONTACT_EMAIL]`, `[CONTACT_ADDRESS]`) | **COSMETIC** | Replace bracketed placeholders in `siteConfig.ts` with real academy details upon final domain deployment. | `Frontend/src/lib/siteConfig.ts` |
