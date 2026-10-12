/**
 * PII and Secret Redaction Utility for Chatbot Engine
 *
 * Drops forbidden fields:
 * - email, phone, medicalNotes, guardian, passwordHash, tokens, etc.
 * Masks email and phone patterns in text output.
 */

const FORBIDDEN_KEYS = new Set([
  'email',
  'phone',
  'phonenumber',
  'medicalnotes',
  'medicalnote',
  'guardian',
  'guardianname',
  'guardianphone',
  'guardianemail',
  'emergencycontact',
  'password',
  'passwordhash',
  'token',
  'tokens',
  'refreshtoken',
  'refreshtokens',
  'accesstoken',
  'secret',
  'jwt',
  '__v',
]);

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
// Masks standard phone formats and 10-digit mobile numbers
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b[6-9]\d{9}\b/g;

/**
 * Redacts email and phone patterns from plain text.
 */
export function redactText(text: string): string {
  if (!text) return text;
  return text
    .replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
    .replace(PHONE_REGEX, '[REDACTED_PHONE]');
}

/**
 * Deep redaction pass over tool output objects.
 * Removes forbidden keys and masks sensitive strings.
 */
export function redactOutput<T>(data: T, currentUserId?: string): T {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    return redactText(data) as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactOutput(item, currentUserId)) as unknown as T;
  }

  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (FORBIDDEN_KEYS.has(lowerKey)) {
        continue;
      }

      // If key is an id representing another user (and not the caller), drop or redact it
      if (
        (lowerKey === 'user' || lowerKey === 'userid' || lowerKey === 'coachid' || lowerKey === 'athleteid') &&
        typeof value === 'string' &&
        currentUserId &&
        value !== currentUserId
      ) {
        // Do not expose other users' internal IDs in chatbot tool outputs
        continue;
      }

      result[key] = redactOutput(value, currentUserId);
    }
    return result as T;
  }

  return data;
}
