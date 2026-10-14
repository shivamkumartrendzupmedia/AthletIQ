# ATHLETIQ PRODUCTION DEPLOYMENT GUIDE (M2)

This document provides a production deployment checklist for launching ATHLETIQ across Render (Backend Web Service) and Vercel (Frontend Single Page Application), backed by a MongoDB Atlas managed cluster.

---

## 1. MongoDB Atlas Database Setup

### User Privileges
- Create a dedicated database user for ATHLETIQ in **Database Access**.
- Assign the role `readWrite` strictly on the target database (e.g. `athletiq_production`).
- **Do NOT** assign `atlasAdmin` or cluster-wide superuser privileges.

### Network Access
- Add an IP Access List entry: `0.0.0.0/0` (Allow Access from Anywhere) to permit connections from Render's dynamic outbound IP pool.
- Retrieve the standard connection string format:
  `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/athletiq_production?retryWrites=true&w=majority`

---

## 2. Render Deployment (Backend API)

### Service Configuration
| Setting | Recommended Value | Source |
|---|---|---|
| **Service Type** | Web Service | Node.js Backend API |
| **Root Directory** | `Backend` | Workspace subfolder |
| **Environment** | `Node` | Node.js LTS (v20.x or v22.x) |
| **Build Command** | `npm install && npm run build` | From `Backend/package.json` |
| **Start Command** | `npm run start` (or `node dist/server.js`) | From `Backend/package.json` |
| **Health Check Path** | `/api/health` | Validates API server & DB readiness |
| **Auto-Deploy** | `Yes` (on push to `main`) | Automated deployment pipeline |

### Environment Variables on Render
Configure these in Render **Environment** settings. Use placeholder/real secret values in Render dashboard, never in Git:

| Variable | Requirement | Description / Placeholder |
|---|---|---|
| `NODE_ENV` | **REQUIRED** | `production` |
| `PORT` | **REQUIRED** | `10000` (Render assigns automatically via `$PORT`) |
| `MONGODB_URI` | **REQUIRED** | `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/athletiq_production?retryWrites=true&w=majority` |
| `CLIENT_URL` | **REQUIRED** | `https://athletiq.vercel.app` (Your production Vercel domain) |
| `FRONTEND_URL` | **OPTIONAL** | `https://athletiq.vercel.app` (Used for password reset links) |
| `CORS_ORIGINS` | **REQUIRED** | `https://athletiq.vercel.app` (Exact origin without trailing slash) |
| `JWT_ACCESS_SECRET` | **REQUIRED** | High-entropy random hex secret (min 32 chars). Generate with `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | **REQUIRED** | High-entropy random hex secret (MUST differ from access secret) |
| `JWT_ACCESS_EXPIRES` | **OPTIONAL** | `15m` (Default: 15 minutes) |
| `JWT_REFRESH_EXPIRES` | **OPTIONAL** | `7d` (Default: 7 days) |
| `REFRESH_GRACE_MS` | **OPTIONAL** | `30000` (30-second token rotation grace window) |
| `TRUST_PROXY` | **REQUIRED** | `1` (Tells Express to trust Render's reverse proxy header) |
| `COOKIE_SAMESITE` | **REQUIRED** | `none` (When frontend on Vercel and backend on Render have different domains) or `lax` (if on same parent domain) |
| `COOKIE_SECURE` | **REQUIRED** | `true` (Enforces HTTPS cookie transport) |
| `COOKIE_DOMAIN` | **OPTIONAL** | `.yourdomain.com` (Only if frontend and backend share a common apex domain) |
| `RATE_LIMIT_WINDOW_MS` | **OPTIONAL** | `900000` (15 minutes) |
| `RATE_LIMIT_MAX` | **OPTIONAL** | `600` (Requests per IP per window) |
| `CHATBOT_RATE_LIMIT_WINDOW_MS` | **OPTIONAL** | `600000` (10 minutes) |
| `CHATBOT_RATE_LIMIT_MAX` | **OPTIONAL** | `20` (Messages per user per window) |
| `RATE_LIMIT_CONTACT_WINDOW_MS` | **OPTIONAL** | `3600000` (1 hour) |
| `RATE_LIMIT_CONTACT_MAX` | **OPTIONAL** | `5` (Contact inquiries per IP per hour) |
| `RATE_LIMIT_FORGOT_PASSWORD_WINDOW_MS` | **OPTIONAL** | `900000` (15 minutes) |
| `RATE_LIMIT_FORGOT_PASSWORD_MAX` | **OPTIONAL** | `5` (Reset requests per IP per window) |
| `DOCUMENT_UPLOAD_DIR` | **OPTIONAL** | `./uploads/documents` |
| `MAX_DOCUMENT_SIZE_BYTES` | **OPTIONAL** | `5242880` (5 MB) |
| `SMTP_HOST` | **OPTIONAL** | `smtp.mailgun.org` (or SendGrid/Postmark) |
| `SMTP_PORT` | **OPTIONAL** | `587` |
| `SMTP_SECURE` | **OPTIONAL** | `false` |
| `SMTP_USER` | **OPTIONAL** | `postmaster@yourdomain.mailgun.org` |
| `SMTP_PASS` | **OPTIONAL** | `<smtp-secret-password>` |
| `SMTP_FROM` | **OPTIONAL** | `"ATHLETIQ Academy" <no-reply@athletiq.app>` |

---

## 3. Vercel Deployment (Frontend SPA)

### Project Configuration
| Setting | Value | Source |
|---|---|---|
| **Framework Preset** | `Vite` | Automatic detection |
| **Root Directory** | `Frontend` | Workspace subfolder |
| **Build Command** | `npm run build` | `Frontend/package.json` |
| **Output Directory** | `dist` | Generated build artifact |
| **Install Command** | `npm install` | Clean dependency install |

### Environment Variables on Vercel
| Variable | Value | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `https://your-backend.onrender.com/api` | Points directly to Render backend with `/api` suffix |

