/**
 * Converts a string into a clean, URL-safe alphanumeric kebab-case slug.
 */
export const slugify = (text: string): string => {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'item';
};

/**
 * Race-safe operation executor for slug-indexed collections.
 * Rather than relying on check-then-insert (which races under concurrency),
 * it executes the document insert/save directly. If a MongoDB duplicate-key error
 * (code 11000 on slug) is encountered, it automatically retries with an incremented suffix.
 */
export const executeWithSlugRetry = async <T>(
  baseName: string,
  operation: (slug: string) => Promise<T>,
  maxRetries = 5
): Promise<T> => {
  const baseSlug = slugify(baseName);
  let currentSlug = baseSlug;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation(currentSlug);
    } catch (err: unknown) {
      const mongoErr = typeof err === 'object' && err !== null ? (err as { code?: number; keyPattern?: Record<string, unknown>; keyValue?: Record<string, unknown> }) : null;
      const isMongo11000 = mongoErr?.code === 11000;
      const isSlugConflict =
        isMongo11000 &&
        Boolean(
          (mongoErr?.keyPattern && 'slug' in mongoErr.keyPattern) ||
          (mongoErr?.keyValue && 'slug' in mongoErr.keyValue)
        );

      if (isSlugConflict && attempt < maxRetries) {
        currentSlug = `${baseSlug}-${attempt + 1}`;
        continue;
      }

      throw err;
    }
  }

  throw new Error(`Failed to generate unique slug for "${baseName}" after ${maxRetries} attempts`);
};
