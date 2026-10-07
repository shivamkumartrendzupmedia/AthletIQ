import React from 'react';
import { Card, CrossAccent, AthleticBadge, Button } from '../../design-system';
import { Award, Users, ArrowRight } from 'lucide-react';
import { mockAthletes } from '../../data/academyData';

export const RosterManagementPage: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <AthleticBadge variant="orange">SQUAD ROSTER ASSIGNMENT</AthleticBadge>
          <h1 className="text-3xl md:text-4xl font-black font-display text-[#171044] mt-2">
            ROSTER & ATHLETE ASSIGNMENTS <CrossAccent color="orange" size="md" />
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 space-y-4">
          <Card variant="standard" className="space-y-4">
            <h3 className="text-xl font-bold font-display text-[#171044]">
              Unassigned / Trial Athletes <CrossAccent color="orange" size="sm" />
            </h3>
            <p className="text-xs text-[#171044]/70">Assign athletes to their specific sport squads and age brackets.</p>
            <div className="space-y-2">
              {mockAthletes.map((a) => (
                <div key={a.id} className="p-3 bg-[#F7F1E8] rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={a.avatar} alt={a.name} className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <div className="font-bold text-xs text-[#171044]">{a.name}</div>
                      <div className="text-[10px] text-[#171044]/60">{a.sport} • {a.position}</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Assign to Team</Button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-6 space-y-4">
          <Card variant="dark" className="space-y-4">
            <h3 className="text-xl font-bold font-display text-white">
              Active Team Rosters <CrossAccent color="lime" size="sm" />
            </h3>
            <div className="p-4 bg-white/10 rounded-2xl space-y-2">
              <div className="flex justify-between items-center text-sm font-bold text-white">
                <span>U16 Strikers (Football)</span>
                <span className="text-[#D8F500]">18 / 22 Players</span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div className="bg-[#D8F500] h-full" style={{ width: '80%' }} />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
