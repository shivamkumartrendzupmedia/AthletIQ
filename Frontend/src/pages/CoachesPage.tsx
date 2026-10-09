import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CrossAccent, AthleticBadge } from '../design-system';
import { ArrowRight, Award } from 'lucide-react';
import { academyApi, type PublicCoachItem } from '../services/academyApi';
import { SafeImage } from '../components/SafeImage';

export const CoachesPage: React.FC = () => {
  const [coaches, setCoaches] = useState<PublicCoachItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCoaches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await academyApi.getPublicCoaches({ limit: 100 });
      setCoaches(res.items);
    } catch {
      setCoaches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCoaches();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchCoaches]);

  return (
    <div className="space-y-16 pb-20">
      {/* Header Banner */}
      <section className="bg-[#171044] text-white py-16 md:py-20 rounded-b-3xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <AthleticBadge variant="lime">ACADEMY COACHING STAFF</AthleticBadge>
          <h1 className="text-4xl md:text-6xl font-black font-display">
            WORLD-CLASS COACHES <CrossAccent color="orange" size="lg" />
          </h1>
          <p className="text-base md:text-lg text-white/80 max-w-2xl mx-auto">
            Experienced Olympic, UEFA, and FIBA certified leaders driving athlete progression.
          </p>
        </div>
      </section>

      {/* Coaches Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="py-20 text-center font-display font-bold text-xl text-[#171044]/60">
            Loading coaching staff...
          </div>
        ) : (coaches || []).length === 0 ? (
          <div className="py-20 text-center max-w-md mx-auto space-y-4">
            <div className="text-2xl font-black font-display text-[#171044]">
              Coaching staff being finalized
            </div>
            <p className="text-sm text-[#171044]/70 leading-relaxed font-medium">
              We are assembling our accredited coaches and trainers for upcoming sports seasons. Check back soon.
            </p>
            <Link to="/programs">
              <button className="px-6 py-2.5 rounded-full bg-[#171044] text-[#D8F500] font-display font-bold text-xs uppercase tracking-wider hover:bg-[#281c66] transition-colors mt-2">
                Explore Programs
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {(coaches || []).map((coach) => (
              <Card
                key={coach.id}
                variant="standard"
                padding="none"
                className="group overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="h-72 relative overflow-hidden bg-[#171044]">
                    <SafeImage
                      src={coach.photo}
                      alt={coach.name || coach.title}
                      fallbackKind="coach"
                      name={coach.name || coach.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4">
                      <AthleticBadge variant="dark">{coach.title}</AthleticBadge>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="text-2xl font-black font-display text-[#171044]">
                        {coach.name || 'Academy Coach'}
                      </h3>
                      <p className="text-xs text-[#FF5A00] font-bold mt-0.5">{coach.title}</p>
                    </div>

                    <div className="space-y-1.5 text-xs text-[#171044]/70 font-medium">
                      {coach.experienceYears !== undefined && (
                        <div className="flex items-center gap-1.5">
                          <Award size={14} className="text-[#FF5A00]" />
                          <span>{coach.experienceYears} Years Academy Experience</span>
                        </div>
                      )}
                      {coach.specialties && coach.specialties.length > 0 && (
                        <div className="text-[11px] text-[#171044]/60">
                          Specialties: {coach.specialties.join(', ')}
                        </div>
                      )}
                    </div>

                    {coach.bio && (
                      <p className="text-xs text-[#171044]/80 line-clamp-2 leading-relaxed">
                        {coach.bio}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <Link to={`/coaches/${coach.id}`}>
                    <button className="w-full py-2.5 rounded-full bg-[#171044] text-[#D8F500] font-display font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#281c66] transition-colors">
                      View Profile <ArrowRight size={14} />
                    </button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
