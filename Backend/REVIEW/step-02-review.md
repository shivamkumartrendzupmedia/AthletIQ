# Step 2 Review — Core Database Models (Mongoose)

## Summary of Changes
In this step, we built the domain modeling layer for ATHLETIQ using Mongoose 8.x and TypeScript under NodeNext module resolution. Nine core schema models were created along with centralized domain constants, type definitions, and a barrel export module. In-memory validation tests were implemented to guarantee schema constraints, data sanitization, index definitions, and computed virtuals without requiring an active database connection or accessing `.env` secrets.

Both user clarifications were strictly implemented:
1. **`Athlete.user` vs `Coach.user`**:
   - `Athlete.user` is optional, enabling academy admins to register athletes before account creation. Uniqueness is guarded by a MongoDB partial filter index `{ user: 1 }, { unique: true, partialFilterExpression: { user: { $type: 'objectId' } } }`, allowing multiple unlinked athletes to coexist without `null` collision.
   - `Coach.user` is strictly required and defined with a field-level `unique: true` constraint.
2. **`Athlete.age` virtual**:
   - Dynamic age calculation is defined on `Athlete` and exposed automatically via `toJSON: { virtuals: true }`.

---

## Files Created / Modified

| File Path | Action | Description |
| :--- | :--- | :--- |
| `Backend/src/models/constants.ts` | Created | Central domain enums, status lists, role definitions, and matching TypeScript string literal union types. |
| `Backend/src/models/User.ts` | Created | User account model with field-level unique email, `passwordHash`/`refreshTokens` with `select: false`, role enum, and sanitized `toJSON`. |
| `Backend/src/models/Sport.ts` | Created | Sport discipline model with unique name and slug, `shortDescription`, `description`, features, age groups, and timestamps. |
| `Backend/src/models/Team.ts` | Created | Academy team model linked to `Sport` and `Coach`, unique slug, age group, season, and logo. |
| `Backend/src/models/Coach.ts` | Created | Coach profile strictly linked to `User` (1-to-1 required), title, specialties array, specialization, certifications, achievements, and public toggle. |
| `Backend/src/models/Athlete.ts` | Created | Athlete profile with optional `user` link (partial index), compound unique `(team, jerseyNumber)` partial index, `age` virtual, `medicalClearance`, private `medicalNotes`, and guardian info. |
| `Backend/src/models/TrainingSession.ts` | Created | Training calendar model with start/end time validation (`endsAt > startsAt`), venue, type, and compound index on `(team, startsAt)`. |
| `Backend/src/models/Attendance.ts` | Created | Session attendance model with compound unique index on `(session, athlete)` and attendance status tracking. |
| `Backend/src/models/Document.ts` | Created | Academy document storage model for 7 document types (`Waiver`, `Medical`, `ID`, `Consent`, `Contract`, `Insurance`, `Other`), owner link, and review workflow fields. |
| `Backend/src/models/Announcement.ts` | Created | Broadcast communication model with structured audience targeting (`roles`, `teams`), priority enum, pinned toggle, and index on `publishAt`. |
| `Backend/src/models/index.ts` | Created | Central barrel file exporting all 9 models, document interfaces, and domain constants. |
| `Backend/scripts/verify-models.ts` | Created | In-memory verification test script asserting `validateSync()`, `toJSON()`, index specifications, and boundary rules. |
| `Backend/package.json` | Modified | Added `"verify:models": "tsx scripts/verify-models.ts"` to npm scripts. |
| `Backend/REVIEW/step-02-review.md` | Created | Formal review deliverable with verification outputs, code excerpts, and frontend mapping. |

---

## Key Code Excerpts

### 1. Athlete Schema — Optional User Link & Compound Jersey Index
From `Backend/src/models/Athlete.ts`:
```typescript
// Optional link to User account: an administrator can roster an athlete before they create an account.
// Uniqueness is enforced via partialFilterExpression below to prevent collisions on null/undefined.
user: {
  type: Schema.Types.ObjectId,
  ref: 'User',
},

// Virtual getter calculating age dynamically in full years from dateOfBirth
athleteSchema.virtual('age').get(function (this: IAthlete) {
  if (!this.dateOfBirth) return undefined;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let computedAge = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    computedAge--;
  }
  return computedAge;
});

// Index 1: Unique User Account constraint applied ONLY when user ObjectId exists.
athleteSchema.index(
  { user: 1 },
  {
    unique: true,
    partialFilterExpression: { user: { $type: 'objectId' } },
  }
);

// Index 2: Compound Unique Index on (team, jerseyNumber) applied ONLY when both fields are assigned.
athleteSchema.index(
  { team: 1, jerseyNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      team: { $type: 'objectId' },
      jerseyNumber: { $type: 'number' },
    },
  }
);
```

### 2. Coach Schema — Required 1-to-1 User Link
From `Backend/src/models/Coach.ts`:
```typescript
// Coach profile is strictly tied to an authenticated User account (1-to-1 required mapping)
user: {
  type: Schema.Types.ObjectId,
  ref: 'User',
  required: [true, 'Coach must be linked to an existing User account'],
  unique: true, // Field-level unique index ensures exactly one coach profile per user
},
```

