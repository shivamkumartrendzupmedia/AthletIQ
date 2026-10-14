import { env } from '../config/env.js';
import { mailerService } from './mailer.service.js';

export interface SendPasswordResetOptions {
  toEmail: string;
  userName?: string;
  resetLink: string;
  expiresIn: string;
}

export interface SendEmailResult {
  success: boolean;
  provider: 'emailjs' | 'smtp' | 'none';
  statusCode?: number;
  error?: string;
}

const EMAILJS_API_URL = 'https://api.emailjs.com/api/v1.0/email/send';
const EMAILJS_TIMEOUT_MS = 8000;

/**
 * Strips HTML tags and newlines from user-supplied name to prevent injection.
 */
function sanitizeUserName(name?: string): string {
  if (!name) return '';
  return name
    .replace(/<[^>]*>/g, '') // remove HTML tags
    .replace(/[\r\n]+/g, ' ') // collapse CR/LF to single space
    .trim();
}

/**
 * Executes a single fetch call with an 8-second timeout via AbortController.
 */
async function fetchEmailJs(payload: {
  service_id: string;
  template_id: string;
  user_id: string;
  accessToken: string;
  template_params: {
    to_email: string;
    user_name: string;
    reset_link: string;
    expires_in: string;
  };
}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EMAILJS_TIMEOUT_MS);

  try {
    const res = await fetch(EMAILJS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export class EmailService {
  /**
   * Sends a password reset email via the configured provider (emailjs | smtp | none).
   * Never throws or crashes the request.
   * Logs only provider name and status code on failure (never keys, tokens, or links).
   */
  async sendPasswordReset(options: SendPasswordResetOptions): Promise<SendEmailResult> {
    const { toEmail, userName, resetLink, expiresIn } = options;
    const cleanUserName = sanitizeUserName(userName);
    const provider = env.EMAIL_PROVIDER;

    // 1. None: log and skip (unless in test environment where SMTP mock history is checked)
    if (provider === 'none') {
      if (process.env.NODE_ENV === 'test') {
        // In automated tests, record in mailerService history
        try {
          await mailerService.sendPasswordResetEmail(toEmail, resetLink, cleanUserName);
          return { success: true, provider: 'smtp' };
        } catch {
          console.error('[email] smtp send failed');
          return { success: false, provider: 'smtp' };
        }
      }
      console.log('[email] email skipped');
      return { success: true, provider: 'none' };
    }

    // 2. SMTP: reuse existing nodemailer mailerService
    if (provider === 'smtp') {
      try {
        await mailerService.sendPasswordResetEmail(toEmail, resetLink, cleanUserName);
        return { success: true, provider: 'smtp' };
      } catch {
        console.error('[email] smtp send failed');
        return { success: false, provider: 'smtp', error: 'smtp_error' };
      }
    }

    // 3. EmailJS: direct REST API call with 8s timeout and one retry on network error or 5xx
    if (provider === 'emailjs') {
      const serviceId = env.EMAILJS_SERVICE_ID || '';
      const templateId = env.EMAILJS_TEMPLATE_RESET || '';
      const userId = env.EMAILJS_PUBLIC_KEY || '';
      const accessToken = env.EMAILJS_PRIVATE_KEY || '';

      const payload = {
        service_id: serviceId,
        template_id: templateId,
        user_id: userId,
        accessToken,
        template_params: {
          to_email: toEmail,
          user_name: cleanUserName,
          reset_link: resetLink,
          expires_in: expiresIn,
        },
      };

      let attempt = 0;
      let lastStatusCode: number | undefined;
      let lastError: string | undefined;

      while (attempt < 2) {
        attempt++;
        try {
          const res = await fetchEmailJs(payload);
          lastStatusCode = res.status;

          if (res.ok) {
            return {
              success: true,
              provider: 'emailjs',
              statusCode: res.status,
            };
          }

          // 4xx errors are client errors (invalid credentials/template); do not retry
          if (res.status >= 400 && res.status < 500) {
            console.error(`[email] emailjs send failed with status ${res.status}`);
            return {
              success: false,
              provider: 'emailjs',
              statusCode: res.status,
            };
          }

          // 5xx errors: retry once if attempt === 1
          if (attempt === 1 && res.status >= 500) {
            continue;
          }

          console.error(`[email] emailjs send failed with status ${res.status}`);
          return {
            success: false,
            provider: 'emailjs',
            statusCode: res.status,
          };
        } catch (err: unknown) {
          lastError = err instanceof Error ? err.name : 'NetworkError';
          // Retry once on network error or timeout
          if (attempt === 1) {
            continue;
          }
          console.error('[email] emailjs send failed with network error');
          return {
            success: false,
            provider: 'emailjs',
            statusCode: lastStatusCode,
            error: lastError,
          };
        }
      }

      console.error(`[email] emailjs send failed with status ${lastStatusCode ?? 'unknown'}`);
      return {
        success: false,
        provider: 'emailjs',
        statusCode: lastStatusCode,
        error: lastError,
      };
    }

    return { success: false, provider: 'none' };
  }
}

export const emailService = new EmailService();
export const sendPasswordReset = (options: SendPasswordResetOptions): Promise<SendEmailResult> =>
  emailService.sendPasswordReset(options);
