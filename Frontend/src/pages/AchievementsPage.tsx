import React, { useState, useEffect, useCallback } from 'react';
import { CrossAccent, AthleticBadge } from '../design-system';
import { Trophy, Calendar, RefreshCw } from 'lucide-react';
import {
  academyApi,
  type AchievementItem,
  type AchievementCategory,
} from '../services/academyApi';
import { SafeImage } from '../components/SafeImage';
import { ApiClientError } from '../lib/apiClient';

const CATEGORIES: Array<'All' | AchievementCategory> = [
  'All',
  'Tournament Win',
  'Individual Award',
  'Team Milestone',
  'Academy Milestone',
  'Other',
];

export const AchievementsPage: React.FC = () => {
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'All' | AchievementCategory>('All');
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchAchievements = useCallback(async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const res = await academyApi.getPublicAchievements({
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        page,
        limit: 12,
      });
      setAchievements(res.items);
      setTotalPages(res.pagination.totalPages || 1);
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to load achievements.';
      setErrorBanner(msg);
      setAchievements([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAchievements();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchAchievements]);

  return (
    <div className="space-y-16 pb-20">
      {/* Header Banner */}
      <section className="bg-[#171044] text-white py-16 md:py-20 rounded-b-3xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <AthleticBadge variant="lime">TROPHY CABINET & MILESTONES</AthleticBadge>
          <h1 className="text-4xl md:text-6xl font-black font-display">
            HALL OF FAME <CrossAccent color="orange" size="lg" />
          </h1>
          <p className="text-base md:text-lg text-white/80 max-w-2xl mx-auto font-medium">
            Celebrating regional titles, tournament championships, and progressive athlete milestones.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Category Filter Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setPage(1);
              }}
              className={`px-5 py-2.5 rounded-full font-display font-extrabold text-xs uppercase tracking-wider transition-all duration-200 ${
                selectedCategory === cat
                  ? 'bg-[#171044] text-[#D8F500] shadow-md scale-105'
                  : 'bg-white text-[#171044]/80 hover:bg-[#171044]/10 border border-[#171044]/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {errorBanner && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-700 rounded-2xl text-xs font-semibold text-center flex items-center justify-center gap-2">
            <span>{errorBanner}</span>
            <button
              onClick={() => fetchAchievements()}
              className="underline font-bold flex items-center gap-1"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center font-display font-bold text-base text-[#171044]/60">
            Loading academy achievements...
          </div>
        ) : achievements.length === 0 ? (
          <div className="py-24 text-center max-w-md mx-auto space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-[#171044]/5 text-[#171044]/40 mx-auto flex items-center justify-center">
              <Trophy size={32} />
            </div>
            <div className="text-xl font-bold font-display text-[#171044]">
              No achievements published yet.
            </div>
            <p className="text-xs text-[#171044]/60 leading-relaxed font-medium">
              Milestones, championship trophies, and honors will appear here once officially recorded.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {achievements.map((ach) => (
              <div
                key={ach.id}
                className="bg-white rounded-[2rem] p-6 shadow-xl border border-[#171044]/10 flex flex-col justify-between group hover:-translate-y-1 hover:shadow-2xl transition-all duration-300"
              >
                <div className="space-y-4">
                  {/* Thumbnail / Brand-tile fallback */}
                  <div className="w-full h-48 rounded-2xl overflow-hidden bg-[#171044] text-[#D8F500] flex items-center justify-center relative border border-[#171044]/10">
                    <SafeImage
                      src={ach.imageUrl}
                      alt={ach.title}
                      name={ach.title}
                      fallbackKind="program"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {ach.featured && (
                      <div className="absolute top-3 right-3 bg-[#D8F500] text-[#171044] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow">
                        ★ Featured
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <AthleticBadge variant="purple">{ach.category}</AthleticBadge>
                      <span className="text-[11px] font-semibold text-[#171044]/60 flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(ach.achievedOn).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>

                    <h3 className="text-xl font-black font-display text-[#171044] group-hover:text-[#FF5A00] transition-colors leading-tight">
                      {ach.title}
                    </h3>

                    <p className="text-xs text-[#171044]/75 leading-relaxed font-medium line-clamp-3">
                      {ach.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-6">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-5 py-2.5 bg-white border border-[#171044]/15 rounded-xl text-xs font-bold text-[#171044] disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs font-bold text-[#171044]/70">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-5 py-2.5 bg-white border border-[#171044]/15 rounded-xl text-xs font-bold text-[#171044] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
