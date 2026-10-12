# Step 10 Review — Notifications, Password Recovery, and Analytics Architecture

## 1. Overview & Architectural Scope
Step 10 implements core enterprise notification, account recovery, and analytical reporting features across both Backend and Frontend:
- **In-App Notifications**: Real-time actionable notification stream with unread counts, pagination, FIFO storage cap of 200 items per user, and 5 system event triggers.
- **Transactional Password Recovery**: Zero-leakage email forgot/reset password flow using sha256 token hashing, 30-minute token lifetimes, 60-second user cooldowns, IP rate limiting, and session revocation upon password change.
- **Analytical Reporting**: Role-tailored time-series and aggregate metrics for Admins, Coaches, and Athletes, bucketed weekly starting Monday 00:00 UTC.

---

## 2. Notification System Architecture & Trigger Recipients

### Data Model & Indexing
- **Collection**: `Notification`
- **Fields**:
  - `user`: `Types.ObjectId` (ref: `User`, indexed, required)
  - `type`: `NotificationType` enum (`'Announcement'`, `'Assessment'`, `'Feedback'`, `'Match'`, `'Goal'`, `'System'`)
  - `title`: `string` (max 120 chars, trimmed)
  - `body`: `string` (max 300 chars, plain text)
  - `link`: `string` (relative link starting with `/` and not `//`)
  - `readAt`: `Date | null` (default: `null`)
  - `createdAt`: `Date` (default: `Date.now`)
- **Indexes**:
  - `{ user: 1, createdAt: -1 }` (compound index for fast user notification listing and FIFO cleanup)
  - `{ user: 1, readAt: 1 }` (for sub-millisecond unread count calculation)

### FIFO Cap & Dispatching
- **FIFO Cap**: Enforced to 200 notifications per user. During notification dispatch, if a user's notification count exceeds 200, excess older notifications are deleted atomically.
- **Service Helper**: `notify(userIds: (string | Types.ObjectId)[], payload: NotificationPayload): Promise<void>`
  - Fire-and-forget: Execution is safe and will never throw into or fail the triggering HTTP request.
  - De-duplicates target user IDs.
  - Maximum 500 recipients per dispatch.

### 5 Exact Triggers & Recipients
1. **Announcement Published** (`ANNOUNCEMENT_CREATED`):
   - **Recipients**: Active users matching the announcement audience (`All` -> all active users; `Athletes` -> athlete users; `Coaches` -> coach users; `Team` -> roster athletes & coach).
   - **Payload**: Title: `New Announcement: <title>`, Body: summary snippet (<=300 chars), Link: `/dashboard/announcements`.
2. **Skill Assessment Created** (`SKILL_ASSESSMENT_CREATED`):
   - **Recipients**: The assessed athlete's user account (`athlete.user`).
   - **Payload**: Title: `New Skill Assessment Recorded`, Body: Assessment score summary, Link: `/dashboard/assessments`.
3. **Coach Feedback Created** (`COACH_FEEDBACK_CREATED`):
   - **Recipients**: The recipient athlete's user account (`athlete.user`).
   - **Payload**: Title: `New Coach Feedback Received`, Body: Feedback text snippet, Link: `/dashboard/feedback`.
4. **Match Completed / Status Updated** (`MATCH_STATUS_CHANGED`):
   - **Recipients**: Coaches of competing teams and assigned official (`match.referee.user`).
   - **Payload**: Title: `Match <Status>: <HomeTeam> vs <AwayTeam>`, Body: Final or current score, Link: `/matches/<matchId>`.
5. **Athlete Goal Created / Updated** (`ATHLETE_GOAL_UPDATED`):
   - **Recipients**: The goal owner's user account (`athlete.user`).
   - **Payload**: Title: `Goal Updated: <title>`, Body: Updated goal status and target date, Link: `/dashboard/goals`.

---

## 3. Password Recovery & Security Specifications

### Token Lifecycle & Hashing
- **Entropy**: 32 cryptographically secure random bytes generated as a 64-character hex string (`crypto.randomBytes(32).toString('hex')`).
- **One-Way Hash**: Stored in `PasswordReset` collection as `tokenHash = crypto.createHash('sha256').update(token).digest('hex')`. The raw token is sent only in the reset link email and never persisted to the database.
- **Lifetime**: Exactly 30 minutes from generation (`expiresAt = Date.now() + 30 * 60 * 1000`).
- **TTL Index**: MongoDB TTL index on `expiresAt` with `expireAfterSeconds: 0`.

### Defense in Depth & Rate Limiting
- **Constant Response**: `POST /api/auth/forgot-password` always returns HTTP 200 with an identical message whether the email exists, is deactivated, or does not exist.
- **IP Rate Limit**: Dedicated strict rate limiter on forgot-password endpoint allowing at most 5 attempts per hour per IP.
- **User Cooldown**: 60-second cooldown per account. If a password reset token was created for the user within the last 60 seconds, no duplicate email is dispatched, but HTTP 200 is returned.
- **Atomic Consumption**: `POST /api/auth/reset-password` consumes the token via atomic `findOneAndUpdate` checking `tokenHash`, `usedAt: null`, and `expiresAt > Date.now()`.
- **Session Revocation**: Upon successful password reset, all active user refresh tokens and sessions are revoked, account lockout counters are cleared (`failedLoginAttempts = 0`, `isLocked = false`), and an audit log entry is recorded.
- **Injectable Mailer**: Transactional mailer supports injected transport with development fallback/mock mode for test harnesses.

---

## 4. Analytics Engine & Weekly Bucketing

### Weekly Bucket Specification
- **Definition**: Every time-series data point is grouped into weekly intervals aligned to **Monday 00:00:00.000 UTC**.
- **Calculation Formula**:
  ```ts
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diffToMonday = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diffToMonday);
  d.setUTCHours(0, 0, 0, 0);
  const mondayIso = d.toISOString();
  ```
- **Continuity**: Continuous 8-week historical window; zero-filled so weeks with no recorded activity return count `0` rather than missing keys.

### Role Authorization & Metrics Matrix
- **Endpoint**: `GET /api/analytics/overview`
- **Role Isolation**:
  - `Admin`: Global platform growth (weekly user registrations, active sessions trend, overall attendance rate, tournament completion stats).
  - `Coach`: Team-specific performance (weekly attendance rates, skill assessment averages over time, active athlete count).
  - `Athlete`: Personal trajectory (weekly session attendance, personal skill progress over time, tournament match history).
  - `Organizer`, `Official`: Forbidden (HTTP 403).
