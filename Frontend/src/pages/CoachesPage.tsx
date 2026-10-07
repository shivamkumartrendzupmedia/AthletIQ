import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { coachesData } from '../data/coachesData';
import { Button, Card, SectionHeader, CrossAccent, AthleticBadge } from '../design-system';
import { ArrowRight, Mail, Award } from 'lucide-react';

export const CoachesPage: React.FC = () => {
  const [sportFilter, setSportFilter] = useState('All');
  const sports = ['All', 'Football', 'Basketball', 'Tennis', 'Swimming', 'Athletics', 'Volleyball'];

  const filteredCoaches =
    sportFilter === 'All' ? coachesData : coachesData.filter((c) => c.sport === sportFilter);

  return (
    <div className="space-y-16 pb-20">
      {/* Header Banner */}
      <section className="bg-[#171044] text-white py-16 md:py-20 rounded-b-3xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <AthleticBadge variant="lime">ACADEMY COACHING STAFF</AthleticBadge>
          <h1 className="text-4xl md:text-6xl font-black font-display">
            WORLD-CLASS COACHES <CrossAccent color="orange" size="lg" />
          </h1>
          <p className="text-base md:text-lg text-white/80 max-w-2xl mx-auto">
            Experienced Olympic, UEFA, and FIBA certified leaders driving athlete progression.
          </p>
        </div>
      </section>

      {/* Filter Tabs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {sports.map((sport) => (
            <button
              key={sport}
              onClick={() => setSportFilter(sport)}
              className={`px-5 py-2.5 rounded-full font-display font-extrabold text-sm transition-all duration-200 ${
                sportFilter === sport
                  ? 'bg-[#FF5A00] text-white shadow-md'
                  : 'bg-white text-[#171044] hover:bg-[#171044]/10 border border-[#171044]/10'
              }`}
            >
              {sport}
            </button>
          ))}
        </div>

        {/* Coaches Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCoaches.map((coach) => (
            <Card key={coach.id} variant="standard" padding="none" className="group overflow-hidden flex flex-col justify-between">
              <div>
                <div className="h-72 relative overflow-hidden">
                  <img
                    src={coach.image}
                    alt={coach.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <AthleticBadge variant="dark">{coach.sport}</AthleticBadge>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 bg-[#171044]/90 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-white">
                    <div className="text-xs text-[#D8F500] font-bold">{coach.certification}</div>
                    <div className="text-xs text-white/80 font-medium">{coach.experience} Coaching Experience</div>
                  </div>
                </div>

                <div className="p-6 space-y-3">
                  <h3 className="text-2xl font-bold font-display text-[#171044]">{coach.name}</h3>
                  <p className="text-xs font-semibold text-[#FF5A00]">{coach.role}</p>
                  <p className="text-xs text-[#171044]/70 line-clamp-3 leading-relaxed">{coach.bio}</p>

                  <div className="pt-3 flex flex-wrap gap-1.5">
                    {coach.specialties.map((spec, i) => (
                      <span key={i} className="text-[10px] font-extrabold bg-[#171044]/5 text-[#171044] px-2.5 py-1 rounded-full">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0 border-t border-[#171044]/10 flex items-center justify-between mt-4">
                <a href={`mailto:${coach.contactEmail}`} className="text-xs font-semibold text-[#171044]/70 flex items-center gap-1 hover:text-[#FF5A00]">
                  <Mail size={14} /> Contact
                </a>
                <Link to={`/coaches/${coach.id}`}>
                  <Button variant="secondary" size="sm" iconRight={<ArrowRight size={14} />}>
                    View Profile
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
