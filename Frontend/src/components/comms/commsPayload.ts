/**
 * Pure payload builders for Announcements and Documents
 * Formats inputs safely before submitting to Backend APIs.
 */

export interface CreateAnnouncementFormState {
  title: string;
  body: string;
  audience: 'Public' | 'All' | 'Athletes' | 'Coaches' | 'Organizers' | 'Team';
  team?: string;
  pinned?: boolean;
  publishedAt?: string;
}

export interface UpdateAnnouncementFormState {
  title?: string;
  body?: string;
  audience?: 'Public' | 'All' | 'Athletes' | 'Coaches' | 'Organizers' | 'Team';
  team?: string;
  pinned?: boolean;
  publishedAt?: string;
}

export interface CreateAnnouncementPayload {
  title: string;
  body: string;
  audience: 'Public' | 'All' | 'Athletes' | 'Coaches' | 'Organizers' | 'Team';
  team?: string;
  pinned?: boolean;
  publishedAt?: string;
}

export interface UpdateAnnouncementPayload {
  title?: string;
  body?: string;
  audience?: 'Public' | 'All' | 'Athletes' | 'Coaches' | 'Organizers' | 'Team';
  team?: string;
  pinned?: boolean;
  publishedAt?: string;
}

export function buildCreateAnnouncementPayload(
  form: CreateAnnouncementFormState
): CreateAnnouncementPayload {
  const payload: CreateAnnouncementPayload = {
    title: form.title.trim(),
    body: form.body.trim(),
    audience: form.audience,
    pinned: Boolean(form.pinned),
  };

  if (form.audience === 'Team' && form.team && form.team.trim() !== '') {
    payload.team = form.team.trim();
  }

  if (form.publishedAt && form.publishedAt.trim() !== '') {
    payload.publishedAt = new Date(form.publishedAt).toISOString();
  }

  return payload;
}

export function buildUpdateAnnouncementPayload(
  form: UpdateAnnouncementFormState
): UpdateAnnouncementPayload {
  const payload: UpdateAnnouncementPayload = {};

  if (form.title !== undefined && form.title.trim() !== '') {
    payload.title = form.title.trim();
  }

  if (form.body !== undefined && form.body.trim() !== '') {
    payload.body = form.body.trim();
  }

  if (form.audience !== undefined) {
    payload.audience = form.audience;
    if (form.audience === 'Team' && form.team && form.team.trim() !== '') {
      payload.team = form.team.trim();
    }
  } else if (form.team !== undefined && form.team.trim() !== '') {
    payload.team = form.team.trim();
  }

  if (form.pinned !== undefined) {
    payload.pinned = Boolean(form.pinned);
  }

  if (form.publishedAt !== undefined && form.publishedAt.trim() !== '') {
    payload.publishedAt = new Date(form.publishedAt).toISOString();
  }

  return payload;
}

export interface CreateDocumentFormState {
  title: string;
  category: 'Policy' | 'Form' | 'Schedule' | 'Report' | 'Other';
  visibility: 'Public' | 'All' | 'Athletes' | 'Coaches' | 'Organizers' | 'Team';
  team?: string;
}

export interface CreateDocumentPayload {
  title: string;
  category: 'Policy' | 'Form' | 'Schedule' | 'Report' | 'Other';
  visibility: 'Public' | 'All' | 'Athletes' | 'Coaches' | 'Organizers' | 'Team';
  team?: string;
}

export function buildCreateDocumentPayload(
  form: CreateDocumentFormState
): CreateDocumentPayload {
  const payload: CreateDocumentPayload = {
    title: form.title.trim(),
    category: form.category,
    visibility: form.visibility,
  };

  if (form.visibility === 'Team' && form.team && form.team.trim() !== '') {
    payload.team = form.team.trim();
  }

  return payload;
}
