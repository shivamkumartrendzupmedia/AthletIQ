export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
  confirmPassword: string;
}

export function buildForgotPasswordPayload(rawEmail: string): ForgotPasswordPayload {
  const email = (rawEmail || '').trim().toLowerCase();
  return { email };
}

export function buildResetPasswordPayload(raw: {
  token: string;
  password: string;
  confirmPassword: string;
}): ResetPasswordPayload {
  return {
    token: (raw.token || '').trim(),
    password: raw.password || '',
    confirmPassword: raw.confirmPassword || '',
  };
}
