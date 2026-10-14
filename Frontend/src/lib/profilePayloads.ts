export interface ProfileFormFields {
  name?: string;
  dateOfBirth?: string;
}

export interface PasswordFormFields {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Builds the profile update payload, trimming the name and omitting undefined fields.
 */
export function buildProfilePayload(fields: ProfileFormFields): {
  name?: string;
  dateOfBirth?: string;
} {
  const payload: { name?: string; dateOfBirth?: string } = {};

  if (fields.name !== undefined) {
    const trimmed = fields.name.trim();
    if (trimmed.length > 0) {
      payload.name = trimmed;
    }
  }

  if (fields.dateOfBirth !== undefined && fields.dateOfBirth.trim().length > 0) {
    payload.dateOfBirth = fields.dateOfBirth.trim();
  }

  return payload;
}

/**
 * Builds the change password payload.
 */
export function buildChangePasswordPayload(fields: {
  currentPassword: string;
  newPassword: string;
}): {
  currentPassword: string;
  newPassword: string;
} {
  return {
    currentPassword: fields.currentPassword,
    newPassword: fields.newPassword,
  };
}
