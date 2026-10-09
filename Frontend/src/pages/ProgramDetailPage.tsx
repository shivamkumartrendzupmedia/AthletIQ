import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CrossAccent, AthleticBadge } from '../design-system';
import { ArrowLeft, CheckCircle, Clock } from 'lucide-react';
import { academyApi, type PublicSportItem } from '../services/academyApi';
import { SafeImage } from '../components/SafeImage';

export const ProgramDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [sport, setSport] = useState<PublicSportItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchSport = async () => {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const sportItem = await academyApi.getPublicSportBySlug(id);
        if (sportItem) {
          setSport(sportItem);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchSport();
  }, [id]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="text-xl font-bold font-display text-[#171044]/60">
          Loading program details...
        </div>
      </div>
    );
  }

  if (notFound || !sport) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center space-y-6">
        <h1 className="text-4xl font-black font-display text-[#171044]">Program Not Found</h1>
        <p className="text-sm text-[#171044]/70 max-w-md mx-auto">
          The sport program you requested is currently inactive or does not exist.
        </p>
        <Link to="/programs">
          <button className="px-6 py-2.5 rounded-full bg-[#171044] text-[#D8F500] font-display font-bold text-xs uppercase tracking-wider hover:bg-[#281c66] transition-colors">
            Back to All Programs
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-16 pb-20">
      {/* Back Link */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link
          to="/programs"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#171044] hover:text-[#FF5A00]"
        >
          <ArrowLeft size={16} /> Back to Programs
        </Link>
      </div>

      {/* Hero Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden h-96 border border-[#171044]/10 shadow-2xl">
          <SafeImage
            src={sport.image || sport.icon}
            alt={sport.name}
            fallbackKind="program"
            name={sport.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#171044] via-[#171044]/60 to-transparent p-8 md:p-12 flex flex-col justify-end">
            <div className="flex items-center gap-3 mb-2">
              <AthleticBadge variant="lime">
                {sport.ageGroups && sport.ageGroups.length > 0
                  ? sport.ageGroups.join(', ')
                  : 'All Ages'}
              </AthleticBadge>
              <AthleticBadge variant="orange">Official Academy Program</AthleticBadge>
            </div>
            <h1 className="text-4xl md:text-6xl font-black font-display text-white">
              {sport.name} <CrossAccent color="lime" size="lg" />
            </h1>
            <p className="text-white/80 max-w-2xl text-sm md:text-base mt-2 line-clamp-2">
              {sport.description}
            </p>
          </div>
        </div>
      </section>

      {/* Program Details Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column - Description & Curriculum */}
          <div className="lg:col-span-8 space-y-8">
            <Card variant="standard" className="space-y-6">
              <h2 className="text-3xl font-black font-display text-[#171044]">
                Program Overview <CrossAccent color="orange" size="sm" />
              </h2>
              <p className="text-base text-[#171044]/80 leading-relaxed font-medium">
                {sport.description}
              </p>

              {sport.features && sport.features.length > 0 && (
                <>
                  <h3 className="text-xl font-bold font-display text-[#171044] pt-4 border-t border-[#171044]/10">
                    Curriculum Features & Infrastructure
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sport.features.map((feature, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 bg-[#F7F1E8] p-4 rounded-2xl"
                      >
                        <CheckCircle size={20} className="text-[#FF5A00] shrink-0 mt-0.5" />
                        <span className="text-sm font-semibold text-[#171044]">{feature}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* Right Column - Quick Summary Card */}
          <div className="lg:col-span-4 space-y-6">
            <Card variant="dark" className="space-y-6 sticky top-24">
              <h3 className="text-2xl font-black font-display text-white">
                Program Summary <CrossAccent color="lime" size="sm" />
              </h3>

              <div className="space-y-4 text-sm font-semibold">
                <div className="flex items-center gap-3 text-white/90">
                  <Clock size={18} className="text-[#D8F500]" />
                  <span>Season: 2026 Academic Year</span>
                </div>
                <div className="flex items-center gap-3 text-white/90">
                  <span className="text-base">🏆</span>
                  <span>Active Brackets: {sport.ageGroups?.join(', ') || 'U16'}</span>
                </div>
                <div className="flex items-center gap-3 text-white/70 text-xs pt-1">
                  <span>Contact the academy for fees and admissions.</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <Link to="/contact">
                  <button className="w-full py-3 rounded-full bg-[#FF5A00] text-white font-display font-extrabold text-sm uppercase tracking-wider hover:bg-[#e04f00] transition-colors">
                    Enroll in Program
                  </button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};
