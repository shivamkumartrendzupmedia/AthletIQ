# Step 9B Review — Live Match Center Frontend Architecture

## 1. Overview & Architectural Decisions
Step 9B completes the Live Match Center by providing comprehensive, responsive frontend interfaces for match day operations and public spectators:
- **Role Integration**: Added `Official` to `UserRole` across the application. Officials land on `/dashboard/official` and have focused sidebar access to their Dashboard and Live Console (`/dashboard/live`).
- **Scorer Console (`/dashboard/live/:matchId`)**: Live operator console with atomic state machine transition controls (Start, Half Time, Start Second Half, Full Time, Cancel), confirmation dialogs, real-time liveScore display, event creation with squad-scoped player selection, timeline with administrative event correction, and error banner mapping.
- **Scorer Console Match Selector (`/dashboard/live`)**: Match dispatch hub for Officials, Organizers, and Admins. Officials fetch assigned matches from `GET /api/matches/assigned`, while Organizers and Admins fetch matches via tournament match lists.
- **Official Dashboard (`/dashboard/official`)**: Executive overview powered by `GET /api/dashboard/overview`, highlighting active live matches, upcoming assignments, and direct console shortcuts.
- **Public Live Center (`/live`)**: Dynamic spectator dashboard displaying ongoing `Live` and `HalfTime` matches, automatic polling updates, and direct links to individual match centers.
- **Public Match Details & Center (`/matches/:id`)**: Comprehensive match hub featuring live score banners, minute estimates, timeline events with privacy-safe player names (`FirstName L.`), full post-match reports for Completed matches, tournament standings, and tournament top scorers.

## 2. Polling Strategy & Scheduling Lifecycle
The `useLiveMatchPolling` hook provides robust, server-friendly real-time synchronization:
- **8-Second Heartbeat**: Active polling runs on an 8-second interval when matches are `Live` or `HalfTime`.
- **Visibility Awareness**: Automatically pauses polling when the browser tab is hidden (`document.hidden === true`) to eliminate idle traffic. When the tab regains focus, an immediate fresh fetch is triggered and the 8-second timer resumes.
- **Concurrency & Overlap Guard**: In-flight requests lock the poll cycle; if a tick fires while a previous HTTP request is still pending, the tick is gracefully skipped.
- **Lifecycle Termination**: Automatically terminates polling upon unmount, route transition (via `AbortController`), or once the match status reaches a terminal state (`Completed` or `Cancelled`).
- **Exponential Error Backoff**: On network or server errors, polling pauses and backs off to 30 seconds with a user-friendly "Reconnecting..." status indicator.

## 3. Pure Payload Builders & Zod Schema Conformance
Pure payload functions are isolated in `Frontend/src/lib/matchPayloads.ts`:
- `buildMatchStatusPayload(status)`: Generates strict status transitions tested against Backend's `matchStatusTransitionSchema`.
- `buildMatchEventPayload({ type, side, minute, player, relatedPlayer, note })`: Cleanses, strips empty strings to `null`, trims notes, and produces strict payloads verified against Backend's `createMatchEventSchema`.
- Tested and verified with 10+ assertions in `Frontend/scripts/verify-match-payloads.ts`.