### 3. TrainingSession Schema — Date Order Validation
From `Backend/src/models/TrainingSession.ts`:
```typescript
endsAt: {
  type: Date,
  required: [true, 'End date and time is required'],
  validate: {
    validator: function (this: ITrainingSession, value: Date): boolean {
      if (!this.startsAt || !value) return true;
      return value > this.startsAt;
    },
    message: 'Session end time must be strictly after start time',
  },
},
```

---

## Frontend to Backend Field Mapping Table

| Frontend Entity & Field | Backend Model & Field | Notes / Mapping Strategy |
| :--- | :--- | :--- |
| `user.id` / `user._id` | `User._id` (serialized as `id`) | `toJSON` normalizes `_id` to `id` string |
| `user.role` | `User.role` | Exact match (`Admin`, `Coach`, `Athlete`, `Organizer`) |
| `sport.id`, `sport.name` | `Sport._id`, `Sport.name` | Direct match |
| `sport.description` | `Sport.shortDescription` / `Sport.description` | Short blurb vs full markdown description |
| `coach.name` | `Coach.user.name` | Populated via `user` reference |
| `coach.title` | `Coach.title` | Direct match (e.g. "Head Coach") |
| `coach.specialization` | `Coach.specialization` | Direct match |
| `coach.specialties` | `Coach.specialties` (string[]) | Preserves UI tag array |
| `coach.experience` | `Coach.experienceYears` (number) | Converted to integer years |
| `athlete.name` | `Athlete.user.name` (or guardian record if unlinked) | Populated via `user` |
| `athlete.age` | `Athlete.age` (virtual) | Dynamically computed from `dateOfBirth` |
| `athlete.status` | `Athlete.status` | Enum: `['Active', 'Injured', 'Trial', 'Inactive']` |
| `athlete.verification` | `Athlete.verificationStatus` | Enum: `['Verified', 'Pending ID', 'Medical Required']` |
| `athlete.medicalClearance` | `Athlete.medicalClearance` | Boolean clearance flag |
| `athlete.emergencyContact` | `Athlete.guardian` | Subdocument (`name`, `phone`, `email`) |
| `document.type` | `Document.type` | Enum: `['Waiver', 'Medical', 'ID', 'Consent', 'Contract', 'Insurance', 'Other']` |
| `document.status: "Pending Review"` | `Document.status: "Pending"` | Frontend UI maps `'Pending'` to display label `'Pending Review'` |
| `announcement.audience` | `Announcement.audience` | Structured `{ roles, teams }` |

---

## Phase C Verification Execution Results

### 1. `npm run build`
```text
> athletiq-backend@1.0.0 build
> tsc
```
*Result: Exit code 0, 0 compiler errors.*

### 2. `npm run lint`
```text
> athletiq-backend@1.0.0 lint
> oxlint

Found 0 warnings and 0 errors.
Finished in 9ms on 22 files with 72 rules using 8 threads.
```
*Result: Exit code 0, 0 linter warnings or errors.*

### 3. `npm run verify:models`
```text
> athletiq-backend@1.0.0 verify:models
> tsx scripts/verify-models.ts


--- VERIFYING MONGOOSE MODELS IN-MEMORY ---

1. Valid document instantiation & validateSync():
  ✓ PASS: User passes validateSync()
  ✓ PASS: Sport passes validateSync()
  ✓ PASS: Coach passes validateSync()
  ✓ PASS: Team passes validateSync()
  ✓ PASS: Athlete passes validateSync()
  ✓ PASS: TrainingSession passes validateSync()
  ✓ PASS: Attendance passes validateSync()
  ✓ PASS: Document passes validateSync()
  ✓ PASS: Announcement passes validateSync()

2. Validation Rejections:
  ✓ PASS: User rejects invalid email address format
  ✓ PASS: User rejects invalid role enum value
  ✓ PASS: Athlete rejects invalid status enum
  ✓ PASS: TrainingSession rejects endsAt <= startsAt

3. User toJSON Security:
  ✓ PASS: User.toJSON() strips passwordHash
  ✓ PASS: User.toJSON() strips refreshTokens
  ✓ PASS: User.toJSON() converts _id to string id

4. Clarification 1 — Optional Athlete.user and Non-Colliding Unlinked Athletes:
  ✓ PASS: Unlinked Athlete #1 (user undefined) passes validateSync()
  ✓ PASS: Unlinked Athlete #2 (user undefined) passes validateSync()
  ✓ PASS: Coach requires user link (validation fails if missing)

5. Clarification 2 — Athlete Computed Age and toJSON Output:
  ✓ PASS: Athlete virtual getter returns correct age (18)
  ✓ PASS: Athlete.toJSON() includes virtual 'age' (18)
  ✓ PASS: Athlete.toJSON() strips private medicalNotes

6. Schema Index Specifications:
  ✓ PASS: Athlete has unique index on { user: 1 } with partialFilterExpression for objectId
  ✓ PASS: Athlete has compound unique index on (team, jerseyNumber) with partialFilterExpression
  ✓ PASS: Attendance has compound unique index on (session, athlete)
  ✓ PASS: TrainingSession has compound index on (team, startsAt)
  ✓ PASS: Coach.user is defined with field-level unique: true

========================================
Summary: 27 passed, 0 failed
========================================

All model validations and schema index assertions passed successfully!
```
*Result: Exit code 0, 27/27 assertions passed.*

---

## Manual Verification Instructions

To execute the verification suite locally on your machine:
```powershell
cd Backend
npm run build
npm run lint
npm run verify:models
```

---

Waiting for your review. Nothing has been committed.
