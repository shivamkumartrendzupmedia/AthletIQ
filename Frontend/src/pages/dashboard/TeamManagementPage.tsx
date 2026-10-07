import React from 'react';
import { Card, CrossAccent, AthleticBadge, Button } from '../../design-system';
import { Shield, Plus, Users } from 'lucide-react';
import { teamsData } from '../../data/teamsData';

export const TeamManagementPage: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <AthleticBadge variant="orange">ACADEMY TEAMS & ROSTERS</AthleticBadge>
          <h1 className="text-3xl md:text-4xl font-black font-display text-[#171044] mt-2">
            TEAM MANAGEMENT ({teamsData.length}) <CrossAccent color="orange" size="md" />
          </h1>
        </div>

        <Button variant="primary" iconLeft={<Plus size={18} />}>
          Create New Team
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {teamsData.map((t) => (
          <Card key={t.id} variant="dark" className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex gap-2 mb-2">
                  <AthleticBadge variant="lime" size="sm">{t.sport}</AthleticBadge>
                  <AthleticBadge variant="orange" size="sm">{t.ageGroup}</AthleticBadge>
                </div>
                <h3 className="text-2xl font-black font-display text-white">{t.name}</h3>
                <p className="text-xs text-[#D8F500] font-semibold mt-0.5">Head Coach: {t.coachName}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-white">{t.playersCount}</div>
                <div className="text-[10px] uppercase text-white/60 font-bold">Roster Size</div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-between items-center text-xs font-bold text-white/80">
              <span>Matches: {t.matchesPlayed}</span>
              <span>Win Rate: <span className="text-[#D8F500] font-black">{t.winRate}</span></span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
