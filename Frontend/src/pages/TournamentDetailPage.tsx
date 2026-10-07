import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  tournamentService,
  type FullTournamentData,
  type TournamentMatch,
} from '../services/tournamentService';
import { Button, Card, CrossAccent, AthleticBadge } from '../design-system';
import {
  ArrowLeft,
  Trophy,
  Calendar,
  MapPin,
  Shield,
  CheckCircle2,
  Users,
  Activity,
  Clock,
  ChevronRight,
  Sparkles,
  Info,
  Zap,
} from 'lucide-react';

export const TournamentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const tournamentId = id || 'active-nb-cup-2026';

  const [tournament, setTournament] = useState<FullTournamentData | null>(null);
  const [activeTab, setActiveTab] = useState<
    'bracket' | 'statistics' | 'teams' | 'groups' | 'fixtures' | 'schedule' | 'venue' | 'results'
  >('bracket');

  // Match detail modal state
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);

  useEffect(() => {
    const load = async () => {
      const data = await tournamentService.getTournamentById(tournamentId);
      setTournament(data);
    };
    load();
    const unsub = tournamentService.subscribe(load);
    return () => unsub();
  }, [tournamentId]);

  if (!tournament) return null;

  const qfMatches = tournament.fixtures.filter((m) => m.stage === 'Quarter Final');
  const sfMatches = tournament.fixtures.filter((m) => m.stage === 'Semi Final');
  const finalMatch = tournament.fixtures.find((m) => m.stage === 'Final');

  return (
    <div className="space-y-12 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      {/* Back Link */}
      <div>
        <Link to="/tournaments" className="inline-flex items-center gap-2 text-sm font-bold text-[#171044] hover:text-[#FF5A00]">
          <ArrowLeft size={16} /> Back to Tournaments Directory
        </Link>
      </div>

      {/* 1. TOURNAMENT HERO SECTION */}
      <section>
        <div className="relative rounded-[2.5rem] overflow-hidden min-h-[320px] border border-[#171044]/10 shadow-2xl">
          <img src={tournament.bannerImage} alt={tournament.name} className="w-full h-full object-cover absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#171044] via-[#171044]/75 to-transparent p-8 md:p-12 flex flex-col justify-end">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <AthleticBadge variant="lime">{tournament.status}</AthleticBadge>
              <AthleticBadge variant="orange">{tournament.sport}</AthleticBadge>
              <AthleticBadge variant="dark">{tournament.ageGroup}</AthleticBadge>
              <span className="text-xs font-bold text-white/80 bg-white/10 px-3 py-1 rounded-full backdrop-blur-md">
                {tournament.category}
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black font-display text-white uppercase tracking-tight">
              {tournament.name} <CrossAccent color="lime" size="lg" />
            </h1>
            <p className="text-white/90 max-w-2xl text-xs md:text-sm mt-2">{tournament.description}</p>
            <div className="flex flex-wrap items-center gap-6 mt-4 text-xs font-bold text-[#D8F500]">
              <span className="flex items-center gap-1.5"><MapPin size={16} /> {tournament.venue}</span>
              <span className="flex items-center gap-1.5"><Calendar size={16} /> {tournament.datesFormatted}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 9 INTERACTIVE TABS */}
      <div className="flex items-center justify-start overflow-x-auto pb-2 gap-2 border-b border-[#171044]/10 scrollbar-none">
        {[
          { id: 'bracket', label: 'Knockout Bracket', icon: <Trophy size={16} /> },
          { id: 'statistics', label: 'Statistics', icon: <Activity size={16} /> },
          { id: 'teams', label: 'Teams', icon: <Users size={16} /> },
          { id: 'groups', label: 'Group Standings', icon: <Shield size={16} /> },
          { id: 'fixtures', label: 'Fixtures', icon: <Calendar size={16} /> },
          { id: 'schedule', label: 'Schedule', icon: <Clock size={16} /> },
          { id: 'venue', label: 'Venue Map', icon: <MapPin size={16} /> },
          { id: 'results', label: 'Match Results', icon: <CheckCircle2 size={16} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-3 rounded-2xl font-display font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#171044] text-[#D8F500] shadow-lg scale-105'
                : 'bg-white text-[#171044] hover:bg-[#171044]/10'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* 7. BRACKET (VISUALLY PREMIUM & RESPONSIVE KNOCKOUT TREE) */}
        {activeTab === 'bracket' && (
          <motion.div key="bracket" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <Card variant="standard" className="p-8 md:p-12 space-y-8 bg-gradient-to-br from-[#171044] to-[#251963] text-white border border-white/10 shadow-2xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-3xl font-black font-display text-white uppercase tracking-tight">
                    Championship Knockout Tree <CrossAccent color="lime" size="md" />
                  </h2>
                  <p className="text-xs text-white/70">Interactive fixture tree. Click any match node to inspect match center statistics.</p>
                </div>
                <span className="text-xs font-black text-[#D8F500] bg-white/10 px-4 py-2 rounded-full border border-white/10">
                  Official Bracket Path
                </span>
              </div>

              {/* Bracket Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center pt-4">
                {/* Quarter Finals Column */}
                <div className="space-y-4">
                  <div className="text-xs font-black uppercase text-[#D8F500] tracking-widest flex items-center gap-2">
                    <Shield size={14} /> Quarter Finals
                  </div>
                  {qfMatches.map((m) => (
                    <motion.div
                      key={m.id}
                      onClick={() => setSelectedMatch(m)}
                      whileHover={{ scale: 1.02 }}
                      className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 cursor-pointer hover:border-[#D8F500] transition-all space-y-2"
                    >
                      <div className="flex justify-between text-xs font-bold text-white">
                        <span className={m.winner === m.team1.name ? 'text-[#D8F500] font-black' : ''}>
                          {m.team1.name}
                        </span>
                        <span className="text-[#FF5A00] font-black">{m.team1.score ?? '-'}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-white">
                        <span className={m.winner === m.team2.name ? 'text-[#D8F500] font-black' : ''}>
                          {m.team2.name}
                        </span>
                        <span className="text-[#FF5A00] font-black">{m.team2.score ?? '-'}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Semi Finals Column */}
                <div className="space-y-4">
                  <div className="text-xs font-black uppercase text-[#FF5A00] tracking-widest flex items-center gap-2">
                    <Zap size={14} /> Semi Finals
                  </div>
                  {sfMatches.map((m) => (
                    <motion.div
                      key={m.id}
                      onClick={() => setSelectedMatch(m)}
                      whileHover={{ scale: 1.02 }}
                      className="p-5 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 cursor-pointer hover:border-[#FF5A00] transition-all space-y-3 shadow-xl"
                    >
                      <div className="flex justify-between text-sm font-bold text-white">
                        <span className={m.winner === m.team1.name ? 'text-[#D8F500] font-black' : ''}>
                          {m.team1.name}
                        </span>
                        <span className="text-[#D8F500] font-black">{m.team1.score ?? '-'}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-white">
                        <span className={m.winner === m.team2.name ? 'text-[#D8F500] font-black' : ''}>
                          {m.team2.name}
                        </span>
                        <span className="text-[#D8F500] font-black">{m.team2.score ?? '-'}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Championship Final Card */}
                <div className="space-y-4">
                  <div className="text-xs font-black uppercase text-[#D8F500] tracking-widest flex items-center gap-2">
                    <Trophy size={14} /> Grand Final
                  </div>
                  {finalMatch && (
                    <motion.div
                      onClick={() => setSelectedMatch(finalMatch)}
                      whileHover={{ scale: 1.03 }}
                      className="p-7 bg-gradient-to-br from-[#FF5A00] to-[#E04F00] text-white rounded-3xl shadow-2xl space-y-4 text-center cursor-pointer border-2 border-white/20"
                    >
                      <div className="w-14 h-14 rounded-full bg-white/20 mx-auto flex items-center justify-center shadow-lg">
                        <Trophy size={28} className="text-[#D8F500]" />
                      </div>
                      <div className="text-xl font-black font-display">{finalMatch.team1.name}</div>
                      <div className="text-xs font-black uppercase tracking-widest text-[#D8F500]">VS</div>
                      <div className="text-xl font-black font-display">{finalMatch.team2.name}</div>
                      <div className="pt-2 text-xs font-extrabold bg-white/20 py-2 rounded-full border border-white/30">
                        FINAL MATCH • OCT 20, 04:00 PM
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* 2. STATISTICS TAB */}
        {activeTab === 'statistics' && (
          <motion.div key="statistics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Top Scorers */}
              <div className="bg-white p-7 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-4">
                <h3 className="text-xl font-black font-display text-[#171044] uppercase tracking-tight flex items-center gap-2">
                  <Trophy size={18} className="text-[#FF5A00]" /> Top Scorers
                </h3>
                <div className="space-y-2">
                  {tournament.stats.topScorers.map((s, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3.5 bg-[#F7F1E8] rounded-2xl text-xs font-bold text-[#171044]">
                      <div>
                        <div className="font-black">{s.name}</div>
                        <div className="text-[10px] text-[#171044]/60">{s.team}</div>
                      </div>
                      <span className="text-sm font-black text-[#FF5A00]">{s.goals} Goals</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Assists */}
              <div className="bg-white p-7 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-4">
                <h3 className="text-xl font-black font-display text-[#171044] uppercase tracking-tight flex items-center gap-2">
                  <Sparkles size={18} className="text-[#4B2A9B]" /> Top Assists
                </h3>
                <div className="space-y-2">
                  {tournament.stats.topAssists.map((a, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3.5 bg-[#F7F1E8] rounded-2xl text-xs font-bold text-[#171044]">
                      <div>
                        <div className="font-black">{a.name}</div>
                        <div className="text-[10px] text-[#171044]/60">{a.team}</div>
                      </div>
                      <span className="text-sm font-black text-[#4B2A9B]">{a.assists} Assists</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clean Sheets */}
              <div className="bg-white p-7 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-4">
                <h3 className="text-xl font-black font-display text-[#171044] uppercase tracking-tight flex items-center gap-2">
                  <Shield size={18} className="text-emerald-600" /> Clean Sheets
                </h3>
                <div className="space-y-2">
                  {tournament.stats.cleanSheets.map((c, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3.5 bg-[#F7F1E8] rounded-2xl text-xs font-bold text-[#171044]">
                      <div>
                        <div className="font-black">{c.name}</div>
                        <div className="text-[10px] text-[#171044]/60">{c.team}</div>
                      </div>
                      <span className="text-sm font-black text-emerald-600">{c.count} Matches</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 3. TEAMS TAB */}
        {activeTab === 'teams' && (
          <motion.div key="teams" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournament.teams.map((t) => (
                <div key={t.id} className="bg-white p-6 rounded-3xl border border-[#171044]/10 shadow-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{t.logo}</span>
                    <div>
                      <h4 className="font-black font-display text-base text-[#171044]">{t.name}</h4>
                      <div className="text-xs text-[#171044]/60">Coach {t.coachName}</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[#F7F1E8] rounded-xl text-xs font-bold">
                    <span>Squad Size</span>
                    <span className="font-black text-[#FF5A00]">{t.roster.length} Players</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 4. GROUPS TAB */}
        {activeTab === 'groups' && (
          <motion.div key="groups" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {tournament.groups.map((group, idx) => (
                <Card key={idx} variant="standard" className="space-y-4 p-8">
                  <h3 className="text-2xl font-black font-display text-[#171044]">
                    {group.name} Standings <CrossAccent color="orange" size="sm" />
                  </h3>
                  <div className="space-y-2">
                    {group.standings.map((st, i) => (
                      <div key={i} className="flex items-center justify-between p-3.5 bg-[#F7F1E8] rounded-2xl text-xs font-bold text-[#171044]">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-[#171044] text-[#D8F500] text-xs flex items-center justify-center font-black">
                            {i + 1}
                          </span>
                          <span className="font-extrabold">{st.teamName}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px]">
                          <span>P:{st.played}</span>
                          <span>GD:{st.gd > 0 ? `+${st.gd}` : st.gd}</span>
                          <span className="text-[#FF5A00] font-black text-sm">{st.points} Pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* 5. FIXTURES TAB */}
        {activeTab === 'fixtures' && (
          <motion.div key="fixtures" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {tournament.fixtures.map((m) => (
              <div
                key={m.id}
                onClick={() => setSelectedMatch(m)}
                className="bg-white p-5 rounded-3xl border border-[#171044]/10 shadow-md flex justify-between items-center cursor-pointer hover:border-[#FF5A00] transition-all"
              >
                <div>
                  <div className="text-[10px] font-extrabold uppercase text-[#4B2A9B]">{m.round} • {m.pitch}</div>
                  <div className="font-black text-sm text-[#171044] mt-1">
                    {m.team1.name} <span className="text-[#FF5A00] px-2">{m.team1.score ?? 'VS'}</span> {m.team2.name}
                  </div>
                </div>

                <div className="text-right flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black ${
                      m.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {m.status}
                  </span>
                  <ChevronRight size={16} className="text-[#171044]/40" />
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* 6. SCHEDULE TAB */}
        {activeTab === 'schedule' && (
          <motion.div key="schedule" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-4">
              <h3 className="text-2xl font-black font-display text-[#171044]">Matchday Time Slot Schedule</h3>
              <p className="text-xs text-[#171044]/70">Matches allocated across Moncton Sports Complex pitches.</p>
            </div>
          </motion.div>
        )}

        {/* 8. VENUE TAB */}
        {activeTab === 'venue' && (
          <motion.div key="venue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {tournament.venues.map((v) => (
              <div key={v.id} className="bg-white p-8 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-6">
                <h3 className="text-2xl font-black font-display text-[#171044]">{v.name}</h3>
                <p className="text-xs font-bold text-[#FF5A00]">{v.address} • Capacity: {v.capacity}</p>
                <div className="flex flex-wrap gap-2">
                  {v.facilities.map((fac, i) => (
                    <span key={i} className="text-xs font-bold bg-[#F7F1E8] text-[#171044] px-3 py-1.5 rounded-full">
                      ✓ {fac}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* 9. RESULTS & MATCH CENTER MODAL */}
        {activeTab === 'results' && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-4">
              <h3 className="text-2xl font-black font-display text-[#171044]">Completed Match Results</h3>
              <div className="space-y-3">
                {tournament.fixtures.filter((m) => m.status === 'Completed').map((m) => (
                  <div key={m.id} onClick={() => setSelectedMatch(m)} className="p-4 bg-[#F7F1E8] rounded-2xl flex justify-between items-center cursor-pointer">
                    <span className="font-bold text-sm text-[#171044]">{m.team1.name} {m.team1.score} - {m.team2.score} {m.team2.name}</span>
                    <span className="text-xs font-bold text-[#FF5A00]">View Match Center</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MATCH CENTER MODAL */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 bg-[#171044]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase text-[#4B2A9B]">{selectedMatch.round}</span>
              <button onClick={() => setSelectedMatch(null)} className="text-xs font-bold text-[#171044]/60 hover:text-[#FF5A00]">
                ✕ Close
              </button>
            </div>

            {/* Scoreboard Header */}
            <div className="bg-[#171044] text-white p-6 rounded-3xl text-center space-y-3">
              <div className="flex justify-around items-center text-xl font-black font-display">
                <span>{selectedMatch.team1.name}</span>
                <span className="text-3xl text-[#D8F500] px-4">
                  {selectedMatch.team1.score ?? '-'} : {selectedMatch.team2.score ?? '-'}
                </span>
                <span>{selectedMatch.team2.name}</span>
              </div>
              <div className="text-xs text-white/70">{selectedMatch.pitch} • {selectedMatch.date}</div>
            </div>

            {/* Match Events */}
            {selectedMatch.events && selectedMatch.events.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-black uppercase text-[#171044]/60">Match Events Timeline</div>
                {selectedMatch.events.map((ev, i) => (
                  <div key={i} className="flex items-center justify-between text-xs font-bold p-2.5 bg-[#F7F1E8] rounded-xl text-[#171044]">
                    <span>{ev.time} - {ev.player} ({ev.team})</span>
                    <span className="text-[#FF5A00] font-black">{ev.type}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Stats Comparison */}
            {selectedMatch.stats && (
              <div className="space-y-3 pt-2">
                <div className="text-xs font-black uppercase text-[#171044]/60">Match Statistics</div>
                <div className="space-y-2 text-xs font-bold text-[#171044]">
                  <div className="flex justify-between">
                    <span>{selectedMatch.stats.possession1}%</span>
                    <span>Possession</span>
                    <span>{selectedMatch.stats.possession2}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{selectedMatch.stats.shots1}</span>
                    <span>Shots on Target</span>
                    <span>{selectedMatch.stats.shots2}</span>
                  </div>
                </div>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={() => setSelectedMatch(null)} className="w-full">
              Close Match Center
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
