import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { coachesData } from '../data/coachesData';
import { Button, Card, CrossAccent, AthleticBadge } from '../design-system';
import { ArrowLeft, Mail, Award, CheckCircle2, Shield, Users } from 'lucide-react';

export const CoachDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const coach = coachesData.find((c) => c.id === id) || coachesData[0];

  return (
    <div className="space-y-16 pb-20">
      {/* Back Link */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link to="/coaches" className="inline-flex items-center gap-2 text-sm font-bold text-[#171044] hover:text-[#FF5A00]">
          <ArrowLeft size={16} /> Back to Coaches
        </Link>
      </div>

      {/* Profile Header Card */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card variant="dark" className="p-8 md:p-12 relative overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-4 shrink-0">
              <img
                src={coach.image}
                alt={coach.name}
                className="w-full h-80 rounded-2xl object-cover border-2 border-white/20 shadow-2xl"
              />
            </div>
            <div className="md:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <AthleticBadge variant="lime">{coach.sport}</AthleticBadge>
                <AthleticBadge variant="orange">{coach.experience} Experience</AthleticBadge>
              </div>
              <h1 className="text-4xl md:text-5xl font-black font-display text-white">
                {coach.name} <CrossAccent color="lime" size="lg" />
              </h1>
              <p className="text-lg font-bold text-[#D8F500]">{coach.role}</p>
              <p className="text-sm text-white/80 leading-relaxed font-medium">{coach.bio}</p>

              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-6 text-sm">
                <div>
                  <span className="text-white/60 block text-xs">License & Certification:</span>
                  <span className="font-bold text-white">{coach.certification}</span>
                </div>
                <div>
                  <span className="text-white/60 block text-xs">Direct Email:</span>
                  <a href={`mailto:${coach.contactEmail}`} className="font-bold text-[#D8F500] hover:underline">
                    {coach.contactEmail}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Achievements & Teams Coached */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card variant="standard" className="space-y-4">
            <h3 className="text-2xl font-bold font-display text-[#171044]">
              Specialties & Focus Areas <CrossAccent color="orange" size="sm" />
            </h3>
            <div className="space-y-3">
              {coach.specialties.map((spec, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-[#F7F1E8] rounded-xl font-bold text-sm text-[#171044]">
                  <CheckCircle2 size={18} className="text-[#FF5A00]" />
                  <span>{spec}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card variant="standard" className="space-y-4">
            <h3 className="text-2xl font-bold font-display text-[#171044]">
              Career Achievements <CrossAccent color="orange" size="sm" />
            </h3>
            <div className="space-y-3">
              {coach.achievements.map((ach, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-[#171044]/5 rounded-xl font-bold text-sm text-[#171044]">
                  <Award size={18} className="text-[#4B2A9B]" />
                  <span>{ach}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
};
