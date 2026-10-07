import React, { useState } from 'react';
import { galleryData } from '../data/galleryData';
import { Card, SectionHeader, CrossAccent, AthleticBadge } from '../design-system';

export const GalleryPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', 'Training', 'Matches', 'Tournaments', 'Events'];

  const filteredGallery =
    activeCategory === 'All'
      ? galleryData
      : galleryData.filter((item) => item.category === activeCategory);

  return (
    <div className="space-y-16 pb-20">
      {/* Header */}
      <section className="bg-[#171044] text-white py-16 md:py-20 rounded-b-3xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <AthleticBadge variant="lime">EDITORIAL MEDIA GALLERY</AthleticBadge>
          <h1 className="text-4xl md:text-6xl font-black font-display">
            PHOTO & MATCH GALLERY <CrossAccent color="orange" size="lg" />
          </h1>
          <p className="text-base md:text-lg text-white/80 max-w-2xl mx-auto">
            High-definition moments capturing training intensity, match highlights, and trophy celebrations.
          </p>
        </div>
      </section>

      {/* Category Tabs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-full font-display font-extrabold text-sm transition-all duration-200 ${
                activeCategory === cat
                  ? 'bg-[#FF5A00] text-white shadow-md'
                  : 'bg-white text-[#171044] hover:bg-[#171044]/10 border border-[#171044]/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Gallery Masonry/Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredGallery.map((item) => (
            <div key={item.id} className="relative rounded-3xl overflow-hidden h-80 group shadow-lg">
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#171044] via-transparent to-transparent p-6 flex flex-col justify-end opacity-90 transition-opacity">
                <AthleticBadge variant="lime" size="sm" className="w-fit mb-2">
                  {item.category}
                </AthleticBadge>
                <h3 className="text-xl font-bold font-display text-white">{item.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
