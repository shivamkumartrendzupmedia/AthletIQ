export interface GalleryItem {
  id: string;
  title: string;
  category: 'Training' | 'Matches' | 'Tournaments' | 'Events';
  image: string;
  span?: string;
}

export const galleryData: GalleryItem[] = [
  {
    id: 'gal-1',
    title: 'High-Tempo Football Training Session',
    category: 'Training',
    image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800&auto=format&fit=crop',
    span: 'col-span-1 md:col-span-2 row-span-2',
  },
  {
    id: 'gal-2',
    title: 'Championship Trophy Celebration',
    category: 'Events',
    image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format&fit=crop',
    span: 'col-span-1',
  },
  {
    id: 'gal-3',
    title: 'Hardwood Basketball Clutch Shot',
    category: 'Matches',
    image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=800&auto=format&fit=crop',
    span: 'col-span-1',
  },
  {
    id: 'gal-4',
    title: 'Olympic Pool Swim Sprint Start',
    category: 'Matches',
    image: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?q=80&w=800&auto=format&fit=crop',
    span: 'col-span-1 md:col-span-2',
  },
  {
    id: 'gal-5',
    title: 'Clay Tennis Forehand Drive',
    category: 'Training',
    image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?q=80&w=800&auto=format&fit=crop',
    span: 'col-span-1',
  },
  {
    id: 'gal-6',
    title: 'Track & Field Acceleration Drill',
    category: 'Training',
    image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=800&auto=format&fit=crop',
    span: 'col-span-1',
  },
  {
    id: 'gal-7',
    title: 'Active NB Cup Knockout Finals',
    category: 'Tournaments',
    image: 'https://images.unsplash.com/photo-1517649763962-0c623266010b?q=80&w=800&auto=format&fit=crop',
    span: 'col-span-1 md:col-span-2',
  },
];
