# Step 21 Review: EmailJS Password Reset Integration

## Overview
Send forgot-password transactional emails directly from the Node.js backend using the EmailJS REST API (`POST https://api.emailjs.com/api/v1.0/email/send`) with zero client-side keys and no third-party SDK dependencies.

---

## 1. Changes Summary

1. **Environment Configuration (`Backend/src/config/env.ts` & `Backend/.env.example`)**:
   - Added `EMAIL_PROVIDER = emailjs | smtp | none` (default: `none`).
   - Added EmailJS variables: `EMAILJS_SERVICE_ID`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY`, `EMAILJS_TEMPLATE_RESET`.
   - Added Zod `superRefine` rule enforcing all four EmailJS variables are defined at server boot when `EMAIL_PROVIDER=emailjs`.
   - Existing SMTP mailer behavior remains fully functional when `EMAIL_PROVIDER=smtp`.

2. **Email Service (`Backend/src/services/email.service.ts`)**:
   - `sendPasswordReset({ toEmail, userName, resetLink, expiresIn })`:
     - **EmailJS**: REST API call to `https://api.emailjs.com/api/v1.0/email/send` using native `fetch`.
     - Request body matches `{ service_id, template_id, user_id, accessToken, template_params: { to_email, user_name, reset_link, expires_in } }`.
     - 8-second timeout via `AbortController`.
     - Automatic single retry on network error or 5xx server responses (4xx client errors do not retry).
     - Never throws/crashes the calling request.
     - Logs only provider name and status code on failure (tokens, keys, and reset links are strictly never logged).
     - Sanitizes `userName` by stripping HTML tags and newlines.
     - **SMTP**: Delegates to `mailerService` with backwards compatibility.
     - **None**: Logs `[email] email skipped` and returns `{ success: true, provider: 'none' }`.

3. **Forgot Password Flow Wiring (`Backend/src/services/auth.service.ts`)**:
   - Replaced direct `mailerService` call with `emailService.sendPasswordReset(...)`.
   - Constructs `resetLink` as `FRONTEND_URL + "/reset-password?token=..."` (fallback to `CLIENT_URL` / `http://localhost:5173`).
   - `expiresIn` is set to `'30 minutes'`, matching real token TTL.
   - HTTP response remains identical regardless of whether user exists or email sending fails (no user enumeration).

4. **Documentation**:
   - Updated `Backend/README.md` and `Backend/REVIEW/DEPLOYMENT.md` with env tables, template variable names, and the non-browser API toggle instructions.

---

## 2. Assumptions

1. **EmailJS Account Settings**:
   - The EmailJS account has "Allow EmailJS API for non-browser applications" enabled under Account > Security, allowing the server to use `accessToken` (Private Key).
2. **Template Variables**:
   - The EmailJS template configured by ID `EMAILJS_TEMPLATE_RESET` defines the matching placeholders: `{{to_email}}`, `{{user_name}}`, `{{reset_link}}`, and `{{expires_in}}`.
3. **Provider Fallback**:
   - When `EMAIL_PROVIDER=none` in development/staging, password reset requests succeed with the standard timing-safe response while logging `[email] email skipped`.

---

## 3. Manual Test Checklist

- [ ] **Startup Validation (Missing Keys)**:
  - Set `EMAIL_PROVIDER=emailjs` without EmailJS keys in `.env`.
  - Start server (`npm run dev`).
  - Verify server exits with clear error stating missing `EMAILJS_SERVICE_ID`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY`, and `EMAILJS_TEMPLATE_RESET`.
- [ ] **Startup Validation (Valid Keys)**:
  - Configure valid EmailJS keys in `.env`.
  - Start server (`npm run dev`).
  - Verify server starts cleanly without errors.
- [ ] **Forgot Password Request (Known Email)**:
  - Submit `POST /api/auth/forgot-password` with `{ "email": "registered-user@domain.com" }`.
  - Verify HTTP 200 response with `{ "success": true, "message": "If that email exists, password reset instructions have been sent." }`.
  - Verify email arrives via EmailJS with valid clickable reset link.
- [ ] **Forgot Password Request (Unknown Email)**:
  - Submit `POST /api/auth/forgot-password` with `{ "email": "unknown-user@nowhere.com" }`.
  - Verify HTTP 200 response identical to known user request (zero user enumeration).
- [ ] **Rate Limiting & Cooldown**:
  - Submit immediate second request for same email; verify cooldown prevents duplicate email.
  - Submit 6 requests in rapid succession; verify 6th request triggers HTTP 429 Too Many Requests.
- [ ] **Token Consumption**:
  - Follow reset link to `Frontend` `/reset-password?token=...`.
  - Enter new password and submit.
  - Verify password resets successfully and token cannot be reused.
- [ ] **Provider Toggle (SMTP / None)**:
  - Set `EMAIL_PROVIDER=none`; verify `[email] email skipped` is logged and request returns 200.
  - Set `EMAIL_PROVIDER=smtp`; verify email dispatches through SMTP transporter.
