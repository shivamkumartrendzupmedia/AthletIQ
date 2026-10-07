import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { teamsData } from '../data/teamsData';
import { Button, Card, CrossAccent, AthleticBadge, RadialScoreMeter } from '../design-system';
import { ArrowLeft, Users, Trophy, Shield, Activity } from 'lucide-react';

export const TeamDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const team = teamsData.find((t) => t.id === id) || teamsData[0];

  return (
    <div className="space-y-16 pb-20">
      {/* Back Link */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link to="/teams" className="inline-flex items-center gap-2 text-sm font-bold text-[#171044] hover:text-[#FF5A00]">
          <ArrowLeft size={16} /> Back to Squads
        </Link>
      </div>

      {/* Team Banner Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden h-80 border border-[#171044]/10 shadow-2xl">
          <img src={team.image} alt={team.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#171044] via-[#171044]/60 to-transparent p-8 md:p-12 flex flex-col justify-end">
            <div className="flex items-center gap-3 mb-2">
              <AthleticBadge variant="lime">{team.sport}</AthleticBadge>
              <AthleticBadge variant="orange">{team.ageGroup}</AthleticBadge>
              <AthleticBadge variant="dark">{team.playersCount} Players Roster</AthleticBadge>
            </div>
            <h1 className="text-4xl md:text-6xl font-black font-display text-white">
              {team.name} <CrossAccent color="lime" size="lg" />
            </h1>
            <p className="text-white/80 font-medium mt-1">Head Coach: {team.coachName}</p>
          </div>
        </div>
      </section>

      {/* Roster & Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Roster Snippet */}
          <div className="lg:col-span-8 space-y-6">
            <Card variant="standard" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black font-display text-[#171044]">
                  Active Squad Roster <CrossAccent color="orange" size="sm" />
                </h2>
                <span className="text-xs text-[#171044]/60 font-bold">Season 2026</span>
              </div>

              <div className="space-y-3">
                {team.rosterSnippet.map((player, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 bg-[#F7F1E8] rounded-2xl border border-[#171044]/5 hover:border-[#FF5A00] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-8 h-8 rounded-full bg-[#171044] text-[#D8F500] font-black text-sm flex items-center justify-center font-display">
                        #{player.number}
                      </span>
                      <div>
                        <div className="font-bold text-[#171044] text-base">{player.name}</div>
                        <div className="text-xs text-[#171044]/70 font-medium">{player.position}</div>
                      </div>
                    </div>

                    <RadialScoreMeter score={player.ovr} label="OVR" size="sm" color="purple" />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Stats Breakdown Card */}
          <div className="lg:col-span-4 space-y-6">
            <Card variant="dark" className="space-y-6">
              <h3 className="text-2xl font-bold font-display text-white">Season Stats Breakdown</h3>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold text-white/80 mb-1">
                    <span>Win Percentage</span>
                    <span className="text-[#D8F500]">{team.winRate}</span>
                  </div>
                  <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-[#D8F500] rounded-full" style={{ width: team.winRate }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10 text-center">
                  <div className="bg-white/10 p-3 rounded-2xl">
                    <div className="text-2xl font-black text-white">{team.wins}</div>
                    <div className="text-xs text-white/70 font-semibold">Wins</div>
                  </div>
                  <div className="bg-white/10 p-3 rounded-2xl">
                    <div className="text-2xl font-black text-[#FF5A00]">{team.losses}</div>
                    <div className="text-xs text-white/70 font-semibold">Losses</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};
