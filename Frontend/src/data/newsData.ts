export interface NewsArticle {
  id: string;
  title: string;
  category: 'Academy' | 'Tournament' | 'Athlete Spotlight' | 'Coaching';
  date: string;
  author: string;
  image: string;
  summary: string;
  readTime: string;
}

export const newsData: NewsArticle[] = [
  {
    id: 'u16-strikers-clinch-regional-title',
    title: 'U16 Strikers Clinch Regional Championship Title in 3-2 Thriller',
    category: 'Tournament',
    date: 'August 28, 2026',
    author: 'AthletiQ Media',
    image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800&auto=format&fit=crop',
    summary: 'In an unforgettable final, Alex Morgan scored a 89th-minute volley to seal the victory for AthletiQ U16 Strikers against Rising Stars FC.',
    readTime: '4 min read',
  },
  {
    id: 'gps-performance-tracking-launched',
    title: 'AthletiQ Introduces Pro-Grade GPS Performance Tracking Across All Squads',
    category: 'Academy',
    date: 'August 20, 2026',
    author: 'Sports Science Dept',
    image: 'https://images.unsplash.com/photo-1517649763962-0c623266010b?q=80&w=800&auto=format&fit=crop',
    summary: 'Every athlete at AthletiQ will now be equipped with live biomechanic sensors tracking sprint speed, acceleration load, heart rate zones, and heatmaps.',
    readTime: '3 min read',
  },
  {
    id: 'sophia-chen-secures-d1-scholarship',
    title: 'Tennis Prodigy Sophia Chen Secures NCAA Division 1 Full Scholarship',
    category: 'Athlete Spotlight',
    date: 'August 12, 2026',
    author: 'Academy Director',
    image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?q=80&w=800&auto=format&fit=crop',
    summary: 'After 4 years at AthletiQ Tennis Academy, 17-year-old Sophia Chen has officially signed her commitment letter to compete in NCAA Division 1.',
    readTime: '5 min read',
  },
  {
    id: 'registration-open-active-nb-cup',
    title: 'Official Team Registrations Now Open for Active NB Cup 2026',
    category: 'Tournament',
    date: 'August 05, 2026',
    author: 'Tournament Committee',
    image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format&fit=crop',
    summary: 'Early bird registration is officially open for 24 youth academy slots in the annual Active NB Cup taking place in October.',
    readTime: '2 min read',
  },
];
