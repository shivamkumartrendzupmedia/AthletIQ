# STEP 6A-FIX Review: Training Card Display Bugs

## 1. Task A & B: Field Alignment Matrix & Canonical Keys

| Concept | Backend DTO Key (`training.service.ts`) | Frontend TS Type (`academyApi.ts`) | JSX Render Key (`TrainingCalendarPage.tsx`) | SessionModal State / Prefill / Payload (`SessionModal.tsx`) |
| :--- | :--- | :--- | :--- | :--- |
| **Session Type** | `s.type` (lines 286, 372) | `type: SessionType;` (line 196) | `{s.type && <span>{s.type}</span>}` (line 392) | State: `type`<br>Prefill: `sessionToEdit.type || 'Training'`<br>Payload: `type` |
| **Location / Venue** | `s.venue` (lines 292, 377) | `venue?: string;` (line 199) | `Location: {s.venue?.trim() ? s.venue : 'Location not set'}` (line 420) | State: `venue`<br>Prefill: `sessionToEdit.venue || ''`<br>Payload: `venue` |
| **Coach** | `s.coach: { id: string; user: { name: string } } \| null` (lines 289, 375) | `coach: { id: string; user?: { name: string } } \| null;` (lines 191-194) | `Coach: {s.coach?.user?.name \|\| 'Not assigned'}` (line 424) | `coachId` state / select dropdown |
| **Attendance Counts** | `s.attendanceSummary: { present, late, excused, absent, total, attendanceRate } \| null` (lines 295, 349-359) | `attendanceSummary?: AttendanceSummary \| null;` (line 202) | If `total > 0`: `Marked: {s.attendanceSummary.total}`<br>Else: `Attendance not marked yet` (lines 472-480) | N/A (Read-only summary on card) |

---

## 2. Task C: Backend Response Proof

From `Backend/src/services/training.service.ts`:

### Sessions Mapping (Lines 283–299)
```ts
      return {
        id: sId,
        title: s.title,
        type: s.type,
        team: s.team ? (s.team as unknown as { id: string; name: string; slug?: string }) : null,
        sport: s.sport ? (s.sport as unknown as { id: string; name: string; slug?: string }) : null,
        coach: s.coach ? (s.coach as unknown as { id: string; user: { name: string } }) : null,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        venue: s.venue,
        notes: s.notes,
        status: s.status,
        attendanceSummary: summaryMap ? summaryMap.get(sId) || null : null,
        myAttendance: athleteAttendanceMap ? athleteAttendanceMap.get(sId) || null : null,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      };
```

### Single Session Mapping (Lines 369–382)
```ts
    return {
      id: session.id,
      title: session.title,
      type: session.type,
      team: session.team ? (session.team as unknown as { id: string; name: string }) : null,
      sport: session.sport ? (session.sport as unknown as { id: string; name: string }) : null,
      coach: session.coach ? (session.coach as unknown as { id: string; user: { name: string } }) : null,
      startsAt: session.startsAt.toISOString(),
      endsAt: session.endsAt.toISOString(),
      venue: session.venue,
      notes: session.notes,
      status: session.status,
      attendanceSummary: summary,
      myAttendance,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
```

### Embedded Athlete Attendance Session Mapping (Lines 950–965)
```ts
      const sess = r.session as unknown as ITrainingSession | null;
      return {
        id: r.id,
        session: sess
          ? {
              id: sess.id,
              title: sess.title,
              startsAt: sess.startsAt ? sess.startsAt.toISOString() : '',
              type: sess.type,
              venue: sess.venue,
            }
          : null,
        status: r.status,
        note: r.note,
        createdAt: r.createdAt.toISOString(),
      };
```

---

## 3. Task D: Coach Name Rendering

- **Database Real Value**: The user account name in MongoDB for coach 1 is `"Coach 1"`.
- **Backend Type**: `s.coach: { id: string; user: { name: string } } | null`. Does NOT have top-level `name` or `fullName`.
- **Frontend TS Type**:
  ```ts
  coach: {
    id: string;
    user?: { name: string };
  } | null;
  ```
