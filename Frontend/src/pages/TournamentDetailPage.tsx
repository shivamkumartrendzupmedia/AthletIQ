import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button, Card, CrossAccent, AthleticBadge } from '../design-system';
import {
  ArrowLeft,
  Trophy,
  Calendar,
  MapPin,
  Layers,
  Users,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { StateContainer } from '../components/StateContainer';
import {
  academyApi,
  type PublicTournamentItem,
  type PublicMatchItem,
} from '../services/academyApi';
import { ApiClientError } from '../lib/apiClient';

export const TournamentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [tournament, setTournament] = useState<PublicTournamentItem | null>(null);
  const [matches, setMatches] = useState<PublicMatchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'fixtures' | 'rules'>('fixtures');

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorBanner(null);
    try {
      const [tRes, mRes] = await Promise.all([
        academyApi.getPublicTournament(id),
        academyApi.getPublicTournamentMatches(id),
      ]);
      setTournament(tRes);
      setMatches(mRes);
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to load tournament details.';
      setErrorBanner(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Group matches by round
  const groupedMatches = matches.reduce<Record<string, PublicMatchItem[]>>((acc, match) => {
    const roundKey = match.round || 'General';
    if (!acc[roundKey]) {
      acc[roundKey] = [];
    }
    acc[roundKey].push(match);
    return acc;
  }, {});

  if (!tournament && !loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold text-[#171044]">Tournament Not Found</h2>
        <p className="text-sm text-[#111111]/60">This tournament is either in draft or does not exist.</p>
        <Link to="/tournaments">
          <Button variant="primary">Return to Tournaments</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/tournaments"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#171044] hover:text-[#E65100] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Tournaments Directory</span>
        </Link>
      </div>

      {/* Header Card */}
      {tournament && (
        <div className="bg-[#171044] text-white p-8 rounded-3xl shadow-lg relative overflow-hidden space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <AthleticBadge variant="lime">{tournament.category}</AthleticBadge>
                <AthleticBadge variant="orange">{tournament.status}</AthleticBadge>
              </div>
              <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight flex items-center gap-3">
                <span>{tournament.name}</span>
                <CrossAccent color="orange" size="lg" />
              </h1>
              <p className="text-sm md:text-base text-white/80">
                {tournament.sport?.name} • {tournament.ageGroup} • {tournament.format} Format
              </p>
            </div>

            <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl border border-white/10 shrink-0">
              <div className="text-center">
                <span className="text-3xl font-extrabold text-[#FF8A00] block">
                  {tournament.approvedTeamsCount}
                </span>
                <span className="text-xs uppercase font-bold text-white/60 tracking-wider">
                  {tournament.maxTeams ? `Teams (${tournament.maxTeams} Max)` : 'Teams'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs text-white/70">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#FF8A00]" />
              <span>
                {new Date(tournament.startDate).toLocaleDateString()} –{' '}
                {new Date(tournament.endDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#FF8A00]" />
              <span>Format: {tournament.format}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#FF8A00]" />
              <span>Age Bracket: {tournament.ageGroup}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-[#111111]/10 pb-2">
        <button
          onClick={() => setActiveTab('fixtures')}
          className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
            activeTab === 'fixtures'
              ? 'bg-[#171044] text-white shadow-sm'
              : 'text-[#111111]/60 hover:bg-[#111111]/5'
          }`}
        >
          Fixtures & Results ({matches.length})
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
            activeTab === 'rules'
              ? 'bg-[#171044] text-white shadow-sm'
              : 'text-[#111111]/60 hover:bg-[#111111]/5'
          }`}
        >
          Rules & Information
        </button>
      </div>

      {/* Tab: Fixtures & Results */}
      {activeTab === 'fixtures' && (
        <StateContainer
          loading={loading}
          empty={matches.length === 0}
          emptyMessage="No fixtures scheduled for this tournament yet."
          onRetry={loadData}
        >
          <div className="space-y-8">
            {Object.entries(groupedMatches).map(([roundName, roundMatches]) => (
              <div key={roundName} className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#E65100]" />
                  <h2 className="text-xl font-bold text-[#171044] uppercase tracking-wide">
                    {roundName}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {roundMatches.map((m) => (
                    <Card
                      key={m.id}
                      className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow border-[#171044]/10 space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#E65100] uppercase">
                            {m.group ? `Group: ${m.group}` : roundName}
                          </span>
                          <AthleticBadge
                            variant={
                              m.status === 'Completed'
                                ? 'lime'
                                : m.status === 'Scheduled'
                                ? 'orange'
                                : 'dark'
                            }
                            size="sm"
                          >
                            {m.status}
                          </AthleticBadge>
                        </div>

                        {/* Teams Scoreboard */}
                        <div className="flex items-center justify-between p-3.5 bg-[#F7F1E8] rounded-2xl">
                          <div className="font-bold text-sm text-[#171044] w-5/12 truncate">
                            {m.homeTeam?.name || 'Home'}
                          </div>
                          <div className="text-center font-extrabold text-lg text-[#171044] w-2/12 shrink-0">
                            {m.status === 'Completed' && m.result ? (
                              <span>
                                {m.result.homeScore} : {m.result.awayScore}
                              </span>
                            ) : (
                              <span className="text-xs text-[#111111]/40 font-semibold">VS</span>
                            )}
                          </div>
                          <div className="font-bold text-sm text-[#171044] w-5/12 truncate text-right">
                            {m.awayTeam?.name || 'Away'}
                          </div>
                        </div>

                        {/* Match Timing & Venue */}
                        <div className="space-y-1 text-xs text-[#111111]/70">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 opacity-60" />
                            <span>
                              {new Date(m.scheduledAt).toLocaleString([], {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 opacity-60" />
                            <span>{m.venue?.name || 'Assigned Pitch'}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </StateContainer>
      )}

      {/* Tab: Rules & Information */}
      {activeTab === 'rules' && tournament && (
        <Card className="p-8 space-y-4">
          <h2 className="text-xl font-bold text-[#171044] flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#E65100]" />
            Official Tournament Rules & Eligibility
          </h2>
          {tournament.rules ? (
            <div className="p-4 bg-[#F7F1E8] rounded-2xl text-sm text-[#111111]/80 whitespace-pre-wrap leading-relaxed">
              {tournament.rules}
            </div>
          ) : (
            <p className="text-sm text-[#111111]/60 italic">
              Standard youth academy competition rules and FIFA fair play regulations apply.
            </p>
          )}
        </Card>
      )}
    </div>
  );
};
