import React from 'react';
import { Link } from 'react-router-dom';
import { teamsData } from '../data/teamsData';
import { Button, Card, SectionHeader, CrossAccent, AthleticBadge } from '../design-system';
import { ArrowRight, Trophy, Users, Shield } from 'lucide-react';

export const TeamsPage: React.FC = () => {
  return (
    <div className="space-y-16 pb-20">
      {/* Header */}
      <section className="bg-[#171044] text-white py-16 md:py-20 rounded-b-3xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <AthleticBadge variant="lime">ACADEMY SQUADS</AthleticBadge>
          <h1 className="text-4xl md:text-6xl font-black font-display">
            ACADEMY TEAMS <CrossAccent color="orange" size="lg" />
          </h1>
          <p className="text-base md:text-lg text-white/80 max-w-2xl mx-auto">
            Competitive squads competing in regional leagues, state cups, and national showcases.
          </p>
        </div>
      </section>

      {/* Teams Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {teamsData.map((team) => (
            <Card key={team.id} variant="team" className="group overflow-hidden flex flex-col justify-between">
              <div className="space-y-6">
                <div className="h-64 rounded-2xl overflow-hidden relative">
                  <img
                    src={team.image}
                    alt={team.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <AthleticBadge variant="lime">{team.sport}</AthleticBadge>
                    <AthleticBadge variant="orange">{team.ageGroup}</AthleticBadge>
                  </div>
                  <div className="absolute bottom-4 right-4 bg-[#171044]/90 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold text-white">
                    Win Rate: <span className="text-[#D8F500] font-black">{team.winRate}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-3xl font-black font-display text-white">{team.name}</h3>
                  <p className="text-xs text-white/80 font-medium">Head Coach: <span className="text-[#D8F500] font-bold">{team.coachName}</span></p>

                  <div className="grid grid-cols-4 gap-2 pt-2 text-center">
                    <div className="bg-white/10 p-2.5 rounded-xl">
                      <div className="text-lg font-black text-white">{team.matchesPlayed}</div>
                      <div className="text-[10px] uppercase font-bold text-white/60">Played</div>
                    </div>
                    <div className="bg-white/10 p-2.5 rounded-xl">
                      <div className="text-lg font-black text-[#D8F500]">{team.wins}</div>
                      <div className="text-[10px] uppercase font-bold text-white/60">Wins</div>
                    </div>
                    <div className="bg-white/10 p-2.5 rounded-xl">
                      <div className="text-lg font-black text-white/80">{team.draws}</div>
                      <div className="text-[10px] uppercase font-bold text-white/60">Draws</div>
                    </div>
                    <div className="bg-white/10 p-2.5 rounded-xl">
                      <div className="text-lg font-black text-[#FF5A00]">{team.losses}</div>
                      <div className="text-[10px] uppercase font-bold text-white/60">Losses</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 flex items-center justify-between mt-6">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-white/60 font-bold mr-1">Form:</span>
                  {team.recentForm.map((f, i) => (
                    <span
                      key={i}
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                        f === 'W' ? 'bg-[#D8F500] text-[#171044]' : f === 'D' ? 'bg-amber-400 text-black' : 'bg-rose-500 text-white'
                      }`}
                    >
                      {f}
                    </span>
                  ))}
                </div>

                <Link to={`/teams/${team.id}`}>
                  <Button variant="lime" size="sm" iconRight={<ArrowRight size={14} />}>
                    View Roster
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};
