import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CrossAccent, AthleticBadge } from '../design-system';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { academyApi, type PublicCoachItem } from '../services/academyApi';
import { SafeImage } from '../components/SafeImage';

export const CoachDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [coach, setCoach] = useState<PublicCoachItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchCoach = async () => {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const coachItem = await academyApi.getPublicCoachById(id);
        if (coachItem) {
          setCoach(coachItem);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchCoach();
  }, [id]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="text-xl font-bold font-display text-[#171044]/60">
          Loading coach profile...
        </div>
      </div>
    );
  }

  if (notFound || !coach) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center space-y-6">
        <h1 className="text-4xl font-black font-display text-[#171044]">Coach Not Found</h1>
        <p className="text-sm text-[#171044]/70 max-w-md mx-auto">
          The coach profile you requested is currently unavailable or does not exist.
        </p>
        <Link to="/coaches">
          <button className="px-6 py-2.5 rounded-full bg-[#171044] text-[#D8F500] font-display font-bold text-xs uppercase tracking-wider hover:bg-[#281c66] transition-colors">
            Back to Coaching Staff
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
          to="/coaches"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#171044] hover:text-[#FF5A00]"
        >
          <ArrowLeft size={16} /> Back to Coaches
        </Link>
      </div>

      {/* Profile Header Card */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card variant="dark" className="p-8 md:p-12 relative overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-4 shrink-0">
              <SafeImage
                src={coach.photo}
                alt={coach.name || coach.title}
                fallbackKind="coach"
                name={coach.name || coach.title}
                className="w-full h-80 rounded-2xl object-cover border-2 border-white/20 shadow-2xl"
              />
            </div>
            <div className="md:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <AthleticBadge variant="lime">{coach.title}</AthleticBadge>
                {coach.experienceYears !== undefined && (
                  <AthleticBadge variant="orange">{coach.experienceYears} Years Experience</AthleticBadge>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-black font-display text-white">
                {coach.name || 'Academy Coach'} <CrossAccent color="lime" size="lg" />
              </h1>
              <p className="text-lg font-bold text-[#D8F500]">{coach.title}</p>
              {coach.bio && (
                <p className="text-sm text-white/80 leading-relaxed font-medium">{coach.bio}</p>
              )}

              {/* Safe Fields: NO email or phone */}
              {coach.specialties && coach.specialties.length > 0 && (
                <div className="pt-4 border-t border-white/10 space-y-2">
                  <span className="text-xs font-bold text-white/60 block uppercase">
                    Coaching Specialties
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {coach.specialties.map((s, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-white/10 text-white font-semibold px-3 py-1 rounded-full flex items-center gap-1.5"
                      >
                        <CheckCircle2 size={12} className="text-[#D8F500]" />
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4">
                <Link to="/contact">
                  <button className="px-6 py-2.5 rounded-full bg-[#FF5A00] text-white font-display font-bold text-xs uppercase tracking-wider hover:bg-[#e04f00] transition-colors">
                    Inquire About Training
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
};
