# STEP 11A — Production Deployment & Cookie Architecture Review

This document provides production deployment recipes and architectural details for hosting ATHLETIQ frontend and backend services across disparate hosting providers (e.g., Frontend on Vercel, Backend on Render).

---

## 1. Problem Diagnosis & Evidence

### Symptom
After deployment, initial login succeeds, but refreshing or reloading the webpage logs the user out.

### Root Causes Identified
1. **Cross-Origin Cookie Dropping (`SameSite=Lax` vs `SameSite=None`)**:
   - The refresh token cookie was hardcoded with `sameSite: 'lax'`.
   - When the frontend (`https://athletiq-frontend.vercel.app`) makes cross-site requests to the API (`https://athletiq-api.onrender.com`), browsers strictly block cookies marked `SameSite=Lax` from being attached or stored in third-party contexts.
2. **Asymmetric Cookie Options on Set vs Clear**:
   - In `Backend/src/controllers/auth.controller.ts`, `register`, `login`, and `refresh` set cookies with `httpOnly`, `path: '/api/auth'`, and `sameSite`.
   - However, `logout`, `logoutAll`, `changePassword`, and `resetPassword` invoked `res.clearCookie('refreshToken', { path: '/api/auth' })` without matching `sameSite`, `secure`, or `domain`. Modern browsers refuse to delete cookies cross-origin when clear parameters do not exactly mirror set parameters.
3. **Missing `trust proxy` Setting**:
   - In `Backend/src/app.ts`, `app.set('trust proxy', ...)` was not configured.
   - When running behind Render's reverse proxy / load balancer, `req.ip` resolved to Render's internal router IP instead of the client's public IP. All users shared the same rate-limit counter, and secure cookie headers from upstream HTTPS proxies could be mishandled.
4. **Hardcoded Single Origin in CORS**:
   - In `Backend/src/app.ts`, `cors({ origin: env.CLIENT_URL })` accepted only a single origin string rather than supporting multiple production/preview environments.

---

## 2. Deployment Recipes

### Recipe 1: Cross-Domain Hosting (Different Domains)
*Example: Frontend on `https://athletiq.vercel.app`, Backend on `https://athletiq-api.onrender.com`.*

#### Backend Environment Variables
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_ACCESS_SECRET=<at least 32 characters>
JWT_REFRESH_SECRET=<at least 32 characters>
TRUST_PROXY=1
CORS_ORIGINS=https://athletiq.vercel.app
COOKIE_SAMESITE=none
COOKIE_SECURE=true
```

#### Frontend Environment Variables
```env
VITE_API_BASE_URL=https://athletiq-api.onrender.com/api
```

#### Verification & Behavior
- The server refuses to boot if `COOKIE_SAMESITE=none` is set without `COOKIE_SECURE=true`.
- The `Set-Cookie` header includes `SameSite=None; Secure; HttpOnly; Path=/api/auth`.
- Preflight `OPTIONS` requests from `https://athletiq.vercel.app` receive:
  - `Access-Control-Allow-Origin: https://athletiq.vercel.app`
  - `Access-Control-Allow-Credentials: true`

---

### Recipe 2: Same-Site / Reverse-Proxy Architecture (Recommended)
*Example: Frontend proxies `/api` to the backend via Vercel Rewrites or shared parent domain.*

#### Vercel Rewrite Configuration (`Frontend/vercel.json`)
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://athletiq-api.onrender.com/api/:path*"
    }
  ]
}
```

#### Frontend Environment Variables
```env
VITE_API_BASE_URL=/api
```

#### Backend Environment Variables
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_ACCESS_SECRET=<at least 32 characters>
JWT_REFRESH_SECRET=<at least 32 characters>
TRUST_PROXY=1
CORS_ORIGINS=https://athletiq.vercel.app
COOKIE_SAMESITE=lax
COOKIE_SECURE=true
```

#### Why Recipe 2 is Recommended
- All API requests from the browser are dispatched to the same origin (`/api/...`).
- Cookies are strictly first-party; `SameSite=Lax` works reliably across all browsers.
- Completely avoids third-party cookie restrictions.

---

## 3. Critical Browser Caveats: Third-Party Cookies (Safari / Brave / Chrome Incognito)

> [!WARNING]
> **Safari Intelligent Tracking Prevention (ITP)**, **Brave Shields**, and **Chrome Incognito** block third-party cookies by default.
>
> In Recipe 1 (cross-domain), because `athletiq-api.onrender.com` differs in registrar root domain from `athletiq.vercel.app`, Safari and Brave classify the refresh cookie as a third-party tracking cookie and silently drop it.
>
> **Solution**:
> - Use **Recipe 2 (Vercel Rewrite)** so the browser talks to `/api` on the frontend domain, OR
> - Use custom domains on the same root apex (e.g., `app.athletiq.com` for frontend and `api.athletiq.com` for backend, setting `COOKIE_DOMAIN=.athletiq.com`).

---

## 4. Reverse Proxy & Rate Limiting Audit

### `trust proxy` Mechanics
- In Express, `app.set('trust proxy', 1)` instructs Express to read the rightmost IP in the `X-Forwarded-For` header appended by Render / Vercel.
- `express-rate-limit` extracts client identity from `req.ip`.
- With `TRUST_PROXY=1`:
  - Each individual client IP gets their own rate-limit window.
  - Render's load balancer IP is not shared across clients.
  - Health checks and proxy pings do not deplete user rate limits.

---

## 5. Exit Code 127 on Render Explanation

When deploying to Render with `NODE_ENV=production`:
- By default, `npm install` skips packages listed under `devDependencies`.
- If the build script relies on `tsc` or `tsx` which are installed under `devDependencies`, Render errors with: `sh: 1: tsc: not found (exit code 127)`.
- **Fix**:
  - Set Render Build Command to: `npm install --include=dev && npm run build`
  - Or set Render Environment Variable: `NPM_CONFIG_PRODUCTION=false`
