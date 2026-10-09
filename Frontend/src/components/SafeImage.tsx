import React, { useState, useEffect } from 'react';

export type FallbackKind = 'team' | 'program' | 'coach' | 'person';

export interface SafeImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackKind: FallbackKind;
  name?: string;
}

/**
 * Pure validation rule: Only remote URLs strictly starting with "https://" are allowed.
 * Disallows http://, data:, javascript:, relative paths, null, undefined, or empty strings.
 */
export function isValidImageUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('https://')) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Extract clean 1-2 uppercase initials from a name string.
 */
export function getInitials(name?: string, fallback = 'A'): string {
  if (!name || !name.trim()) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * SafeImage component ensuring zero broken images, zero layout jumps,
 * and zero insecure or malicious image protocols.
 */
export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = '',
  fallbackKind,
  name,
}) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state whenever src changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  const isValid = isValidImageUrl(src);
  const displayName = name || alt || 'Athletiq';
  const altText = alt || name || 'Athletiq Image';
  const initials = getInitials(displayName, fallbackKind === 'program' ? 'S' : 'A');

  if (!isValid || hasError) {
    switch (fallbackKind) {
      case 'team':
        return (
          <div
            role="img"
            aria-label={altText}
            className={`bg-gradient-to-br from-[#171044] to-[#4B2A9B] text-[#D8F500] flex flex-col items-center justify-center font-display font-black select-none tracking-wider shadow-inner ${className}`}
          >
            <span className="text-3xl leading-none">{initials}</span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-white/70 mt-1">
              ATHLETIQ SQUAD
            </span>
          </div>
        );

      case 'program':
        return (
          <div
            role="img"
            aria-label={altText}
            className={`bg-gradient-to-br from-[#171044] via-[#2A1B60] to-[#171044] text-[#D8F500] flex flex-col items-center justify-center font-display font-black select-none tracking-wider shadow-inner relative overflow-hidden ${className}`}
          >
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#D8F500_1px,transparent_1px)] [background-size:16px_16px]" />
            <span className="text-4xl leading-none relative z-10">{initials.slice(0, 1)}</span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-white/70 mt-1 relative z-10">
              PROGRAM
            </span>
          </div>
        );

      case 'coach':
      case 'person':
      default:
        return (
          <div
            role="img"
            aria-label={altText}
            className={`bg-[#171044] text-[#D8F500] flex items-center justify-center font-display font-black select-none border border-white/10 shrink-0 ${className}`}
          >
            <span className="text-base leading-none">{initials}</span>
          </div>
        );
    }
  }

  return (
    <img
      src={src!.trim()}
      alt={altText}
      className={className}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
};
