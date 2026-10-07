import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tournamentService, type FullTournamentData } from '../services/tournamentService';
import { Button, Card, CrossAccent, AthleticBadge } from '../design-system';
import { ArrowRight, Trophy, Calendar, MapPin, Users, Plus } from 'lucide-react';

export const TournamentsPage: React.FC = () => {
  const [filter, setFilter] = useState<'All' | 'Upcoming' | 'Live' | 'Completed'>('All');
  const [tournaments, setTournaments] = useState<FullTournamentData[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await tournamentService.getTournaments();
      setTournaments(data);
    };
    load();
    const unsub = tournamentService.subscribe(load);
    return () => unsub();
  }, []);

  const filteredTournaments =
    filter === 'All' ? tournaments : tournaments.filter((t) => t.status === filter);

  return (
    <div className="space-y-16 pb-20">
      {/* Header */}
      <section className="bg-[#171044] text-white py-16 md:py-20 rounded-b-3xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <AthleticBadge variant="lime">COMPETITIONS ENGINE</AthleticBadge>
          <h1 className="text-4xl md:text-6xl font-black font-display uppercase tracking-tight">
            TOURNAMENTS & LEAGUES <CrossAccent color="orange" size="lg" />
          </h1>
          <p className="text-base md:text-lg text-white/80 max-w-2xl mx-auto">
            Explore live championship fixtures, group stages, and bracket trees.
          </p>
          <div className="pt-2">
            <Link to="/dashboard/tournaments">
              <Button variant="primary" size="sm">
                <Plus size={16} /> Tournament Admin Command Center
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Filter Tabs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center gap-3 mb-10">
          {(['All', 'Upcoming', 'Live', 'Completed'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-5 py-2.5 rounded-full font-display font-extrabold text-sm transition-all duration-200 ${
                filter === st
                  ? 'bg-[#FF5A00] text-white shadow-md'
                  : 'bg-white text-[#171044] hover:bg-[#171044]/10 border border-[#171044]/10'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Tournaments List */}
        <div className="space-y-8">
          {filteredTournaments.map((t) => (
            <Card key={t.id} variant="tournament" padding="none" className="group overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
                <div className="lg:col-span-5 h-64 lg:h-full relative overflow-hidden">
                  <img
                    src={t.bannerImage}
                    alt={t.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <AthleticBadge variant={t.status === 'Live' ? 'live' : 'lime'}>{t.status}</AthleticBadge>
                    <AthleticBadge variant="dark">{t.sport}</AthleticBadge>
                  </div>
                </div>

                <div className="lg:col-span-7 p-8 space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-2xl md:text-3xl font-black font-display text-[#171044]">{t.name}</h3>
                    <span className="text-xs font-bold text-[#FF5A00]">{t.ageGroup}</span>
                  </div>
                  <p className="text-xs text-[#171044]/70 leading-relaxed font-medium">{t.description}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 text-xs text-[#171044]">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-[#FF5A00]" />
                      <span className="font-semibold">{t.datesFormatted}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-[#FF5A00]" />
                      <span className="font-semibold truncate">{t.venue}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-[#FF5A00]" />
                      <span className="font-semibold">{t.teams.length} Teams Enrolled</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#171044]/10 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#4B2A9B]">{t.fixtures.length} Total Matches</span>
                    <Link to={`/tournaments/${t.id}`}>
                      <Button variant="primary" size="sm" iconRight={<ArrowRight size={14} />}>
                        View Bracket & Fixtures
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};
