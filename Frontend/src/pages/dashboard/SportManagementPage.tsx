import React from 'react';
import { Card, CrossAccent, AthleticBadge, Button } from '../../design-system';
import { Activity, Plus, Check } from 'lucide-react';
import { sportsData } from '../../data/sportsData';

export const SportManagementPage: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <AthleticBadge variant="purple">ACADEMY SPORTS PROGRAMS</AthleticBadge>
          <h1 className="text-3xl md:text-4xl font-black font-display text-[#171044] mt-2">
            SPORTS & AGE GROUP BRACKETS <CrossAccent color="orange" size="md" />
          </h1>
        </div>

        <Button variant="primary" iconLeft={<Plus size={18} />}>
          Add Sport Program
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sportsData.map((s) => (
          <Card key={s.id} variant="standard" className="space-y-4">
            <div className="flex justify-between items-start">
              <AthleticBadge variant="lime">{s.category}</AthleticBadge>
              <span className="text-xs font-bold text-[#FF5A00]">{s.fee}</span>
            </div>
            <h3 className="text-2xl font-bold font-display text-[#171044]">{s.name}</h3>
            <div className="text-xs font-bold text-[#171044]/80">
              Active Age Brackets: <span className="text-[#4B2A9B]">{s.ageGroups.join(', ')}</span>
            </div>
            <p className="text-xs text-[#171044]/70 leading-relaxed">{s.shortDesc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};
