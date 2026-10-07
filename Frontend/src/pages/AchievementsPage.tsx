import React from 'react';
import { achievementsData } from '../data/achievementsData';
import { Card, SectionHeader, CrossAccent, AthleticBadge } from '../design-system';
import { Trophy, Award, Shield, Star } from 'lucide-react';

export const AchievementsPage: React.FC = () => {
  return (
    <div className="space-y-16 pb-20">
      {/* Header */}
      <section className="bg-[#171044] text-white py-16 md:py-20 rounded-b-3xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <AthleticBadge variant="lime">TROPHY CABINET & MILESTONES</AthleticBadge>
          <h1 className="text-4xl md:text-6xl font-black font-display">
            HALL OF FAME <CrossAccent color="orange" size="lg" />
          </h1>
          <p className="text-base md:text-lg text-white/80 max-w-2xl mx-auto">
            Celebrating regional titles, national tournament victories, and collegiate placements.
          </p>
        </div>
      </section>

      {/* Trophy Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {achievementsData.map((ach) => (
            <Card key={ach.id} variant="standard" className="space-y-4 flex items-start gap-6 p-8">
              <div className="w-16 h-16 rounded-2xl bg-[#FF5A00]/10 text-[#FF5A00] flex items-center justify-center font-bold text-2xl shrink-0">
                <Trophy size={32} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <AthleticBadge variant="purple">{ach.year}</AthleticBadge>
                  <span className="text-xs font-bold text-[#FF5A00]">{ach.sport}</span>
                </div>
                <h3 className="text-2xl font-black font-display text-[#171044]">{ach.title}</h3>
                <p className="text-sm text-[#171044]/70 leading-relaxed font-medium">{ach.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};
