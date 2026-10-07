import React from 'react';
import { Card, CrossAccent, AthleticBadge, Button } from '../../design-system';
import { UserCheck, Plus, Mail } from 'lucide-react';
import { coachesData } from '../../data/coachesData';

export const CoachManagementPage: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <AthleticBadge variant="lime">COACHING STAFF DIRECTORY</AthleticBadge>
          <h1 className="text-3xl md:text-4xl font-black font-display text-[#171044] mt-2">
            COACH MANAGEMENT ({coachesData.length}) <CrossAccent color="orange" size="md" />
          </h1>
        </div>

        <Button variant="primary" iconLeft={<Plus size={18} />}>
          Assign New Coach
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {coachesData.map((c) => (
          <Card key={c.id} variant="standard" className="space-y-4">
            <div className="flex items-center gap-4">
              <img src={c.image} alt={c.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-[#171044]" />
              <div>
                <AthleticBadge variant="purple" size="sm">{c.sport}</AthleticBadge>
                <div className="font-bold font-display text-[#171044] text-lg mt-1">{c.name}</div>
                <div className="text-xs text-[#FF5A00] font-semibold">{c.role}</div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#171044]/10 space-y-1 text-xs text-[#171044]/70">
              <div><span className="font-bold text-[#171044]">Certification:</span> {c.certification}</div>
              <div><span className="font-bold text-[#171044]">Experience:</span> {c.experience}</div>
              <div><span className="font-bold text-[#171044]">Assigned Squads:</span> {c.teamsCoached.join(', ')}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