### SPA Routing & Rewrite Rules
`Frontend/vercel.json` is configured with client-side fallback rewriting:
```json
{
  "rewrites": [
    {
      "source": "/((?!assets/|.*\\.[a-zA-Z0-9]+$).*)",
      "destination": "/index.html"
    }
  ]
}
```
This ensures direct URLs (such as `/dashboard/admin`, `/privacy`, `/matches/live`) resolve to `index.html` without 404 errors.

---

## 4. Bootstrapping the First Production Admin

### Security Constraint
`POST /api/auth/register` is public and strictly enforces role `Athlete`. Public registration cannot create `Admin` accounts.

### Promotion Procedure
1. Register the initial administrative account via the public registration interface or API:
   ```bash
   POST https://your-backend.onrender.com/api/auth/register
   Content-Type: application/json

   {
     "name": "Head Administrator",
     "email": "admin@athletiq.app",
     "password": "SecurePassword123!"
   }
   ```
2. In the Render Backend shell (or via a secure promotion script run with administrative access):
   Execute the dedicated user promotion script to elevate the user's role to `Admin`:
   ```bash
   npx tsx scripts/promote-admin.ts --email admin@athletiq.app
   ```
3. Once promoted, the user can log in at `/login` and access the full `/dashboard/admin` management console. From that console, the Admin can create additional staff, coaches, and organizers directly via the User Accounts management interface.

---

## 5. Post-Deployment Smoke Test Checklist

Execute these checks immediately following deployment:
1. **Health Check**:
   - Navigate to `https://your-backend.onrender.com/api/health` -> verify status `200 OK` with database connected.
2. **Public Website Load**:
   - Visit `https://athletiq.vercel.app/` -> verify home page, logos, hero athlete banner, and quick links render smoothly.
3. **Legal Pages & Footers**:
   - Click footer links: `/privacy`, `/terms`, `/code-of-conduct` -> verify each renders with table of contents and without layout shift.
4. **404 Routing**:
   - Navigate to `https://athletiq.vercel.app/non-existent-page-test` -> verify friendly 404 page with "Back to Home" button.
5. **Authentication & Session Restore**:
   - Log in with the promoted Admin credentials -> verify redirection to `/dashboard/admin`.
   - Reload browser on `/dashboard/admin` -> verify session is preserved without flicker via `athletiq_refresh` cookie.
6. **Active Count Metrics**:
   - Check Admin dashboard summary cards -> verify active team and coach counts match active database records (never stuck at 0).
7. **Live Match Center**:
   - Navigate to `/matches/live` -> verify real-time polling initiates and server timestamp is received.
8. **Contact Form**:
   - Submit a test inquiry on `/contact` -> verify success toast and database record created.

---

## 6. Post-Smoke-Test Cleanup

After conducting initial smoke tests with temporary test accounts:
1. Run the orphan cleanup script in dry-run mode against the production database to verify system state:
   ```bash
   npm run cleanup:orphans -- --dry-run
   ```
2. Verify that `Identified Orphans Total: 0` is reported.
3. If test fixtures were created during verification, run:
   ```bash
   npm run cleanup:orphans -- --apply
   ```

---

## 7. Known Architecture Limits (M2)

- **Single-Instance In-Memory State**: Rate limiters and refresh token replay windows use in-memory state. In M2, backend should run on a single Render instance. Scaling to multi-instance clusters will require Redis backing (planned for M3).
- **Document Storage**: Local filesystem (`uploads/documents`) storage resets on container restarts if persistent disk is not attached on Render. For enterprise production, configure an S3/GCS bucket store.
- **WebSocket Fallback**: Real-time match scores use high-frequency adaptive HTTP polling (8s in-play, 30s backoff) rather than persistent WebSockets.

---

## 8. Rollback Procedure

If an unrecoverable defect is detected post-deployment:
1. Identify the previous stable Git commit hash:
   ```bash
   git log -5 --oneline
   ```
2. Revert to the stable commit:
   ```bash
   git revert <bad-commit-hash>
   git push origin main
   ```
3. Both Render and Vercel will detect the push and automatically build and deploy the reverted stable build.
