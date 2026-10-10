import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CrossAccent, AthleticBadge } from '../design-system';
import { ArrowRight, Trophy, Calendar, Users, Layers, Search } from 'lucide-react';
import { StateContainer } from '../components/StateContainer';
import {
  academyApi,
  type PublicTournamentItem,
  type PublicSportItem,
} from '../services/academyApi';
import { ApiClientError } from '../lib/apiClient';

export const TournamentsPage: React.FC = () => {
  const [tournaments, setTournaments] = useState<PublicTournamentItem[]>([]);
  const [sports, setSports] = useState<PublicSportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Filters
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const [tournRes, sportsRes] = await Promise.all([
        academyApi.getPublicTournaments({
          sport: selectedSport || undefined,
          status: selectedStatus || undefined,
          search: searchQuery || undefined,
          limit: 100,
        }),
        academyApi.getPublicSports(),
      ]);
      setTournaments(tournRes.items);
      setSports(sportsRes.items);
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to load tournament catalog.';
      setErrorBanner(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedSport, selectedStatus, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetFilters = () => {
    setSelectedSport('');
    setSelectedStatus('');
    setSearchQuery('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Registration Open':
        return <AthleticBadge variant="lime">Registration Open</AthleticBadge>;
      case 'In Progress':
        return <AthleticBadge variant="orange">In Progress</AthleticBadge>;
      case 'Completed':
        return <AthleticBadge variant="dark">Completed</AthleticBadge>;
      case 'Cancelled':
        return <AthleticBadge variant="dark">Cancelled</AthleticBadge>;
      default:
        return <AthleticBadge variant="dark">{status}</AthleticBadge>;
    }
  };

  return (
    <div className="space-y-12 pb-20">
      {/* Header Banner */}
      <section className="bg-[#171044] text-white py-16 md:py-20 rounded-b-3xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-block">
            <AthleticBadge variant="lime">PUBLIC COMPETITIONS</AthleticBadge>
          </div>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight flex items-center justify-center gap-3">
            <span>Tournaments & Leagues</span>
            <CrossAccent color="orange" size="lg" />
          </h1>
          <p className="text-base md:text-lg text-white/80 max-w-2xl mx-auto">
            Official regional academy championships, live fixture schedules, and bracket results.
          </p>
        </div>
      </section>

      {/* Filter Toolbar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-4 rounded-2xl border border-[#171044]/10 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-[#111111]/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tournament name..."
              className="w-full pl-9 pr-3 py-2 border border-[#111111]/20 rounded-xl text-sm focus:outline-none focus:border-[#E65100]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value)}
              className="px-3 py-2 border border-[#111111]/20 rounded-xl text-sm focus:outline-none focus:border-[#E65100] bg-white"
            >
              <option value="">All Sports</option>
              {sports.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-[#111111]/20 rounded-xl text-sm focus:outline-none focus:border-[#E65100] bg-white"
            >
              <option value="">All Statuses</option>
              <option value="Registration Open">Registration Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>

            {(selectedSport || selectedStatus || searchQuery) && (
              <button
                onClick={resetFilters}
                className="text-xs font-semibold text-[#E65100] hover:underline px-2"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Tournaments Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <StateContainer
          loading={loading}
          empty={tournaments.length === 0}
          emptyMessage="No tournaments match your criteria."
          onRetry={loadData}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((t) => (
              <Card
                key={t.id}
                className="p-6 flex flex-col justify-between hover:shadow-xl transition-all duration-300 border-[#171044]/10"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#E65100]/10 flex items-center justify-center shrink-0">
                        <Trophy className="w-6 h-6 text-[#E65100]" />
                      </div>
                      <div>
                        <h2 className="font-bold text-lg text-[#171044] leading-tight">{t.name}</h2>
                        <span className="text-xs text-[#111111]/60 font-semibold">
                          {t.sport?.name} • {t.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>{getStatusBadge(t.status)}</div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#F7F1E8] p-2 rounded-xl flex items-center gap-1.5 text-[#171044] font-medium">
                      <Layers className="w-3.5 h-3.5 opacity-60" />
                      <span>{t.format}</span>
                    </div>
                    <div className="bg-[#F7F1E8] p-2 rounded-xl flex items-center gap-1.5 text-[#171044] font-medium">
                      <Users className="w-3.5 h-3.5 opacity-60" />
                      <span>
                        {t.approvedTeamsCount} {t.maxTeams ? `/ ${t.maxTeams}` : ''} Teams
                      </span>
                    </div>
                    <div className="bg-[#F7F1E8] p-2 rounded-xl flex items-center gap-1.5 text-[#171044] font-medium col-span-2">
                      <Calendar className="w-3.5 h-3.5 opacity-60 shrink-0" />
                      <span>
                        {new Date(t.startDate).toLocaleDateString()} – {new Date(t.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {t.rules && (
                    <p className="text-xs text-[#111111]/70 line-clamp-2 italic">
                      {t.rules}
                    </p>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-[#111111]/10">
                  <Link to={`/tournaments/${t.id}`}>
                    <Button variant="primary" size="sm" className="w-full inline-flex items-center justify-center gap-2">
                      <span>View Fixtures & Standings</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </StateContainer>
      </section>
    </div>
  );
};
