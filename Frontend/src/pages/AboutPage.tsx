import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, SectionHeader, CrossAccent, AthleticBadge } from '../design-system';
import { Shield, Trophy, Users, Target, CheckCircle2, ArrowRight } from 'lucide-react';

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
          <div className="relative rounded-3xl overflow-hidden h-80 group">
            <img
              src="https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800&auto=format&fit=crop"
              alt="Pitches"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#171044] via-transparent to-transparent p-6 flex flex-col justify-end">
              <h4 className="text-2xl font-bold text-white font-display">FIFA & FIBA Regulation Pitches</h4>
              <p className="text-xs text-white/80 mt-1">Natural grass, floodlit synthetic turf, and sprung hardwood courts.</p>
            </div>
          </div>

          <div className="relative rounded-3xl overflow-hidden h-80 group">
            <img
              src="https://images.unsplash.com/photo-1530549387789-4c1017266635?q=80&w=800&auto=format&fit=crop"
              alt="Pool & Performance Lab"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#171044] via-transparent to-transparent p-6 flex flex-col justify-end">
              <h4 className="text-2xl font-bold text-white font-display">Aquatics & Biometrics Center</h4>
              <p className="text-xs text-white/80 mt-1">50m Olympic pool, underwater camera analysis, and GPS tracking lab.</p>
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
