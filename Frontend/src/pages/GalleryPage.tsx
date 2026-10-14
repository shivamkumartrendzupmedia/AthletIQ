import React from 'react';
import { Link } from 'react-router-dom';
import { CrossAccent, AthleticBadge } from '../design-system';
import { Image as ImageIcon, ArrowLeft } from 'lucide-react';

export const GalleryPage: React.FC = () => {
  return (
    <div className="space-y-16 pb-20">
      {/* Header */}
      <section className="bg-[#171044] text-white py-16 md:py-20 rounded-b-3xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <AthleticBadge variant="lime">MEDIA & PHOTOGRAPHY</AthleticBadge>
          <h1 className="text-4xl md:text-6xl font-black font-display">
            PHOTO & MATCH GALLERY <CrossAccent color="orange" size="lg" />
          </h1>
          <p className="text-base md:text-lg text-white/80 max-w-2xl mx-auto font-medium">
            High-definition moments capturing training intensity, match highlights, and tournament celebrations.
          </p>
        </div>
      </section>

      {/* Honest Coming Soon Notice */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-24 text-center max-w-lg mx-auto bg-white p-12 rounded-3xl border border-[#171044]/10 shadow-sm space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-[#171044]/5 text-[#171044] mx-auto flex items-center justify-center">
            <ImageIcon size={32} />
          </div>
          <h2 className="text-2xl font-black font-display text-[#171044]">
            This section is coming soon.
          </h2>
          <p className="text-xs text-[#171044]/70 leading-relaxed font-medium">
            Our media team is currently curating verified tournament photography and live action highlights for the current season.
          </p>
          <Link to="/">
            <button className="px-6 py-3 bg-[#171044] text-[#D8F500] font-display font-black text-xs uppercase tracking-wider rounded-full shadow hover:bg-[#281c66] transition-all flex items-center gap-2 mx-auto">
              <ArrowLeft size={14} />
              <span>Back to Home</span>
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
};
