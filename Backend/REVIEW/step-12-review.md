# STEP 12 — Role-Based Chatbot Architecture & Review

## 1. Executive Summary & Design Principles

The ATHLETIQ Chatbot is a **deterministic, rule-based assistant** designed for production environments requiring strict security, predictable behavior, and data privacy.

### Core Architecture Rules
1. **Zero External AI / LLM Dependency**:
   - No external APIs (OpenAI, Gemini, Anthropic, etc.).
   - No API keys stored, queried, or required anywhere.
   - 100% deterministic local pattern matching and template rendering.
2. **Zero Direct Database Access**:
   - The chatbot engine does **not** execute direct Mongoose queries.
   - All data fetching routes through existing, audited domain services (`dashboard.service`, `development.service`, `tournament.service`, `training.service`, `scope.service`, `analytics.service`, `notification.service`).
3. **Session-Enforced Identity & Scope**:
   - The user identity and role are strictly derived from the authenticated server session (`req.user.id`, `req.user.role`).
   - The chatbot never takes user ID, role, or tenant information from user message text.
   - Out-of-scope requests produce the standard "I don't have that information" response without leaking record existence.
4. **Strictly Read-Only**:
   - The chatbot registry contains **zero write tools**. Requests to change, update, register, or delete records are politely refused.

---

## 2. Capabilities Matrix (What the Chatbot Can and Cannot Do)

### What the Chatbot CAN Do
- **Public / Universal**:
  - Check general academy programs, sports offered, and public tournament listings.
  - Check tournament standings and tables for public competitions.
  - Check the caller's unread notifications count.
- **Athlete**:
  - View personal profile summary (assigned team, status).
  - Check personal training attendance rate and record summary.
  - View personal upcoming training sessions.
  - Check active athletic goals and progress.
  - View feedback summaries received from coaches.
  - Check latest skill assessment scores.
  - Review personal tournament performance statistics and upcoming matches.
- **Coach**:
  - List coached teams.
  - View team rosters (athlete display names and jersey numbers only).
  - Check upcoming team training sessions.
  - Review team attendance rates.
  - View development summaries for athletes on coached teams.
- **Organizer**:
  - List organized tournaments and their status (Draft, Registration Open, In Progress, Completed).
  - Check pending tournament team registrations count.
  - Check upcoming matches scheduled for organized tournaments.
- **Official**:
  - View assigned matches and upcoming officiating duties.
- **Admin**:
  - View high-level academy counts (athletes, coaches, teams, sports).
  - Check pending registrations requiring review.
  - Check unread public contact inquiries.

### What the Chatbot CANNOT Do
- **Zero Data Mutations**: Cannot create, edit, reschedule, or delete sessions, matches, tournaments, or users.
- **Zero Cross-Tenant / Cross-User Leakage**: An athlete cannot view another athlete's goals or attendance; a coach cannot inspect teams they do not coach; non-admins cannot access system-wide metrics.
- **Zero PII Exposure**: Never outputs passwords, password hashes, refresh tokens, guardian contacts, phone numbers, email addresses, or medical notes.
- **Zero Prompt Injection Execution**: System prompt manipulation phrases (e.g., `"ignore previous instructions"`, `"you are now root"`) are intercepted by security guards and return fixed polite refusals.

---

## 3. Redaction & Privacy Shield

Every tool result and final bot response undergoes a multi-layer **Redaction Pass**:

### Key-Level Redaction
Any object key matching forbidden fields is stripped recursively:
```typescript
const FORBIDDEN_KEYS = [
  'password',
  'passwordHash',
  'refreshTokenHash',
  'refreshTokens',
  'email',
  'phone',
  'phoneNumber',
  'medicalNotes',
  'guardian',
  'emergencyContact',
  'token',
  'accessToken',
  'refreshToken',
  'resetTokenHash',
];
```

