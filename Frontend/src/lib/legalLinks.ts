export interface LegalLink {
  label: string;
  path: string;
}

export const LEGAL_LINKS: readonly LegalLink[] = [
  { label: 'Privacy Policy', path: '/privacy' },
  { label: 'Terms of Service', path: '/terms' },
  { label: 'Code of Conduct', path: '/code-of-conduct' },
] as const;
