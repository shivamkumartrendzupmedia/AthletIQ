import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CrossAccent, AthleticBadge } from '../design-system';
import { ArrowRight } from 'lucide-react';
import { academyApi, type PublicTeamItem } from '../services/academyApi';
import { SafeImage } from '../components/SafeImage';

export const TeamsPage: React.FC = () => {
  const [teams, setTeams] = useState<PublicTeamItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await academyApi.getPublicTeams({ limit: 100 });
      setTeams(res.items);
    } catch {
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTeams();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchTeams]);

  return (
    <div className="space-y-16 pb-20">
      {/* Header Banner */}
      <section className="bg-[#171044] text-white py-16 md:py-20 rounded-b-3xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <AthleticBadge variant="orange">ACADEMY SQUADS</AthleticBadge>
          <h1 className="text-4xl md:text-6xl font-black font-display">
            COMPETITIVE SQUADS <CrossAccent color="orange" size="lg" />
          </h1>
          <p className="text-base md:text-lg text-white/80 max-w-2xl mx-auto">
            Explore our elite developmental rosters competing across regional and national divisions.
          </p>
        </div>
      </section>

      {/* Teams Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="py-20 text-center font-display font-bold text-xl text-[#171044]/60">
            Loading academy squads...
          </div>
        ) : (teams || []).length === 0 ? (
          <div className="py-20 text-center max-w-md mx-auto space-y-4">
            <div className="text-2xl font-black font-display text-[#171044]">
              Teams forming soon
            </div>
            <p className="text-sm text-[#171044]/70 leading-relaxed font-medium">
              Tryout registrations and squad brackets for the upcoming season are currently in progress.
            </p>
            <Link to="/programs">
              <button className="px-6 py-2.5 rounded-full bg-[#171044] text-[#D8F500] font-display font-bold text-xs uppercase tracking-wider hover:bg-[#281c66] transition-colors mt-2">
                View Sports Programs
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(teams || []).map((team) => (
              <Card
                key={team.id}
                variant="standard"
                padding="none"
                className="group overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="h-56 relative overflow-hidden bg-[#171044]">
                    <SafeImage
                      src={team.logo}
                      alt={team.name}
                      fallbackKind="team"
                      name={team.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4 flex gap-2">
                      <AthleticBadge variant="dark">{team.sport?.name || 'Sport'}</AthleticBadge>
                      <AthleticBadge variant="orange">{team.ageGroup}</AthleticBadge>
                    </div>
                  </div>

                  <div className="p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-black font-display text-[#171044]">{team.name}</h3>
                      <span className="text-xs font-bold bg-[#D8F500] text-[#171044] px-2.5 py-0.5 rounded-full">
                        {team.athleteCount} Players
                      </span>
                    </div>

                    <p className="text-xs text-[#FF5A00] font-bold">
                      Head Coach: {team.coach?.name || 'Assigned Coaching Staff'}
                    </p>

                    <div className="text-xs text-[#171044]/60 font-medium">
                      Season: {team.season || '2026'} • Bracket: {team.ageGroup}
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <Link to={`/teams/${team.slug}`}>
                    <button className="w-full py-2.5 rounded-full bg-[#171044] text-[#D8F500] font-display font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#281c66] transition-colors">
                      Squad Details <ArrowRight size={14} />
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
