# STEP 7-FIX REVIEW: Athlete Profile Auth on Hard Reload & Single-Flight Refresh

## Root Cause Analysis
1. **Public Route Exposure & Public Navbar:**
   - In `App.tsx`, `/athlete/:id` was mounted inside the wildcard public website routes (`path="*"` with `<Navbar />`) without `<ProtectedRoute>` or `<DashboardLayout>`.
   - `/athlete/me` was not explicitly declared and fell into `/athlete/:id` under the same public layout.
   - When reloading `http://localhost:5173/athlete/<id>`, the public navbar rendered instead of the dashboard layout.

2. **Session Restore Race & Duplicate Refresh Calls:**
   - On hard page reload, the in-memory access token is initialized to `null`.
   - `AuthContext` starts in `isLoading: true` and triggers a silent startup session restore.
   - Because `/athlete/:id` was not wrapped in `ProtectedRoute` (which blocks rendering while `isLoading: true`), `AthleteProfilePage` mounted immediately.
   - Its `useEffect` immediately fired `GET /api/athletes/<id>/development` with no token, which returned `401 Unauthorized`.
   - `apiClient` had its own independent `refreshPromise`, while `AuthContext` had a separate `startupRefreshPromise`.
   - As a result, two parallel `POST /api/auth/refresh` requests were issued concurrently with the identical refresh token cookie.

3. **Backend Token Reuse Detection Triggered:**
   - On the backend, `authService.refresh()` performs token rotation, atomically removing (`$pull`) the consumed token hash from the user document.
   - Call 1 succeeded and rotated the token.
   - Call 2 arrived with the old token. The signature was valid, but its hash was missing from `user.refreshTokens`.
   - Backend Token Reuse Detection was triggered (`auth.service.ts:198-208`), revoking **all active sessions** (`refreshTokens: []`) and returning `401`.
   - `apiClient` received the 401, wiped the token, removed the session flag, triggered `onSessionExpired()`, and the retried development call failed with 401.

## Fix Implementation
1. **App.tsx Route Declarations:**
   - Declared `/athlete/me` explicitly before `/athlete/:id`.
   - Protected `/athlete/me` with `allowedRoles={['Athlete']}`.
   - Protected `/athlete/:id` with `allowedRoles={['Admin', 'Coach', 'Athlete']}`.
   - Both routes wrapped in `ProtectedRoute` and `DashboardLayout`.
   - Disallowed roles (e.g. Organizer) are redirected by `ProtectedRoute` to their role dashboard (`/dashboard/tournaments`).
   - Removed `/athlete/:id` from the public website section.

2. **Unified Single-Flight Refresh Coordinator in `apiClient.ts`:**
   - Exported `refreshAccessToken(): Promise<RefreshResult | null>` from `apiClient.ts`.
   - Coordinates a single module-level `refreshPromise`.
   - Removed duplicate `startupRefreshPromise` and `executeStartupRefresh` from `AuthContext.tsx`.
   - Both startup session restore and 401 response interceptors await the identical in-flight promise.
   - Guarantees exactly one `POST /api/auth/refresh` call per reload, eliminating parallel refresh calls and preventing reuse detection false positives.
   - Promise is cleared in a `finally` block so subsequent genuine expirations start fresh refresh requests.
   - On refresh failure (401), clears token, removes session flag, invokes `onSessionExpired` once, and rejects all callers.
   - Excludes `/auth/*` endpoints from auto-refresh.

3. **Known Limitation Note:**
   - Backend refresh token reuse detection revokes all sessions when the same refresh token is presented twice.
   - The frontend now completely prevents concurrent double calls via the unified single-flight coordinator.
   - No grace period window was added to the backend in this step; the backend remains untouched.
