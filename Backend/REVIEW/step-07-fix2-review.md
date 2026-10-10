# STEP 7-FIX-2 REVIEW: Refresh Race on Reload & Grace Window Token Rotation

## 1. Problem & Root Cause Analysis
- **Symptom:** Rapid browser reloads (e.g. 3x F5) could log the user out due to refresh token reuse detection.
- **Root Cause:**
  - When the browser reloaded, `POST /api/auth/refresh` was issued. The backend rotated the refresh token (replaced the stored hash) and sent `Set-Cookie`.
  - If a user rapidly reloaded the page again before the browser received or committed the `Set-Cookie` response header into the cookie jar, the subsequent reload presented the *old* refresh token cookie.
  - Because previously any old token immediately triggered Stolen Token Reuse Detection, the backend revoked **all** user sessions (`refreshTokens: []`) and returned `401 Unauthorized`.

---

## 2. Architecture & Design Corrections

### A. Token History List (`recentHashes`)
Instead of storing only a single `previousTokenHash`, each session entry in `User.refreshTokens` now tracks:
```ts
recentHashes: [{ hash: string, at: Date }] // max 5 entries
```
- On **every rotation**, the hash being replaced is appended with `at: now`.
- Entries older than `now - GRACE_MS` are pruned.
- The timestamp `at` of an entry is **never refreshed**. As a result, the validity window for any given replaced token is strictly bounded by `REFRESH_GRACE_MS` (30 seconds) from the moment it was originally superseded, and cannot be extended by repeated usage.

### B. Configurable Grace Window
- Added `REFRESH_GRACE_MS` to `Backend/src/config/env.ts` with Zod validation:
  ```ts
  REFRESH_GRACE_MS: z.coerce.number().int().nonnegative().default(30000)
  ```
- Added `REFRESH_GRACE_MS=30000` to `Backend/.env.example`.
- Configurable via environment so tests can test short windows (e.g. 100ms, 300ms) without artificial 30-second delays.

### C. Single-Atomic Update Queries per Branch
Both the normal path and the grace path use atomic MongoDB updates with `$elemMatch`:

1. **Normal Path Update:**
   - Filter:
     ```ts
     { _id: sub, refreshTokens: { $elemMatch: { tokenHash: presentedHash } } }
     ```
   - Update:
     ```ts
     {
       $set: {
         'refreshTokens.$.tokenHash': newHash,
         'refreshTokens.$.updatedAt': now,
         'refreshTokens.$.expiresAt': newExpiresAt,
         'refreshTokens.$.userAgent': userAgent,
         'refreshTokens.$.ipAddress': ipAddress,
       },
       $push: {
         'refreshTokens.$.recentHashes': {
           $each: [{ hash: presentedHash, at: now }],
           $slice: -5,
         },
       },
     }
     ```

2. **Grace Path Update:**
   - Filter (Nested `$elemMatch` ensures `hash` and `at` match on the EXACT same `recentHashes` entry):
     ```ts
     {
       _id: sub,
       refreshTokens: {
         $elemMatch: {
           recentHashes: {
             $elemMatch: {
               hash: presentedHash,
               at: { $gte: graceThreshold },
             },
           },
         },
       },
     }
     ```
   - Update (Atomic Pipeline):
     Maps over `refreshTokens` to locate the matching session, rotate `tokenHash` to `newHash`, append current `tokenHash` with `at: now`, filter out stale `recentHashes` older than `graceThreshold`, and slice to 5 entries.
   - Defensive Guard:
     After the atomic update, verifies that the returned user contains a session whose `tokenHash === newTokenHash`. If not verified, sets `user = null` to immediately cascade to session revocation and 401.
   - Audit Logging: Creates `AuditLog` entry with action `'REFRESH_GRACE_REUSE'`, `targetType: 'User'`, and metadata containing only IDs (`userId`, `targetId`).

3. **Stolen Token Reuse / Outside Grace Window:**
   - If token signature is valid for user `sub` but not matched by normal or grace filters:
   - Atomically revokes all sessions:
     ```ts
     await User.updateOne({ _id: sub }, { $set: { refreshTokens: [] } });
     ```
   - Emits `AuditLog` action `'REFRESH_TOKEN_REUSE'` and returns `401 Unauthorized`.

---

## 3. Verification Suite Summary
- **Backend `verify-auth.ts`:**
  - All original 30 assertions preserved and green.
  - Group 10 added with 20 new assertions covering:
    - (a) Old token within grace window => 200, sessions not revoked.
    - (b) Same old token after grace window => 401 and ALL sessions revoked.
    - (c) Parallel `Promise.all` of 2 refreshes with same token => no 500, both returned tokens can each refresh inside window.
    - (d) Window is unextendable: re-presenting old token after original window ends => 401 & sessions revoked.
    - (e) Random invalid token => 401 with no side effect on other users.
    - (f) Multi-session isolation: grace rotation of session 1 does not invalidate session 2.
    - (g) Audit action `REFRESH_GRACE_REUSE` recorded with IDs only.
  - Total `verify:auth` assertions: **50 passed, 0 failed**.
