import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { sportsData } from '../data/sportsData';
import { coachesData } from '../data/coachesData';
import { Button, Card, SectionHeader, CrossAccent, AthleticBadge } from '../design-system';
import { ArrowLeft, ArrowRight, CheckCircle, Calendar, Clock, DollarSign, Users } from 'lucide-react';

export const ProgramDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const sport = sportsData.find((s) => s.id === id) || sportsData[0];
  const headCoach = coachesData.find((c) => c.id === sport.headCoachId) || coachesData[0];

  return (
    <div className="space-y-16 pb-20">
      {/* Back Link */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link to="/programs" className="inline-flex items-center gap-2 text-sm font-bold text-[#171044] hover:text-[#FF5A00]">
          <ArrowLeft size={16} /> Back to Programs
        </Link>
      </div>

      {/* Hero Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden h-96 border border-[#171044]/10 shadow-2xl">
          <img src={sport.heroImage} alt={sport.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#171044] via-[#171044]/60 to-transparent p-8 md:p-12 flex flex-col justify-end">
            <div className="flex items-center gap-3 mb-2">
              <AthleticBadge variant="lime">{sport.category}</AthleticBadge>
              <AthleticBadge variant="orange">{sport.enrolledCount} Enrolled Athletes</AthleticBadge>
            </div>
            <h1 className="text-4xl md:text-6xl font-black font-display text-white">
              {sport.name} <CrossAccent color="lime" size="lg" />
            </h1>
            <p className="text-white/80 max-w-2xl text-sm md:text-base mt-2">{sport.shortDesc}</p>
          </div>
        </div>
      </section>

      {/* Program Details Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column - Description & Curriculum */}
          <div className="lg:col-span-8 space-y-8">
            <Card variant="standard" className="space-y-6">
              <h2 className="text-3xl font-black font-display text-[#171044]">
                Program Overview <CrossAccent color="orange" size="sm" />
              </h2>
              <p className="text-base text-[#171044]/80 leading-relaxed font-medium">{sport.fullDesc}</p>

              <h3 className="text-xl font-bold font-display text-[#171044] pt-4 border-t border-[#171044]/10">
                Curriculum Features & Infrastructure
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sport.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3 bg-[#F7F1E8] p-4 rounded-2xl">
                    <CheckCircle size={20} className="text-[#FF5A00] shrink-0 mt-0.5" />
                    <span className="text-sm font-semibold text-[#171044]">{feature}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Head Coach Spot */}
            <Card variant="dark" className="flex flex-col sm:flex-row items-center gap-6">
              <img
                src={headCoach.image}
                alt={headCoach.name}
                className="w-32 h-32 rounded-2xl object-cover shrink-0"
              />
              <div className="space-y-2 text-center sm:text-left">
                <AthleticBadge variant="lime">HEAD COACH</AthleticBadge>
                <h3 className="text-2xl font-bold font-display text-white">{headCoach.name}</h3>
                <p className="text-xs text-[#D8F500] font-semibold">{headCoach.certification}</p>
                <p className="text-xs text-white/70 line-clamp-2">{headCoach.bio}</p>
                <Link to={`/coaches/${headCoach.id}`} className="inline-block text-xs font-bold text-[#FF5A00] hover:underline pt-1">
                  View Coach Profile →
                </Link>
              </div>
            </Card>
          </div>

          {/* Right Column - Enrollment Card */}
          <div className="lg:col-span-4 space-y-6">
            <Card variant="standard" className="space-y-6 sticky top-28">
              <div className="text-center pb-4 border-b border-[#171044]/10">
                <div className="text-3xl font-black font-display text-[#FF5A00]">{sport.fee}</div>
                <div className="text-xs text-[#171044]/60 font-semibold mt-1">Full Monthly Training Membership</div>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[#171044]/70 flex items-center gap-2"><Clock size={16} /> Schedule:</span>
                  <span className="font-bold text-[#171044] text-xs">{sport.schedule}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#171044]/70 flex items-center gap-2"><Users size={16} /> Age Groups:</span>
                  <span className="font-bold text-[#171044] text-xs">{sport.ageGroups.join(', ')}</span>
                </div>
              </div>

              <Link to="/register" className="block pt-2">
                <Button variant="primary" fullWidth size="lg" iconRight={<ArrowRight size={18} />}>
                  Enroll in Program
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};