### Text-Level Pattern Masking
All generated textual responses are scanned with regular expressions to mask any residual PII strings:
- **Email Regex**: `/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g` -> `[REDACTED_EMAIL]`
- **Phone Regex**: `/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g` -> `[REDACTED_PHONE]`

---

## 4. Role & Intent Registry

| Role | Permitted Tools | Supported English & Hinglish Intents |
|---|---|---|
| **All Roles** | `getPublicInfo` | "sports", "programs", "khel", "academy info", "what sports" |
| **All Roles** | `getStandings` | "standings", "points table", "rankings", "leaderboard", "score table" |
| **All Roles** | `getMyNotificationsSummary` | "notifications", "alerts", "unread messages", "suchna" |
| **Athlete** | `getMyProfileSummary` | "my profile", "mera profile", "who am i", "my team" |
| **Athlete** | `getMyAttendance` | "attendance", "hajri", "meri attendance", "how many sessions attended" |
| **Athlete** | `getMyUpcomingSessions` | "upcoming sessions", "next training", "agla practice", "when is practice" |
| **Athlete** | `getMyGoals` | "goals", "lakshya", "my targets", "active goals" |
| **Athlete** | `getMyFeedbackSummary` | "feedback", "coach remarks", "coach ne kya bola", "my reviews" |
| **Athlete** | `getMyLatestAssessment` | "assessment", "skills", "ratings", "score card", "evaluation" |
| **Athlete** | `getMyTournamentPerformance` | "my performance", "tournament stats", "goals scored", "mera performance" |
| **Athlete** | `getMyNextMatches` | "next match", "agla match", "kab hai match", "upcoming matches" |
| **Coach** | `getMyTeams` | "my teams", "meri teams", "which teams do i coach" |
| **Coach** | `getMyTeamRoster` | "roster", "squad", "team players", "khiladi", "who is in team" |
| **Coach** | `getMyUpcomingSessions` | "my sessions", "training schedule", "practice schedule" |
| **Coach** | `getMyTeamAttendance` | "team attendance", "attendance rate", "bacchon ki hajri" |
| **Coach** | `getAthleteDevelopmentSummary` | "athlete progress", "player stats", "development", "how is player doing" |
| **Organizer** | `getMyTournaments` | "my tournaments", "tournaments managed", "pratiyogita" |
| **Organizer** | `getMyRegistrationsSummary` | "registrations", "pending teams", "kitni teams aayi" |
| **Organizer** | `getMyUpcomingMatches` | "tournament matches", "schedule", "scheduled games" |
| **Official** | `getMyAssignedMatches` | "my matches", "assigned games", "referee duty", "agla match official" |
| **Admin** | `getAcademyOverview` | "overview", "academy stats", "total users", "kitne athletes hain" |
| **Admin** | `getPendingRegistrationsCount` | "pending registrations", "registrations to approve" |
| **Admin** | `getUnreadContactMessagesCount` | "contact inquiries", "unread messages", "support tickets" |

---

## 5. Guide: How to Add a New Intent

To extend the chatbot with a new query capability:

1. **Verify Read-Only Safety**: Ensure the capability only reads data and reuses an existing domain service method.
2. **Define the Tool in `tools.registry.ts`**:
   - Add tool name to `ChatbotToolName` union type.
   - Define input schema with `z.object({...}).strict()`.
   - Add the tool function to `TOOL_REGISTRY` returning sanitized facts.
   - Add tool name to authorized roles in `ROLE_ALLOWED_TOOLS`.
3. **Register Keywords in `chatbot.router.ts`**:
   - Add intent descriptor to `INTENT_DEFINITIONS` with keywords, phrases, and Hinglish variants.
   - Link intent to target tool name and role permissions.
4. **Define Plain-Text Response Template**:
   - Add a deterministic template function in `template.generator.ts` converting the tool output to human-friendly text.
5. **Update Verification Tests**:
   - Add table-driven evaluation questions in `verify-chatbot.ts`.
   - Assert role restrictions, response format, and deep redaction.
