import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, SectionHeader, CrossAccent, AthleticBadge } from '../design-system';
import { Shield, Trophy, Target, ArrowRight } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="space-y-20 pb-20">
      {/* Hero Header */}
      <section className="bg-[#171044] text-white py-16 md:py-24 rounded-b-3xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <AthleticBadge variant="lime">ABOUT ATHLETIQ ACADEMY</AthleticBadge>
          <h1 className="text-4xl md:text-6xl font-black font-display text-white">
            REDEFINING YOUTH ATHLETE DEVELOPMENT <CrossAccent color="orange" size="lg" />
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto font-medium">
            Founded with a vision to deliver world-class sports education, sports analytics, and competitive pathways for young athletes.
          </p>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card variant="standard" className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FF5A00]/10 text-[#FF5A00] flex items-center justify-center font-bold">
              <Target size={24} />
            </div>
            <h3 className="text-2xl font-bold font-display text-[#171044]">Our Mission</h3>
            <p className="text-sm text-[#171044]/70 leading-relaxed">
              To empower athletes through professional coaching, scientific biomechanics tracking, character development, and elite tournament competition.
            </p>
          </Card>

          <Card variant="dark" className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#D8F500]/20 text-[#D8F500] flex items-center justify-center font-bold">
              <Shield size={24} />
            </div>
            <h3 className="text-2xl font-bold font-display text-white">Our Philosophy</h3>
            <p className="text-sm text-white/70 leading-relaxed">
              We focus on long-term athletic development (LTAD). We build decision-making agility, mental resilience, and physical literacy before specializing.
            </p>
          </Card>

          <Card variant="standard" className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#4B2A9B]/10 text-[#4B2A9B] flex items-center justify-center font-bold">
              <Trophy size={24} />
            </div>
            <h3 className="text-2xl font-bold font-display text-[#171044]">Scout Network</h3>
            <p className="text-sm text-[#171044]/70 leading-relaxed">
              Direct pathways to college sports programs, national teams, and professional club academies through verified performance data profiles.
            </p>
          </Card>
        </div>
      </section>

      {/* Facilities Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="World-Class Facilities"
          subtitle="Engineered for high performance, recovery, and competitive tournament hosting."
          crossColor="orange"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="relative rounded-3xl overflow-hidden h-80 group bg-gradient-to-br from-[#171044] to-[#281c66] p-8 flex flex-col justify-between border border-[#171044]/15 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-[#D8F500]/20 text-[#D8F500] flex items-center justify-center font-bold text-3xl">
              🏟️
            </div>
            <div>
              <h4 className="text-2xl font-bold text-white font-display">Regulation Championship Pitches</h4>
              <p className="text-xs text-white/80 mt-2 leading-relaxed">
                Natural grass match grounds, floodlit synthetic turf, and sprung hardwood multi-sport arena courts.
              </p>
            </div>
          </div>

          <div className="relative rounded-3xl overflow-hidden h-80 group bg-gradient-to-br from-[#171044] to-[#4B2A9B] p-8 flex flex-col justify-between border border-[#171044]/15 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-[#FF5A00]/20 text-[#FF5A00] flex items-center justify-center font-bold text-3xl">
              ⚡
            </div>
            <div>
              <h4 className="text-2xl font-bold text-white font-display">Aquatics & Performance Lab</h4>
              <p className="text-xs text-white/80 mt-2 leading-relaxed">
                50m Olympic competition pool, camera stroke analysis, biomechanics velocity tracking, and recovery suites.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#FF5A00] text-white p-10 md:p-14 rounded-3xl text-center space-y-6 shadow-2xl">
          <h2 className="text-3xl md:text-5xl font-black font-display">READY TO START YOUR ATHLETIQ JOURNEY?</h2>
          <p className="text-white/90 max-w-xl mx-auto text-base">
            Enroll today for trials and academy placement assessments across our 6 core sports.
          </p>
          <Link to="/register">
            <Button variant="secondary" size="lg" iconRight={<ArrowRight size={20} />}>
              Apply for Trial Assessment
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};
