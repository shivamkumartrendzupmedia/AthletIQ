/**
 * ATHLETIQ Global Design System Tokens
 */

export const colors = {
  deepPurple: '#171044',
  purplePrimary: '#4B2A9B',
  electricLime: '#D8F500',
  athleticOrange: '#FF5A00',
  warmOffWhite: '#F7F1E8',
  athleticBlack: '#111111',
  pureWhite: '#FFFFFF',
  
  // Muted & Surface helper tokens
  surfaceCard: '#FFFFFF',
  surfaceMuted: '#EFE8DD',
  borderSubtle: 'rgba(23, 16, 68, 0.08)',
  borderDarkSubtle: 'rgba(255, 255, 255, 0.12)',
} as const;

export const fonts = {
  display: "'Outfit', sans-serif",
  body: "'Plus Jakarta Sans', sans-serif",
} as const;

export const shadows = {
  athletic: '0 10px 30px -10px rgba(23, 16, 68, 0.12)',
  athleticLg: '0 20px 40px -15px rgba(23, 16, 68, 0.18)',
  orangeGlow: '0 10px 25px -5px rgba(255, 90, 0, 0.35)',
  limeGlow: '0 10px 25px -5px rgba(216, 245, 0, 0.4)',
} as const;

export const borderRadius = {
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  full: '9999px',
} as const;

export const motionVariants = {
  fadeInUp: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  },
  staggerContainer: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  },
  cardHover: {
    rest: { y: 0, scale: 1 },
    hover: { y: -6, scale: 1.01, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
  },
};
