# Step 6B Review: Announcements and Documents

## 1. Overview
Step 6B delivers the Communications system across both Backend and Frontend, implementing:
1. **Announcements**: Multi-audience targeting (`Public`, `All`, `Coaches`, `Athletes`, `Organizers`, `Team`), role-based creation restrictions (Admin = all audiences, Coach = only `Team` for coached teams; out-of-scope = 404, Athlete & Organizer = 403), pinning, and public feed exposure (`/api/public/announcements` with creator sanitization).
2. **Documents**: Multi-part document upload via `multer` in-memory storage (`memoryStorage`), strictly validating file size (5 MB limit), extension allowlist (`.pdf`, `.png`, `.jpg`, `.jpeg`, `.docx`, `.xlsx`), and binary magic bytes prior to any disk write. Files are written atomically with random server names using `fs.promises.writeFile(..., { flag: 'wx' })`.
3. **Authenticated Downloads**: Secure file downloads via `GET /api/documents/:id/download` with enforced scope checks (IDOR shields returning 404), `X-Content-Type-Options: nosniff`, and RFC 5987 `filename*` sanitization protecting against header injection and directory traversal.
4. **Frontend Integration**: Complete removal of mock data from `AnnouncementsPage.tsx` and `DocumentsPage.tsx`, replaced with live APIs, interactive modals (`AnnouncementModal.tsx` and `DocumentModal.tsx`) with field-level error banners (`field: message`), blob object URL downloads via `apiDownload`, and proof tables for both features.
5. **Pure Payload Builders**: Isolated in `Frontend/src/components/comms/commsPayload.ts` and verified against backend Zod schemas in `Frontend/scripts/verify-comms-payload.ts`.

---

## 2. Security & Upload Architecture

### A. Multer & Magic-Byte Validation
- **Storage**: `multer.memoryStorage()` with `limits: { fileSize: 5 * 1024 * 1024 }` (5 MB).
- **Pre-write Validation**: File buffer inspected for magic bytes before touching disk:
  - PDF: `%PDF` (`0x25 0x50 0x44 0x46`)
  - PNG: `\x89PNG\r\n\x1a\n` (`0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A`)
  - JPEG/JPG: `0xFF 0xD8 0xFF`
  - DOCX / XLSX: ZIP container header `PK\x03\x04` (`0x50 0x4B 0x03 0x04`)
- **Honest ZIP Limitation Note**: DOCX and XLSX formats use standard ZIP packaging (`PK..`). Magic bytes accurately verify the file is a valid ZIP container, but cannot distinguish between `.docx`, `.xlsx`, or arbitrary zip archives without deep parsing. This trade-off is documented and accepted.
- **Atomic Disk Write**: Written with `crypto.randomBytes(16).toString('hex') + ext` using flag `'wx'` to guarantee no file overwrites.
- **Rollback on Database Failure**: If the database document creation throws, the written file is automatically removed via `fs.promises.unlink(filePath).catch(() => {})`.
- **Safe Deletion**: On document delete, if the disk file is missing (e.g. ghost file), the database record is still deleted and 200 is returned.

### B. Authenticated Downloads & Header Sanitization
- Endpoint: `GET /api/documents/:id/download`.
- Scoping: Uses `scopeService.canAccessDocumentScope` — non-permitted callers receive 404 (preventing IDOR and existence leakage).
- Headers:
  - `Content-Type`: Stored validated MIME type.
  - `X-Content-Type-Options: nosniff`
  - `Content-Disposition`: `attachment; filename="<sanitized>"; filename*=UTF-8''<encoded>`
  - Strips carriage returns (`\r`), line feeds (`\n`), path separators (`/`, `\`), and directory traversal tokens (`..`).

---

## 3. Limitations
docx and xlsx are ZIP files; magic bytes cannot distinguish them from each other or from other ZIP-based formats.

---

## 4. Scoping & Audience Isolation Matrix

| Role | Announcements List / View | Announcements Create / Edit | Documents List / Download | Documents Upload / Delete |
|---|---|---|---|---|
| **Admin** | All audiences | Any audience | All visibilities | All visibilities |
| **Coach** | `Public`, `All`, `Coaches`, and coached `Team`s | `Team` only (must be coach of team; others = 404) | `Public`, `All`, `Coaches`, and coached `Team`s | `Team` only (must be coach of team; others = 404) |
| **Athlete** | `Public`, `All`, `Athletes`, and own `Team` | 403 Forbidden | `Public`, `All`, `Athletes`, and own `Team` | 403 Forbidden |
| **Organizer** | `Public`, `All`, `Organizers` | 403 Forbidden | `Public`, `All`, `Organizers` | 403 Forbidden |
| **Unauthenticated** | `Public` feed only (`/api/public/announcements`) | 401 Unauthorized | None (401 Unauthorized) | 401 Unauthorized |

---

## 4. Verification Suite Results

### A. Backend Verification Scripts
1. `npm run verify:comms`:
   - Total HTTP requests executed: 47 (strictly < 90/group limit)
   - Failed auth attempts: 0 (strictly <= 8)
   - Temp upload dir: 0 leftover files (directory cleaned)
   - Baseline restored: Users 7, Sports 1, Teams 2, Coaches 2, Athletes 2, Sessions 2, Attendance 2, AuditLogs 41, Announcements 0, Documents 0.
   - Result: **89 passed, 0 failed**.
2. `npm run verify:models`: **27 passed, 0 failed**.
3. `npm run verify:auth`: **30 passed, 0 failed**.
4. `npm run verify:rbac`: **82 passed, 0 failed**.
5. `npm run verify:academy`: **133 passed, 0 failed**.
6. `npm run verify:ratelimit`: **6 passed, 0 failed**.
7. `npm run verify:training`: **89 passed, 0 failed**.

### B. Frontend Verification Scripts
1. `scripts/verify-comms-payload.ts`: **12 passed, 0 failed**.
2. `scripts/verify-session-payload.ts`: **11 passed, 0 failed**.
3. `scripts/verify-datetime-helpers.ts`: **7 passed, 0 failed**.
4. `scripts/verify-list-helpers.ts`: **7 passed, 0 failed**.
5. `scripts/verify-safe-image.ts`: **9 passed, 0 failed**.

### C. Build & Linting Status
- **Backend Build (`tsc`)**: 0 errors.
- **Backend Lint (`oxlint`)**: 0 warnings, 0 errors.
- **Frontend Build (`tsc -b && vite build`)**: 0 errors.
- **Frontend Lint (`oxlint`)**: 96 pre-existing warnings, 0 errors (0 warnings in comms files).
- **TypeScript `any` check**: 0 occurrences of `any` across all newly created or modified files.
