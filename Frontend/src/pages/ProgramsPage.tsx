import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SectionHeader, CrossAccent, AthleticBadge } from '../design-system';
import { sportsData } from '../data/sportsData';
import { ArrowRight, Check } from 'lucide-react';

export const ProgramsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Football', 'Basketball', 'Tennis', 'Swimming', 'Athletics', 'Volleyball'];

  const filteredSports =
    selectedCategory === 'All'
      ? sportsData
      : sportsData.filter((s) => s.category === selectedCategory || (selectedCategory === 'Football' && s.category === 'Soccer'));

  const getCardTheme = (category: string) => {
    switch (category.toLowerCase()) {
      case 'soccer':
      case 'football':
        return {
          bg: 'bg-[#171044]',
          text: 'text-white',
          desc: 'text-white/80',
          iconBg: 'bg-[#D8F500]/20 text-[#D8F500]',
          btn: 'bg-[#D8F500] text-[#171044] hover:bg-[#c4e000]',
          badge: 'lime' as const,
          icon: '⚽',
        };
      case 'basketball':
        return {
          bg: 'bg-[#FF5A00]',
          text: 'text-white',
          desc: 'text-white/90',
          iconBg: 'bg-white/20 text-white',
          btn: 'bg-white text-[#FF5A00] hover:bg-white/90',
          badge: 'dark' as const,
          icon: '🏀',
        };
      case 'tennis':
        return {
          bg: 'bg-[#D8F500]',
          text: 'text-[#171044]',
          desc: 'text-[#171044]/80',
          iconBg: 'bg-[#171044]/15 text-[#171044]',
          btn: 'bg-[#171044] text-white hover:bg-[#281c66]',
          badge: 'dark' as const,
          icon: '🎾',
        };
      case 'swimming':
        return {
          bg: 'bg-[#4B2A9B]',
          text: 'text-white',
          desc: 'text-white/80',
          iconBg: 'bg-white/20 text-white',
          btn: 'bg-[#D8F500] text-[#171044] hover:bg-[#c4e000]',
          badge: 'lime' as const,
          icon: '🏊‍♂️',
        };
      case 'athletics':
        return {
          bg: 'bg-gradient-to-br from-[#FF5A00] to-[#171044]',
          text: 'text-white',
          desc: 'text-white/80',
          iconBg: 'bg-white/20 text-white',
          btn: 'bg-white text-[#171044] hover:bg-white/90',
          badge: 'orange' as const,
          icon: '🏃‍♂️',
        };
      case 'volleyball':
      default:
        return {
          bg: 'bg-[#171044]',
          text: 'text-white',
          desc: 'text-white/80',
          iconBg: 'bg-[#FF5A00]/20 text-[#FF5A00]',
          btn: 'bg-[#FF5A00] text-white hover:bg-[#e04f00]',
          badge: 'orange' as const,
          icon: '🏐',
        };
    }
  };

  return (
    <div className="space-y-16 pb-20 bg-[#F7F1E8]">
      {/* Header Banner */}
      <section className="bg-[#171044] text-white py-16 md:py-24 rounded-b-[2.5rem] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#FF5A00]/20 via-transparent to-[#D8F500]/10 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5 relative z-10">
          <AthleticBadge variant="lime">ACADEMY SPORTS PROGRAMS</AthleticBadge>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black font-display uppercase tracking-tight">
            OUR <CrossAccent color="orange" size="lg" /> PROGRAMS
          </h1>
          <p className="text-base md:text-xl text-white/80 max-w-2xl mx-auto font-medium">
            Pick a sport. Find your team. Start your journey under certified professional coaches.
          </p>
        </div>
      </section>

      {/* Filter Tabs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-3 rounded-full font-display font-extrabold text-sm transition-all duration-200 ${
                selectedCategory === cat
                  ? 'bg-[#FF5A00] text-white shadow-lg shadow-[#FF5A00]/30 scale-105'
                  : 'bg-white text-[#171044] hover:bg-[#171044] hover:text-white border border-[#171044]/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Reference-Style Color-Coded Sport Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredSports.map((sport) => {
            const theme = getCardTheme(sport.category);
            return (
              <div
                key={sport.id}
                className={`${theme.bg} ${theme.text} p-8 rounded-[2rem] shadow-2xl flex flex-col justify-between group hover:-translate-y-2 transition-all duration-300 relative overflow-hidden min-h-[420px]`}
              >
                {/* Large Background Sport Watermark Icon */}
                <span className="absolute -right-4 -bottom-6 text-9xl opacity-10 pointer-events-none select-none">
                  {theme.icon}
                </span>

                <div className="space-y-6 relative z-10">
                  {/* Top Bar: Icon + Category Badge + Fee */}
                  <div className="flex items-center justify-between">
                    <div className={`w-14 h-14 rounded-2xl ${theme.iconBg} flex items-center justify-center text-3xl shadow-inner`}>
                      {theme.icon}
                    </div>
                    <div className="flex items-center gap-2">
                      <AthleticBadge variant={theme.badge}>{sport.category}</AthleticBadge>
                      <span className="px-3 py-1 bg-black/20 rounded-full text-xs font-bold font-display">
                        {sport.fee}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-2">
                    <h3 className="text-4xl font-black font-display uppercase tracking-tight">{sport.name}</h3>
                    <p className={`text-sm ${theme.desc} leading-relaxed font-medium`}>{sport.fullDesc}</p>
                  </div>

                  {/* Feature Highlights */}
                  <div className="space-y-2 pt-4 border-t border-current/15">
                    <div className="text-xs font-black uppercase tracking-wider opacity-90">Program Highlights:</div>
                    <ul className="space-y-1.5">
                      {sport.features.slice(0, 3).map((f, i) => (
                        <li key={i} className="text-xs font-semibold flex items-center gap-2">
                          <Check size={14} className="shrink-0 opacity-90" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Bottom CTA Row */}
                <div className="pt-6 mt-6 border-t border-current/15 flex items-center justify-between relative z-10">
                  <span className="text-xs font-black uppercase tracking-wider opacity-90">{sport.schedule}</span>
                  <Link to={`/programs/${sport.id}`}>
                    <button className={`px-6 py-2.5 rounded-full font-display font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-all ${theme.btn}`}>
                      Explore <ArrowRight size={14} />
                    </button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
