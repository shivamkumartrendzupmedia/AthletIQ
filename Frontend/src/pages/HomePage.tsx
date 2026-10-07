import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  SectionHeader,
  CrossAccent,
  AthleticBadge,
  RadialScoreMeter,
} from '../design-system';
import {
  Play,
  ArrowRight,
  Trophy,
  Calendar,
  MapPin,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Send,
  Activity,
  Shield,
  Users,
  Clock,
  Flame,
  Award,
} from 'lucide-react';
import { coachesData } from '../data/coachesData';
import { teamsData } from '../data/teamsData';
import { tournamentsData } from '../data/tournamentsData';
import { newsData } from '../data/newsData';
import { motion, AnimatePresence } from 'framer-motion';

// High-resolution local image assets
import heroAthleteImg from '../assets/hero_athlete.jpg';
import trophySpotlightImg from '../assets/trophy_spotlight.jpg';
import u16TeamImg from '../assets/u16_strikers_team.jpg';
import alexMorganPortraitImg from '../assets/alex_morgan_portrait.jpg';

export const HomePage: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<number>(21);
  const [selectedGalleryCategory, setSelectedGalleryCategory] = useState<string>('All');
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [coachIndex, setCoachIndex] = useState(0);

  const days = [
    { day: 'Mon', date: 20 },
    { day: 'Tue', date: 21 },
    { day: 'Wed', date: 22 },
    { day: 'Thu', date: 23 },
    { day: 'Fri', date: 24 },
    { day: 'Sat', date: 25 },
    { day: 'Sun', date: 26 },
  ];

  const trainingSessions = [
    {
      time: '06:00 - 07:30 PM',
      title: 'Speed & Agility',
      field: 'Field A',
      coach: 'Coach David',
      icon: '⚡',
      sport: 'Soccer',
    },
    {
      time: '07:00 - 08:30 PM',
      title: 'Ball Control & Dribbling',
      field: 'Field B',
      coach: 'Coach Mike',
      icon: '⚽',
      sport: 'Soccer',
    },
    {
      time: '08:00 - 09:30 PM',
      title: 'Team Tactics & Scrimmage',
      field: 'Field A',
      coach: 'Coach Emily',
      icon: '🏆',
      sport: 'Soccer',
    },
  ];

  const galleryImages = [
    { id: '1', title: 'Championship Final Sprint', cat: 'Matches', img: heroAthleteImg, size: 'large' },
    { id: '2', title: 'U16 Strikers Trophy Celebration', cat: 'Events', img: trophySpotlightImg, size: 'normal' },
    { id: '3', title: 'Team Squad Tactical Huddle', cat: 'Training', img: u16TeamImg, size: 'normal' },
    { id: '4', title: 'Alex Morgan Individual Drills', cat: 'Training', img: alexMorganPortraitImg, size: 'normal' },
  ];

  // Coach Carousel Slice (Exactly 3 coaches visible on desktop)
  const nextCoaches = () => {
    setCoachIndex((prev) => (prev + 1) % coachesData.length);
  };

  const prevCoaches = () => {
    setCoachIndex((prev) => (prev - 1 + coachesData.length) % coachesData.length);
  };

  const visibleCoaches = [
    coachesData[coachIndex % coachesData.length],
    coachesData[(coachIndex + 1) % coachesData.length],
    coachesData[(coachIndex + 2) % coachesData.length],
  ];

  return (
    <div className="bg-[#F7F1E8] text-[#111111] font-sans antialiased space-y-24 pb-24 overflow-x-hidden">
      {/* ==================================================
          1. HERO SECTION — INTEGRATED ATHLETE SPORTS COMPOSITION (UN-CARDED)
         ================================================== */}
      <section className="relative pt-6 pb-16 md:pt-10 md:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Oversized Editorial Headline & CTAs */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 space-y-6 z-20"
          >
            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-8xl font-black font-display tracking-tight leading-[0.9] text-[#111111] uppercase">
              YOU ARE <br />
              MADE TO <CrossAccent color="orange" size="lg" /> <br />
              <span className="text-[#FF5A00]">MOVE.</span>
            </h1>

            <p className="text-base sm:text-lg text-[#171044]/80 max-w-md font-medium leading-relaxed">
              A place where every kid discovers their passion, builds confidence, and loves being active.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link to="/programs">
                <button className="group px-8 py-4 bg-[#171044] text-white font-display font-black text-sm md:text-base rounded-full shadow-xl shadow-[#171044]/25 hover:bg-[#4B2A9B] transition-all duration-300 hover:scale-105 flex items-center gap-2">
                  <span>Explore Programs</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <button className="group px-6 py-4 bg-[#111111] text-white font-display font-bold text-sm md:text-base rounded-full flex items-center gap-2.5 shadow-md hover:bg-[#FF5A00] transition-all duration-300 hover:scale-105">
                <span className="w-7 h-7 rounded-full bg-white text-[#111111] flex items-center justify-center text-xs font-black group-hover:scale-110 transition-transform">
                  ▶
                </span>
                <span>Watch Video</span>
              </button>
            </div>
          </motion.div>

          {/* Center Column: Art-Directed Sports Campaign Composition (Un-carded & Layered) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 relative min-h-[460px] sm:min-h-[520px] flex items-center justify-center py-4 my-2"
          >
            {/* LAYER 1: Deep Athletic Purple Base Organic Shield Background */}
            <div className="absolute inset-0 bg-[#171044] rounded-[4rem] transform -rotate-6 scale-95 shadow-2xl overflow-hidden pointer-events-none">
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#D8F500_1px,transparent_1px)] [background-size:16px_16px]" />
            </div>

            {/* LAYER 2: Electric Lime & Athletic Orange Paint Brush Strokes */}
            <div className="absolute -top-10 -left-10 w-48 h-48 bg-[#D8F500] rounded-full filter blur-2xl opacity-60 pointer-events-none animate-pulse" />
            <div className="absolute -bottom-10 -right-10 w-52 h-52 bg-[#FF5A00] rounded-full filter blur-2xl opacity-70 pointer-events-none" />

            {/* Dynamic Curved SVG Brush Strokes bursting behind athlete */}
            <svg className="absolute -top-12 -right-8 w-64 h-64 pointer-events-none opacity-90 z-10" viewBox="0 0 200 200" fill="none">
              <path d="M 20 180 C 60 100, 140 40, 180 20" stroke="#D8F500" strokeWidth="20" strokeLinecap="round" />
              <path d="M 40 190 C 80 120, 150 60, 190 30" stroke="#FF5A00" strokeWidth="14" strokeLinecap="round" />
            </svg>

            <svg className="absolute -bottom-10 -left-10 w-60 h-60 pointer-events-none opacity-85 z-10" viewBox="0 0 200 200" fill="none">
              <path d="M 10 30 C 70 90, 130 150, 190 170" stroke="#FF5A00" strokeWidth="24" strokeLinecap="round" />
              <path d="M 30 10 C 90 70, 150 130, 180 190" stroke="#D8F500" strokeWidth="12" strokeLinecap="round" />
            </svg>

            {/* LAYER 3: Un-carded Dynamic Athlete Image (Bursting through graphic layers with organic clip polygon) */}
            <div className="relative z-20 w-full max-w-md h-[440px] sm:h-[500px] pointer-events-none group">
              <img
                src={heroAthleteImg}
                alt="AthletiQ Action Athlete"
                className="w-full h-full object-cover object-top filter drop-shadow-[0_25px_35px_rgba(23,16,68,0.6)] [clip-path:polygon(0%_8%,_100%_0%,_100%_90%,_0%_100%)] transition-transform duration-700 hover:scale-105"
              />
            </div>

            {/* LAYER 4: Foreground Star Accents & Floating Badge */}
            <div className="absolute top-2 -right-4 z-30 flex items-center gap-1 text-[#D8F500] font-black text-3xl animate-bounce pointer-events-none">
              ✦
            </div>
            <div className="absolute bottom-10 -left-6 z-30 flex items-center gap-1 text-[#FF5A00] font-black text-4xl pointer-events-none">
              ✦
            </div>

            {/* Floating Editorial Badge (No card border) */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="absolute bottom-3 left-3 z-30 bg-[#171044]/95 text-white px-5 py-2.5 rounded-full border-2 border-[#D8F500] text-xs font-black shadow-2xl flex items-center gap-2"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#D8F500] animate-ping" />
              <span>ATHLETIQ ACADEMY • SEASON 2026</span>
            </motion.div>
          </motion.div>

          {/* Right Column: Hero Right-Side Journey (TRAIN -> DEVELOP -> COMPETE -> WIN) */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-2 flex lg:flex-col justify-around lg:justify-center items-center lg:items-end gap-6 border-t lg:border-t-0 lg:border-l border-[#171044]/15 pt-6 lg:pt-0 lg:pl-6"
          >
            {[
              { label: 'TRAIN', icon: '✦', color: 'text-[#171044]' },
              { label: 'DEVELOP', icon: '✦', color: 'text-[#4B2A9B]' },
              { label: 'COMPETE', icon: '✦', color: 'text-[#FF5A00]' },
              { label: 'WIN', icon: '✦', color: 'text-[#171044]' },
            ].map((step, idx) => (
              <div key={idx} className="flex items-center gap-2 group cursor-pointer">
                <span
                  className={`font-display font-black text-lg md:text-xl tracking-wider ${step.color} group-hover:text-[#FF5A00] transition-colors`}
                >
                  {step.label}
                </span>
                <span className="text-[#FF5A00] font-black text-sm group-hover:rotate-45 transition-transform">{step.icon}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ==================================================
          2. OUR + PROGRAMS SECTION (WITH ANIMATIONS)
         ================================================== */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <SectionHeader
          title="Our + Programs"
          subtitle="Pick a sport. Find your team. Start your journey."
          crossColor="orange"
          action={
            <Link to="/programs">
              <Button variant="outline" size="sm" iconRight={<ArrowRight size={16} />}>
                View All Programs
              </Button>
            </Link>
          }
        />

        {/* 6 Color-Coded Sport Cards matching Reference Board */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Soccer - Deep Purple */}
          <div className="bg-[#171044] text-white p-8 rounded-[2rem] shadow-xl flex flex-col justify-between group hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 relative overflow-hidden min-h-[320px]">
            <span className="absolute -right-4 -bottom-4 text-8xl opacity-10 pointer-events-none select-none group-hover:scale-110 transition-transform duration-500">⚽</span>
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#D8F500]/20 text-[#D8F500] flex items-center justify-center font-bold text-3xl group-hover:rotate-12 transition-transform">
                ⚽
              </div>
              <h3 className="text-3xl font-black font-display uppercase tracking-tight">Soccer</h3>
              <p className="text-sm text-white/80 leading-relaxed font-medium">
                Tactical periodization, position intelligence, and match exposure under UEFA-licensed coaches.
              </p>
            </div>
            <div className="pt-6">
              <Link to="/programs/football">
                <button className="px-6 py-2.5 bg-[#D8F500] text-[#171044] font-display font-black text-xs uppercase tracking-wider rounded-full flex items-center gap-2 hover:bg-[#c4e000] transition-all group/btn">
                  <span>Explore</span> <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </Link>
            </div>
          </div>

          {/* Basketball - Athletic Orange */}
          <div className="bg-[#FF5A00] text-white p-8 rounded-[2rem] shadow-xl flex flex-col justify-between group hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 relative overflow-hidden min-h-[320px]">
            <span className="absolute -right-4 -bottom-4 text-8xl opacity-10 pointer-events-none select-none group-hover:scale-110 transition-transform duration-500">🏀</span>
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 text-white flex items-center justify-center font-bold text-3xl group-hover:rotate-12 transition-transform">
                🏀
              </div>
              <h3 className="text-3xl font-black font-display uppercase tracking-tight">Basketball</h3>
              <p className="text-sm text-white/90 leading-relaxed font-medium">
                Precision shooting, court vision, vertical power development, and competitive league play.
              </p>
            </div>
            <div className="pt-6">
              <Link to="/programs/basketball">
                <button className="px-6 py-2.5 bg-white text-[#FF5A00] font-display font-black text-xs uppercase tracking-wider rounded-full flex items-center gap-2 hover:bg-white/90 transition-all group/btn">
                  <span>Explore</span> <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </Link>
            </div>
          </div>

          {/* Tennis - Electric Lime */}
          <div className="bg-[#D8F500] text-[#171044] p-8 rounded-[2rem] shadow-xl flex flex-col justify-between group hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 relative overflow-hidden min-h-[320px]">
            <span className="absolute -right-4 -bottom-4 text-8xl opacity-10 pointer-events-none select-none group-hover:scale-110 transition-transform duration-500">🎾</span>
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#171044]/15 text-[#171044] flex items-center justify-center font-bold text-3xl group-hover:rotate-12 transition-transform">
                🎾
              </div>
              <h3 className="text-3xl font-black font-display uppercase tracking-tight">Tennis</h3>
              <p className="text-sm text-[#171044]/80 leading-relaxed font-medium">
                Serve mechanics, clay & hard court strategy, footwork drills, and junior tournament preparation.
              </p>
            </div>
            <div className="pt-6">
              <Link to="/programs/tennis">
                <button className="px-6 py-2.5 bg-[#171044] text-white font-display font-black text-xs uppercase tracking-wider rounded-full flex items-center gap-2 hover:bg-[#281c66] transition-all group/btn">
                  <span>Explore</span> <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </Link>
            </div>
          </div>

          {/* Swimming - Ocean Purple */}
          <div className="bg-[#4B2A9B] text-white p-8 rounded-[2rem] shadow-xl flex flex-col justify-between group hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 relative overflow-hidden min-h-[320px]">
            <span className="absolute -right-4 -bottom-4 text-8xl opacity-10 pointer-events-none select-none group-hover:scale-110 transition-transform duration-500">🏊‍♂️</span>
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 text-white flex items-center justify-center font-bold text-3xl group-hover:rotate-12 transition-transform">
                🏊‍♂️
              </div>
              <h3 className="text-3xl font-black font-display uppercase tracking-tight">Swimming</h3>
              <p className="text-sm text-white/80 leading-relaxed font-medium">
                Hydrodynamic stroke perfection, flip-turn velocity, and endurance conditioning in Olympic pools.
              </p>
            </div>
            <div className="pt-6">
              <Link to="/programs/swimming">
                <button className="px-6 py-2.5 bg-[#D8F500] text-[#171044] font-display font-black text-xs uppercase tracking-wider rounded-full flex items-center gap-2 hover:bg-[#c4e000] transition-all group/btn">
                  <span>Explore</span> <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </Link>
            </div>
          </div>

          {/* Athletics - Vibrant Orange */}
          <div className="bg-gradient-to-br from-[#FF5A00] to-[#171044] text-white p-8 rounded-[2rem] shadow-xl flex flex-col justify-between group hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 relative overflow-hidden min-h-[320px]">
            <span className="absolute -right-4 -bottom-4 text-8xl opacity-10 pointer-events-none select-none group-hover:scale-110 transition-transform duration-500">🏃‍♂️</span>
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 text-white flex items-center justify-center font-bold text-3xl group-hover:rotate-12 transition-transform">
                🏃‍♂️
              </div>
              <h3 className="text-3xl font-black font-display uppercase tracking-tight">Athletics</h3>
              <p className="text-sm text-white/80 leading-relaxed font-medium">
                Sprint biomechanics, explosive starting block power, middle-distance pacing, and field events.
              </p>
            </div>
            <div className="pt-6">
              <Link to="/programs/athletics">
                <button className="px-6 py-2.5 bg-white text-[#171044] font-display font-black text-xs uppercase tracking-wider rounded-full flex items-center gap-2 hover:bg-white/90 transition-all group/btn">
                  <span>Explore</span> <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </Link>
            </div>
          </div>

          {/* Volleyball - Deep Purple */}
          <div className="bg-[#171044] text-white p-8 rounded-[2rem] shadow-xl flex flex-col justify-between group hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 relative overflow-hidden min-h-[320px]">
            <span className="absolute -right-4 -bottom-4 text-8xl opacity-10 pointer-events-none select-none group-hover:scale-110 transition-transform duration-500">🏐</span>
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#FF5A00]/20 text-[#FF5A00] flex items-center justify-center font-bold text-3xl group-hover:rotate-12 transition-transform">
                🏐
              </div>
              <h3 className="text-3xl font-black font-display uppercase tracking-tight">Volleyball</h3>
              <p className="text-sm text-white/80 leading-relaxed font-medium">
                Spike elevation, rotational defensive coverage, setting precision, and team communication.
              </p>
            </div>
            <div className="pt-6">
              <Link to="/programs/volleyball">
                <button className="px-6 py-2.5 bg-[#FF5A00] text-white font-display font-black text-xs uppercase tracking-wider rounded-full flex items-center gap-2 hover:bg-[#e04f00] transition-all group/btn">
                  <span>Explore</span> <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ==================================================
          3. TRAINING SCHEDULE + SECTION
         ================================================== */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <SectionHeader
          title="Training Schedule +"
          subtitle="May 20 - May 26 • Live Field Allocations"
          crossColor="orange"
        />

        <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-xl border border-[#171044]/10 space-y-8">
          {/* Day Selector Pill Bar */}
          <div className="flex items-center justify-between overflow-x-auto pb-2 gap-3">
            {days.map((d) => (
              <button
                key={d.date}
                onClick={() => setSelectedDay(d.date)}
                className={`flex flex-col items-center justify-center min-w-[70px] py-3.5 px-4 rounded-2xl transition-all duration-200 ${
                  selectedDay === d.date
                    ? 'bg-[#171044] text-[#D8F500] shadow-lg scale-105 font-black'
                    : 'bg-[#F7F1E8] text-[#171044]/70 hover:bg-[#171044]/10'
                }`}
              >
                <span className="text-xs font-display font-bold uppercase">{d.day}</span>
                <span className="text-xl font-display font-black mt-1">{d.date}</span>
              </button>
            ))}
          </div>

          {/* Session Cards List */}
          <div className="space-y-4">
            {trainingSessions.map((session, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-2xl bg-[#F7F1E8] border border-[#171044]/5 gap-4 hover:border-[#171044]/20 transition-all hover:scale-[1.01]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#171044] text-white flex items-center justify-center text-xl shrink-0">
                    {session.icon}
                  </div>
                  <div>
                    <h4 className="font-display font-black text-lg text-[#171044]">{session.title}</h4>
                    <p className="text-xs text-[#171044]/70 font-semibold flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1"><Clock size={13} /> {session.time}</span>
                      <span className="flex items-center gap-1"><MapPin size={13} /> {session.field}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold px-3 py-1 bg-white rounded-full text-[#171044] border border-[#171044]/10">
                    {session.coach}
                  </span>
                  <button className="px-4 py-2 bg-[#171044] text-white rounded-full font-display font-bold text-xs hover:bg-[#FF5A00] transition-colors">
                    Join Session
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Water Bottle Strip */}
          <div className="bg-[#171044] text-[#D8F500] px-6 py-3.5 rounded-2xl text-xs font-display font-extrabold flex items-center justify-between">
            <span>Don't forget your water bottle! 💧 Stay hydrated during warm-ups.</span>
            <span className="hidden sm:inline text-white/70 font-normal">Active Arena • Field A & B</span>
          </div>
        </div>
      </motion.section>

      {/* ==================================================
          4. MEET OUR COACHES + SECTION (3 COACHES VISIBLE ON DESKTOP)
         ================================================== */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 md:mb-10 gap-4">
          <div>
            <h2 className="text-4xl md:text-5xl font-black font-display text-[#171044] tracking-tight uppercase">
              Meet Our Coaches <CrossAccent color="orange" size="lg" />
            </h2>
            <p className="mt-2 text-base text-[#171044]/70 font-medium">
              Certified world-class mentors dedicated to youth athletic development.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Slider Navigation Arrows */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={prevCoaches}
                className="w-10 h-10 rounded-full bg-white border border-[#171044]/15 flex items-center justify-center text-[#171044] hover:bg-[#171044] hover:text-white transition-colors shadow-sm active:scale-95"
                aria-label="Previous Coaches"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={nextCoaches}
                className="w-10 h-10 rounded-full bg-white border border-[#171044]/15 flex items-center justify-center text-[#171044] hover:bg-[#171044] hover:text-white transition-colors shadow-sm active:scale-95"
                aria-label="Next Coaches"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <Link to="/coaches">
              <Button variant="outline" size="sm">
                View All Coaches
              </Button>
            </Link>
          </div>
        </div>

        {/* 3 Spacious Coach Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {visibleCoaches.map((coach, idx) => (
            <motion.div
              key={`${coach.id}-${idx}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
            >
              <Link to={`/coaches/${coach.id}`} className="group block h-full">
                <div className="bg-white rounded-[2rem] p-5 shadow-xl border border-[#171044]/10 space-y-5 h-full flex flex-col justify-between group-hover:-translate-y-2 group-hover:shadow-2xl transition-all duration-300">
                  {/* Large Prominent Coach Portrait Photo */}
                  <div className="w-full h-80 rounded-[1.5rem] overflow-hidden border-2 border-[#171044]/10 group-hover:border-[#FF5A00] transition-colors relative">
                    <img
                      src={coach.image}
                      alt={coach.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 right-4 bg-[#171044]/90 text-[#D8F500] text-xs font-black px-3.5 py-1.5 rounded-full border border-white/20">
                      {coach.sport}
                    </div>
                  </div>

                  {/* Coach Name & Role */}
                  <div className="space-y-1 text-center pt-1">
                    <h3 className="font-display font-black text-2xl text-[#171044] group-hover:text-[#FF5A00] transition-colors">
                      {coach.name}
                    </h3>
                    <p className="text-xs font-extrabold text-[#171044]/60 uppercase tracking-wider">
                      {coach.role}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ==================================================
          5. OUR + TEAMS & PLAYER PROGRESS SPOTLIGHT
         ================================================== */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
      >
        {/* Left Column: Our Teams Feature (U16 Strikers) */}
        <div className="lg:col-span-5 space-y-6">
          <SectionHeader
            title="Our + Teams"
            subtitle="Stronger together. One team, one dream."
            crossColor="orange"
            align="left"
          />

          <div className="bg-[#171044] text-white p-7 rounded-[2.5rem] shadow-2xl space-y-6 relative overflow-hidden group hover:shadow-2xl transition-all">
            <div className="flex items-center justify-between">
              <AthleticBadge variant="lime">U16 Strikers</AthleticBadge>
              <span className="text-xs font-bold text-white/70">Academy Premier League</span>
            </div>

            {/* Team Photo Container */}
            <div className="rounded-2xl overflow-hidden border-2 border-white/20 shadow-lg">
              <img src={u16TeamImg} alt="U16 Strikers Team" className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-4 gap-2 bg-white/10 backdrop-blur-md p-4 rounded-2xl text-center border border-white/10">
              <div>
                <div className="text-2xl font-black font-display text-[#D8F500]">18</div>
                <div className="text-[10px] font-bold uppercase text-white/70">Players</div>
              </div>
              <div>
                <div className="text-2xl font-black font-display text-white">24</div>
                <div className="text-[10px] font-bold uppercase text-white/70">Matches</div>
              </div>
              <div>
                <div className="text-2xl font-black font-display text-[#FF5A00]">17</div>
                <div className="text-[10px] font-bold uppercase text-white/70">Wins</div>
              </div>
              <div>
                <div className="text-2xl font-black font-display text-white">2</div>
                <div className="text-[10px] font-bold uppercase text-white/70">Draws</div>
              </div>
            </div>

            <Link to="/teams/u16-strikers" className="block text-center">
              <button className="w-full py-3 bg-white text-[#171044] font-display font-black text-xs uppercase tracking-wider rounded-full hover:bg-[#D8F500] transition-colors">
                View Team Roster
              </button>
            </Link>
          </div>
        </div>

        {/* Right Column: Player Progress Spotlight (#09 Alex Morgan) */}
        <div className="lg:col-span-7 space-y-6">
          <SectionHeader
            title="Player Progress +"
            subtitle="Individual growth and technical assessment tracking."
            crossColor="orange"
            align="left"
          />

          <div className="bg-[#171044] text-white p-7 rounded-[2.5rem] shadow-2xl grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
            {/* Player Info & Radial Score Meter */}
            <div className="sm:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#FF5A00] tracking-widest uppercase">#09 FORWARD</div>
                  <h3 className="text-3xl font-black font-display uppercase tracking-tight text-white">
                    Alex Morgan
                  </h3>
                  <p className="text-xs text-white/70 font-medium">U16 Strikers • Age 15 • Joined 2022</p>
                </div>
                <RadialScoreMeter score={87} color="purple" size="md" />
              </div>

              {/* Stat Sliders */}
              <div className="space-y-2 pt-2 text-xs">
                {[
                  { stat: 'Speed', val: 92 },
                  { stat: 'Stamina', val: 85 },
                  { stat: 'Shooting', val: 90 },
                  { stat: 'Passing', val: 84 },
                  { stat: 'Dribbling', val: 93 },
                ].map((s) => (
                  <div key={s.stat} className="space-y-1">
                    <div className="flex justify-between font-bold text-white/80">
                      <span>{s.stat}</span>
                      <span className="text-[#D8F500]">{s.val}</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${s.val}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="bg-[#D8F500] h-full rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Badges */}
              <div className="flex items-center gap-3 pt-2">
                <span className="px-3 py-1 bg-[#FF5A00]/20 text-[#FF5A00] text-[11px] font-bold rounded-full border border-[#FF5A00]/30">
                  +14% Speed
                </span>
                <span className="px-3 py-1 bg-[#D8F500]/20 text-[#D8F500] text-[11px] font-bold rounded-full border border-[#D8F500]/30">
                  +11% Fitness
                </span>
                <span className="px-3 py-1 bg-white/10 text-white text-[11px] font-bold rounded-full border border-white/20">
                  +17% Technique
                </span>
              </div>
            </div>

            {/* Player Portrait Image */}
            <div className="sm:col-span-5 relative">
              <div className="rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl">
                <img src={alexMorganPortraitImg} alt="Alex Morgan Portrait" className="w-full h-64 object-cover" />
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ==================================================
          6. ACTIVE NB CUP 2024 / TOURNAMENT SPOTLIGHT + BRACKET
         ================================================== */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8"
      >
        <SectionHeader
          title="Active NB Cup 2024 +"
          subtitle="The biggest youth tournament of the year."
          crossColor="orange"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Tournament Overview Card with Trophy Image */}
          <div className="lg:col-span-5 bg-white p-8 rounded-[2.5rem] shadow-xl border border-[#171044]/10 space-y-6 relative overflow-hidden">
            <div className="rounded-2xl overflow-hidden h-48 border border-[#171044]/10">
              <img src={trophySpotlightImg} alt="Trophy Spotlight" className="w-full h-full object-cover" />
            </div>

            <div className="space-y-2">
              <AthleticBadge variant="orange">GRAND FINALS</AthleticBadge>
              <h3 className="text-3xl font-black font-display text-[#171044] uppercase">Active NB Cup 2024</h3>
              <p className="text-xs text-[#171044]/70 font-medium leading-relaxed">
                64 teams competing across 8 regional venues for the ultimate championship trophy.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2 bg-[#F7F1E8] p-4 rounded-2xl text-center">
              <div>
                <div className="text-xl font-black font-display text-[#171044]">24</div>
                <div className="text-[10px] font-bold text-[#171044]/70 uppercase">Teams</div>
              </div>
              <div>
                <div className="text-xl font-black font-display text-[#171044]">48</div>
                <div className="text-[10px] font-bold text-[#171044]/70 uppercase">Matches</div>
              </div>
              <div>
                <div className="text-xl font-black font-display text-[#171044]">6</div>
                <div className="text-[10px] font-bold text-[#171044]/70 uppercase">Groups</div>
              </div>
              <div>
                <div className="text-xl font-black font-display text-[#171044]">8</div>
                <div className="text-[10px] font-bold text-[#171044]/70 uppercase">Venues</div>
              </div>
            </div>

            <Link to="/tournaments/active-nb-cup">
              <button className="w-full py-3.5 bg-[#FF5A00] text-white font-display font-black text-xs uppercase tracking-wider rounded-full shadow-lg hover:bg-[#e04f00] transition-colors">
                View Tournament Bracket
              </button>
            </Link>
          </div>

          {/* Knockout Stage Bracket Visualizer */}
          <div className="lg:col-span-7 bg-[#F7F1E8] p-7 rounded-[2.5rem] border border-[#171044]/15 space-y-6">
            <div className="flex items-center justify-between border-b border-[#171044]/10 pb-4">
              <h4 className="font-display font-black text-xl text-[#171044] uppercase flex items-center gap-2">
                Knockout Stage <CrossAccent color="orange" size="sm" />
              </h4>
              <span className="text-xs font-bold text-[#FF5A00] bg-[#FF5A00]/10 px-3 py-1 rounded-full">
                June 15 Final
              </span>
            </div>

            {/* Bracket Flow */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Quarter Final */}
              <div className="space-y-3">
                <div className="text-[11px] font-extrabold uppercase text-[#171044]/60 tracking-wider">
                  Quarter Final
                </div>
                <div className="p-3 bg-white rounded-xl shadow-sm border border-[#171044]/10 text-xs font-bold text-[#171044] flex justify-between">
                  <span>U16 Strikers</span>
                  <span className="text-[#FF5A00]">3</span>
                </div>
                <div className="p-3 bg-white rounded-xl shadow-sm border border-[#171044]/10 text-xs font-bold text-[#171044]/60 flex justify-between">
                  <span>Thunder FC</span>
                  <span>1</span>
                </div>
                <div className="p-3 bg-white rounded-xl shadow-sm border border-[#171044]/10 text-xs font-bold text-[#171044] flex justify-between mt-4">
                  <span>Victory FC</span>
                  <span className="text-[#FF5A00]">4</span>
                </div>
              </div>

              {/* Semi Final */}
              <div className="space-y-3">
                <div className="text-[11px] font-extrabold uppercase text-[#171044]/60 tracking-wider">
                  Semi Final
                </div>
                <div className="p-4 bg-[#171044] text-white rounded-2xl shadow-md space-y-2 border border-white/10">
                  <div className="flex justify-between text-xs font-bold text-[#D8F500]">
                    <span>U16 Strikers</span>
                    <span>2</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-white/70">
                    <span>Victory FC</span>
                    <span>1</span>
                  </div>
                </div>
              </div>

              {/* Final Box */}
              <div className="bg-[#D8F500] p-6 rounded-2xl text-center space-y-3 shadow-lg border border-[#171044]/10 animate-pulse">
                <div className="text-3xl">🏆</div>
                <div className="text-xs font-black font-display uppercase tracking-widest text-[#171044]">
                  FINAL CHAMPION
                </div>
                <div className="text-xl font-black font-display text-[#171044]">U16 STRIKERS</div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ==================================================
          7. LIVE MATCH BROADCAST CENTER
         ================================================== */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="bg-[#171044] text-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl space-y-8 relative overflow-hidden border border-white/10">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div className="flex items-center gap-3">
              <AthleticBadge variant="live">LIVE MATCH BROADCAST</AthleticBadge>
              <span className="text-xs font-bold text-white/70 font-mono">68:42 2nd Half</span>
            </div>
            <span className="text-xs font-bold text-[#D8F500] uppercase tracking-wider">
              Academy Arena • Field A
            </span>
          </div>

          {/* Scoreboard Hero */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-center">
            {/* Team A */}
            <div className="space-y-2">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-white/10 flex items-center justify-center text-3xl font-black border border-white/20">
                ⚡
              </div>
              <h3 className="text-2xl font-black font-display text-white">U16 Strikers</h3>
              <span className="text-xs font-bold text-[#D8F500]">Home</span>
            </div>

            {/* Score */}
            <div className="space-y-1">
              <div className="text-6xl md:text-7xl font-black font-display tracking-wider text-white">
                2 <span className="text-[#FF5A00]">-</span> 1
              </div>
              <p className="text-xs text-white/70 font-bold uppercase tracking-widest">Quarter Final</p>
            </div>

            {/* Team B */}
            <div className="space-y-2">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-white/10 flex items-center justify-center text-3xl font-black border border-white/20">
                🦅
              </div>
              <h3 className="text-2xl font-black font-display text-white">Blue Hawks</h3>
              <span className="text-xs font-bold text-white/70">Away</span>
            </div>
          </div>

          {/* Match Timeline Events */}
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-xs space-y-2">
            <div className="flex items-center gap-3 text-white/90 font-medium">
              <span className="font-bold text-[#D8F500] font-mono">12'</span> ⚽ Goal — Alex Morgan (U16 Strikers)
            </div>
            <div className="flex items-center gap-3 text-white/90 font-medium">
              <span className="font-bold text-[#FF5A00] font-mono">41'</span> 🟨 Yellow Card — Blue Hawks #04
            </div>
            <div className="flex items-center gap-3 text-white/90 font-medium">
              <span className="font-bold text-[#D8F500] font-mono">62'</span> ⚽ Goal — Alex Morgan (U16 Strikers)
            </div>
          </div>
        </div>
      </motion.section>

      {/* ==================================================
          8. RESULTS + & LEADERBOARDS + SECTIONS
         ================================================== */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8"
      >
        {/* Match Results List */}
        <div className="lg:col-span-6 bg-white p-7 rounded-[2.5rem] shadow-xl border border-[#171044]/10 space-y-6">
          <div className="flex items-center justify-between border-b border-[#171044]/10 pb-4">
            <h3 className="text-2xl font-black font-display text-[#171044]">
              Match Results <CrossAccent color="orange" size="sm" />
            </h3>
            <div className="flex gap-1.5">
              <span className="px-3 py-1 bg-[#171044] text-white text-xs font-bold rounded-full">All</span>
              <span className="px-3 py-1 bg-[#F7F1E8] text-[#171044] text-xs font-bold rounded-full">Today</span>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { t1: 'U16 Strikers', s1: 2, t2: 'Blue Hawks', s2: 1, date: 'Today' },
              { t1: 'Thunder FC', s1: 1, t2: 'United Youth', s2: 0, date: 'Yesterday' },
              { t1: 'Rising Stars', s1: 3, t2: 'Young Titans', s2: 2, date: 'May 22' },
              { t1: 'Victory FC', s1: 4, t2: 'Elite Squad', s2: 0, date: 'May 21' },
            ].map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-xl bg-[#F7F1E8] border border-[#171044]/5 text-sm font-bold text-[#171044]"
              >
                <span className="w-1/3 text-right">{r.t1}</span>
                <span className="px-3 py-1 bg-[#171044] text-white rounded-lg font-mono font-black text-xs">
                  {r.s1} - {r.s2}
                </span>
                <span className="w-1/3 text-left">{r.t2}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboards */}
        <div className="lg:col-span-6 bg-white p-7 rounded-[2.5rem] shadow-xl border border-[#171044]/10 space-y-6">
          <div className="flex items-center justify-between border-b border-[#171044]/10 pb-4">
            <h3 className="text-2xl font-black font-display text-[#171044]">
              Leaderboard <CrossAccent color="orange" size="sm" />
            </h3>
            <span className="px-3 py-1 bg-[#FF5A00] text-white text-xs font-bold rounded-full">Top Scorers</span>
          </div>

          <div className="space-y-3">
            {[
              { rank: 1, name: 'Alex Morgan', team: 'U16 Strikers', goals: 14 },
              { rank: 2, name: 'Liam Anderson', team: 'Thunder FC', goals: 11 },
              { rank: 3, name: 'Noah Williams', team: 'Rising Stars', goals: 10 },
              { rank: 4, name: 'Ethan Brown', team: 'Victory FC', goals: 9 },
            ].map((p) => (
              <div
                key={p.rank}
                className="flex items-center justify-between p-3.5 rounded-xl bg-[#F7F1E8] border border-[#171044]/5 text-xs font-bold text-[#171044]"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#171044] text-white flex items-center justify-center font-black text-xs">
                    {p.rank}
                  </span>
                  <div>
                    <div className="font-black text-sm">{p.name}</div>
                    <div className="text-[10px] text-[#171044]/60">{p.team}</div>
                  </div>
                </div>
                <div className="px-3 py-1 bg-[#FF5A00] text-white font-black font-mono rounded-lg">
                  {p.goals} Goals
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ==================================================
          9. PHOTO GALLERY + SECTION
         ================================================== */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8"
      >
        <SectionHeader
          title="Photo Gallery +"
          subtitle="Capturing moments of victory, teamwork, and athletic excellence."
          crossColor="orange"
          action={
            <Link to="/gallery">
              <Button variant="outline" size="sm" iconRight={<ArrowRight size={16} />}>
                View Full Gallery
              </Button>
            </Link>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {galleryImages.map((img) => (
            <div
              key={img.id}
              className="rounded-3xl overflow-hidden shadow-xl border-2 border-white group relative h-64 cursor-pointer"
            >
              <img
                src={img.img}
                alt={img.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#171044]/90 via-transparent to-transparent p-5 flex flex-col justify-end text-white">
                <AthleticBadge variant="lime" size="sm" className="w-max mb-1">
                  {img.cat}
                </AthleticBadge>
                <h4 className="font-display font-black text-base">{img.title}</h4>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ==================================================
          10. CONTACT US + SECTION
         ================================================== */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-[#171044]/10">
          {/* Left Column Info */}
          <div className="lg:col-span-5 space-y-6">
            <h2 className="text-4xl md:text-5xl font-black font-display text-[#171044] uppercase tracking-tight">
              Contact Us <CrossAccent color="orange" size="lg" />
            </h2>
            <p className="text-sm text-[#171044]/80 font-medium leading-relaxed">
              Have questions about academy tryouts, programs, or facility bookings? Get in touch with our team.
            </p>

            <div className="space-y-4 text-xs font-bold text-[#171044]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#171044] text-white flex items-center justify-center">
                  📞
                </div>
                <div>
                  <div className="text-[10px] text-[#171044]/60 uppercase">Phone</div>
                  <div className="text-sm font-black">(505) 123-4567</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#171044] text-white flex items-center justify-center">
                  ✉️
                </div>
                <div>
                  <div className="text-[10px] text-[#171044]/60 uppercase">Email</div>
                  <div className="text-sm font-black">info@activeathletiq.com</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#171044] text-white flex items-center justify-center">
                  📍
                </div>
                <div>
                  <div className="text-[10px] text-[#171044]/60 uppercase">Location</div>
                  <div className="text-sm font-black">123 Sports Way, Active Arena</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column Form Card */}
          <div className="lg:col-span-7 bg-[#171044] p-8 rounded-[2rem] text-white space-y-4 shadow-xl">
            {contactSubmitted ? (
              <div className="py-8 text-center space-y-3">
                <div className="text-4xl">✅</div>
                <h3 className="text-2xl font-black font-display text-[#D8F500]">Message Received!</h3>
                <p className="text-xs text-white/80">Our academy coordinator will reach out to you within 24 hours.</p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setContactSubmitted(true);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-white/80 block mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#D8F500] transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-white/80 block mb-1">
                    Your Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#D8F500] transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-white/80 block mb-1">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Tell us how we can help..."
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#D8F500] transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-[#FF5A00] text-white font-display font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:bg-[#e04f00] transition-all duration-300 hover:scale-[1.02] active:scale-98 flex items-center justify-center gap-2"
                >
                  <span>Send Message</span> <Send size={14} />
                </button>
              </form>
            )}
          </div>
        </div>
      </motion.section>
    </div>
  );
};