- **Rendering Logic**:
  ```tsx
  <div className="flex items-center gap-2">
    <Users size={16} className="text-[#FF5A00]" />
    <span>Coach: {s.coach?.user?.name || 'Not assigned'}</span>
  </div>
  ```
  - When coach is assigned (`name: "Coach 1"`): renders verbatim `Coach: Coach 1`.
  - When coach is null: renders `Coach: Not assigned`.
  - Leading "Coach" stripping logic is eliminated.

---

## 4. Task E & F: Attendance Counts Shape & Rendering

### AttendanceSummary Interface (`Backend/src/services/training.service.ts`, Lines 23–30):
```ts
export interface AttendanceSummary {
  present: number;
  late: number;
  excused: number;
  absent: number;
  total: number;
  attendanceRate: number | null;
}
```

### Aggregation Formula (`Backend/src/services/training.service.ts`, Lines 349–356):
```ts
      summary = { present: 0, late: 0, excused: 0, absent: 0, total: 0, attendanceRate: null };
      for (const r of records) {
        if (r._id === 'Present') summary.present += r.count;
        else if (r._id === 'Late') summary.late += r.count;
        else if (r._id === 'Excused') summary.excused += r.count;
        else if (r._id === 'Absent') summary.absent += r.count;
        summary.total += r.count;
      }
```

**State**: Roster size is NOT in the backend summary (`total` represents sum of marked attendance records: `present + late + excused + absent`).
Therefore, "Marked: X" applies without touching the backend:
- When nothing is marked (`!s.attendanceSummary || s.attendanceSummary.total === 0`): `"Attendance not marked yet"`.
- When marked (`s.attendanceSummary.total > 0`): `"Marked: ${s.attendanceSummary.total}"`.
- Organizer / Athlete: `s.attendanceSummary` is `null` (server does not send summary for these roles), so no counts are shown.

---

## 5. Task F & G: Start Hint & Modal Prefill/Submit

### Helper: `formatSessionStartHint` in `Frontend/src/lib/datetime.ts`
- Uses `Intl.DateTimeFormat` with explicit IANA timezone source (parameter defaults to `getBrowserTimeZone()`, which resolves `Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'`).
- Display condition: Rendered strictly when `s.status === 'Scheduled' && !hasStarted`.
  ```tsx
  {s.status === 'Scheduled' && !hasStarted && (
    <p className="text-[11px] text-[#171044]/60 italic">
      Available once the session starts ({formatSessionStartHint(s.startsAt, browserTz)})
    </p>
  )}
  ```
  Cancelled and Completed sessions do not render this hint.

### Edit Modal Prefill & Payload in `Frontend/src/components/training/SessionModal.tsx`:
- Prefill:
  ```ts
  setType(sessionToEdit.type || 'Training');
  setVenue(sessionToEdit.venue || '');
  ```
- Submissions (Update & Create):
  ```ts
  // Update:
  await academyApi.updateTrainingSession(sessionToEdit.id, {
    title,
    type,
    venue,
    notes: notes.trim() ? notes.trim() : undefined,
    // ...
  });

  // Create:
  await academyApi.createTrainingSession({
    team: teamId,
    title,
    type,
    startsAt: startsAtUtc,
    endsAt: endsAtUtc,
    venue,
    notes: notes.trim() ? notes.trim() : undefined,
  });
  ```

---

## 6. Task G: Historical verify:training Assertion Failure & Production Bug Analysis

- **Failing Assertion in earlier verify:training run**:
  `Athlete A gets session detail (200)` failed with HTTP 500.
- **Root Cause & Line Numbers in `training.service.ts` (~L320-370)**:
  `const scope` was declared inside an `else` branch of coach verification (`if (user.role === 'Coach') { ... } else { const scope = await this.getUserScope(user.id, user.role); ... }`).
  When execution reached the athlete attendance block at ~L360 (`else if (user.role === 'Athlete' && (scope as ...).athleteId)`), a JavaScript runtime `ReferenceError: scope is not defined` crashed the request with HTTP 500.
- **Production Bug Fix**:
  Hoisted `const scope = await this.getUserScope(user.id, user.role);` to the top of `getSessionById` (line 329), ensuring `scope` is in function scope and accessible for role checks throughout the method.
