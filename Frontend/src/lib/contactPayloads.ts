export interface CreateContactInput {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export interface UpdateContactStatusInput {
  status: 'New' | 'Read' | 'Archived';
}

/**
 * Pure payload builder for public contact form submissions.
 * Conforms 1:1 with Backend createContactMessageSchema (.strict()).
 */
export function buildCreateContactPayload(
  input: CreateContactInput
): { name: string; email: string; subject?: string; message: string } {
  const payload: { name: string; email: string; subject?: string; message: string } = {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    message: input.message.trim(),
  };

  if (input.subject && input.subject.trim().length > 0) {
    payload.subject = input.subject.trim();
  }

  return payload;
}

export function buildUpdateContactStatusPayload(
  input: UpdateContactStatusInput
): { status: 'New' | 'Read' | 'Archived' } {
  return {
    status: input.status,
  };
}
