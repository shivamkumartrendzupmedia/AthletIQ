export type AchievementCategory =
  | 'Tournament Win'
  | 'Individual Award'
  | 'Team Milestone'
  | 'Academy Milestone'
  | 'Other';

export interface CreateAchievementInput {
  title: string;
  description: string;
  category: AchievementCategory;
  achievedOn: string;
  imageUrl?: string;
  featured?: boolean;
}

export interface UpdateAchievementInput {
  title?: string;
  description?: string;
  category?: AchievementCategory;
  achievedOn?: string;
  imageUrl?: string;
  featured?: boolean;
}

/**
 * Pure payload builder for creating an achievement.
 * Conforms 1:1 with Backend createAchievementSchema (.strict()).
 */
export function buildCreateAchievementPayload(
  input: CreateAchievementInput
): {
  title: string;
  description: string;
  category: AchievementCategory;
  achievedOn: string;
  imageUrl?: string;
  featured?: boolean;
} {
  const payload: {
    title: string;
    description: string;
    category: AchievementCategory;
    achievedOn: string;
    imageUrl?: string;
    featured?: boolean;
  } = {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    achievedOn: input.achievedOn.trim(),
    featured: Boolean(input.featured),
  };

  if (input.imageUrl && input.imageUrl.trim().length > 0) {
    payload.imageUrl = input.imageUrl.trim();
  }

  return payload;
}

/**
 * Pure payload builder for updating an achievement.
 * Conforms 1:1 with Backend updateAchievementSchema (.strict()).
 */
export function buildUpdateAchievementPayload(
  input: UpdateAchievementInput
): UpdateAchievementInput {
  const payload: UpdateAchievementInput = {};

  if (input.title !== undefined && input.title.trim().length > 0) {
    payload.title = input.title.trim();
  }
  if (input.description !== undefined && input.description.trim().length > 0) {
    payload.description = input.description.trim();
  }
  if (input.category !== undefined) {
    payload.category = input.category;
  }
  if (input.achievedOn !== undefined && input.achievedOn.trim().length > 0) {
    payload.achievedOn = input.achievedOn.trim();
  }
  if (input.imageUrl !== undefined) {
    const trimmed = input.imageUrl.trim();
    if (trimmed.length > 0) {
      payload.imageUrl = trimmed;
    }
  }
  if (input.featured !== undefined) {
    payload.featured = input.featured;
  }

  return payload;
}
