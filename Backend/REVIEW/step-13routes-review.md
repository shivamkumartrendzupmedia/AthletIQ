# Step 13-Routes Review

## Symptom

Opening `/dashboard/messages` (Admin, Contact Messages) renders the public NotFoundPage.
Root cause: step 13b rewrote `App.tsx` for lazy loading and dropped/mutated several routes.
Confirmed from code via `git show bf42b92~1:Frontend/src/App.tsx`.

---

## Route Regression Table (confirmed from code)

| Path | Before 13b | After 13b | Guard before | Guard after | Status |
|---|---|---|---|---|---|
| `/dashboard/admin` | YES | YES | Admin | Admin | OK |
| `/dashboard/coach` | YES | YES | Coach | Coach | OK |
| `/dashboard/athlete` | YES | YES | Athlete | Athlete | OK |
| `/dashboard/organizer` | YES | YES | Organizer, Admin | Organizer | GUARD NARROWED |
| `/dashboard/messages` | YES | NO | Admin | — | MISSING |
| `/dashboard/athletes` | YES | YES | Admin, Coach | Admin, Coach | OK |
| `/athlete/me` | YES | YES | Athlete | Athlete | OK |
| `/athlete/:id` | YES | NO | Admin, Coach, Athlete | — | MISSING |
| `/dashboard/coaches` | YES | YES | Admin | Admin | OK |
| `/dashboard/teams` | YES | YES | Admin, Coach, Organizer | Admin | GUARD NARROWED |
| `/dashboard/sports` | YES | YES | Admin | Admin | OK |
| `/dashboard/rosters` | YES | renamed to /dashboard/roster | Admin | Admin, Coach | RENAMED + GUARD CHANGED |
| `/dashboard/users` | YES | YES | Admin | Admin | OK |
| `/dashboard/documents` | YES | YES | Admin, Coach, Athlete, Organizer | Admin, Coach, Athlete | GUARD NARROWED |
| `/dashboard/announcements` | YES | YES | Admin, Coach, Athlete, Organizer | Admin, Coach, Athlete, Organizer, Official | OK (wider is safe) |
| `/dashboard/training` | YES | YES | Admin, Coach, Athlete, Organizer | Admin, Coach, Athlete | GUARD NARROWED |
| `/dashboard/tournaments` | YES | YES | Admin, Organizer, Coach, Athlete | Admin, Organizer, Coach | GUARD NARROWED |
| `/dashboard/tournaments/:id` | YES | YES | Admin, Organizer, Coach, Athlete | Admin, Organizer, Coach | GUARD NARROWED |
| `/dashboard/venues` | YES | YES | Admin, Organizer | Admin, Organizer | OK |
| `/dashboard/officials` | YES | YES | Admin, Organizer | Admin | GUARD NARROWED |
| `/dashboard/official` | YES | YES | Official | Official | OK |
| `/dashboard/live` | YES | YES | Official, Admin, Organizer | Admin, Official | GUARD NARROWED |
| `/dashboard/live/:matchId` | YES | NO (renamed /dashboard/matches/:id/score, no DashboardLayout) | Official, Admin, Organizer | Admin, Official | MISSING + BROKEN |
| `/dashboard/inquiries` | NO | YES | — | Admin | NEW alias |
| `/dashboard/notifications` | YES | YES | Admin, Coach, Athlete, Organizer, Official | Admin, Coach, Athlete, Organizer, Official | OK |
| `/dashboard/analytics` | YES | YES | Admin, Coach, Athlete | Admin, Coach, Athlete | OK |

---

## Defects Fixed

### 1. `/dashboard/messages` — DROPPED
Sidebar (`DashboardLayout.tsx:80`) points to `/dashboard/messages`. Route missing from `App.tsx`.
Fix: restore with `allowedRoles={['Admin']}` + `DashboardLayout`.

### 2. `/dashboard/rosters` — RENAMED to `/dashboard/roster`
Sidebar (`DashboardLayout.tsx:88`) uses `/dashboard/rosters` (plural).
Current `App.tsx` has `/dashboard/roster` (singular) with guard expanded to Admin+Coach.
Fix: restore `/dashboard/rosters` with `allowedRoles={['Admin']}` per original.

### 3. `/dashboard/live/:matchId` — DROPPED
Before-13b had `ScorerConsolePage` at `/dashboard/live/:matchId` with `DashboardLayout`.
After-13b replaced with `/dashboard/matches/:id/score` without `DashboardLayout`, narrowed guard.
Fix: restore `/dashboard/live/:matchId` with `allowedRoles={['Official', 'Admin', 'Organizer']}` + `DashboardLayout`.
The `/dashboard/matches/:id/score` alias is kept with `DashboardLayout` for backward compatibility.

### 4. `/athlete/:id` — DROPPED
Before-13b: `allowedRoles={['Admin', 'Coach', 'Athlete']}` + `DashboardLayout`.
Fix: restore under ProtectedRoute with `allowedRoles={['Admin', 'Coach', 'Athlete']}`.

### 5. Guard regressions restored to before-13b values

| Path | Restored guard |
|---|---|
| `/dashboard/organizer` | `['Organizer', 'Admin']` |
| `/dashboard/live` | `['Official', 'Admin', 'Organizer']` |
| `/dashboard/teams` | `['Admin', 'Coach', 'Organizer']` |
| `/dashboard/documents` | `['Admin', 'Coach', 'Athlete', 'Organizer']` |
| `/dashboard/training` | `['Admin', 'Coach', 'Athlete', 'Organizer']` |
| `/dashboard/tournaments` | `['Admin', 'Organizer', 'Coach', 'Athlete']` |
| `/dashboard/tournaments/:id` | `['Admin', 'Organizer', 'Coach', 'Athlete']` |
| `/dashboard/officials` | `['Admin', 'Organizer']` |

---

## Files Changed
- `Frontend/src/App.tsx` — restored routes + corrected guards
- `Frontend/scripts/verify-routes.ts` — route coverage script (stdlib only, zero `any`)
