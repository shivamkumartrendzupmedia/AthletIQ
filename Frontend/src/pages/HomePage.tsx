import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  SectionHeader,
  CrossAccent,
  AthleticBadge,
} from '../design-system';
import {
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Send,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';

// High-resolution local image assets (generic decorative brand assets)
import heroAthleteImg from '../assets/hero_athlete.jpg';
import trophySpotlightImg from '../assets/trophy_spotlight.jpg';
import {
  academyApi,
  type PublicOverviewResult,
  type AchievementItem,
  type PublicCoachItem,
} from '../services/academyApi';
import { SafeImage } from '../components/SafeImage';
import { SITE_CONFIG } from '../lib/siteConfig';

export const HomePage: React.FC = () => {
  const [publicOverview, setPublicOverview] = useState<PublicOverviewResult | null>(null);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [coaches, setCoaches] = useState<PublicCoachItem[]>([]);
  const [coachIndex, setCoachIndex] = useState(0);

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Fetch public overview
    academyApi
      .getPublicOverview()
      .then((data) => {
        if (data) setPublicOverview(data);
      })
      .catch((err) => console.error('Failed to load public overview:', err));

    // 2. Fetch public achievements (featured first, fallback to latest)
    academyApi
      .getPublicAchievements({ featured: true, limit: 6 })
      .then((res) => {
        if (res.items.length > 0) {
          setAchievements(res.items);
        } else {
          // If no featured, get latest 6 overall
          academyApi
            .getPublicAchievements({ limit: 6 })
            .then((allRes) => setAchievements(allRes.items))
            .catch(() => setAchievements([]));
        }
      })
      .catch(() => setAchievements([]));

    // 3. Fetch public coaches
    academyApi
      .getPublicCoaches({ limit: 12 })
      .then((res) => setCoaches(res.items))
      .catch(() => setCoaches([]));
  }, []);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitting(true);
    setContactError(null);
    try {
      await academyApi.submitContactMessage({
        name: contactName,
        email: contactEmail,
        message: contactMessage,
      });
      setContactSubmitted(true);
      setContactName('');
      setContactEmail('');
      setContactMessage('');
    } catch {
      setContactError('Failed to send message. Please verify your input and try again.');
    } finally {
      setContactSubmitting(false);
    }
  };

  const nextCoaches = () => {
    if (coaches.length === 0) return;
    setCoachIndex((prev) => (prev + 1) % coaches.length);
  };

  const prevCoaches = () => {
    if (coaches.length === 0) return;
    setCoachIndex((prev) => (prev - 1 + coaches.length) % coaches.length);
  };

  const visibleCoaches =
    coaches.length > 0
      ? [
          coaches[coachIndex % coaches.length],
          coaches[(coachIndex + 1) % coaches.length],
          coaches[(coachIndex + 2) % coaches.length],
        ].filter(Boolean)
      : [];

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
              <Link to="/tournaments">
                <button className="group px-6 py-4 bg-[#111111] text-white font-display font-bold text-sm md:text-base rounded-full flex items-center gap-2.5 shadow-md hover:bg-[#FF5A00] transition-all duration-300 hover:scale-105">
                  <span className="w-7 h-7 rounded-full bg-white text-[#111111] flex items-center justify-center text-xs font-black group-hover:scale-110 transition-transform">
                    🏆
                  </span>
                  <span>View Tournaments</span>
                </button>
              </Link>
            </div>
          </motion.div>

          {/* Center Column: Art-Directed Sports Campaign Composition */}
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
            <svg
              className="absolute -top-12 -right-8 w-64 h-64 pointer-events-none opacity-90 z-10"
              viewBox="0 0 200 200"
              fill="none"
            >
              <path
                d="M 20 180 C 60 100, 140 40, 180 20"
                stroke="#D8F500"
                strokeWidth="20"
                strokeLinecap="round"
              />
              <path
                d="M 40 190 C 80 120, 150 60, 190 30"
                stroke="#FF5A00"
                strokeWidth="14"
                strokeLinecap="round"
              />
            </svg>

            <svg
              className="absolute -bottom-10 -left-10 w-60 h-60 pointer-events-none opacity-85 z-10"
              viewBox="0 0 200 200"
              fill="none"
            >
              <path
                d="M 10 30 C 70 90, 130 150, 190 170"
                stroke="#FF5A00"
                strokeWidth="24"
                strokeLinecap="round"
              />
              <path
                d="M 30 10 C 90 70, 150 130, 180 190"
                stroke="#D8F500"
                strokeWidth="12"
                strokeLinecap="round"
              />
            </svg>

            {/* LAYER 3: Un-carded Dynamic Athlete Image */}
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

            {/* Floating Editorial Badge */}
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

          {/* Right Column: Hero Right-Side Journey */}
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
                <span className="text-[#FF5A00] font-black text-sm group-hover:rotate-45 transition-transform">
                  {step.icon}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ==================================================
          2. LIVE STATS & ANNOUNCEMENT BANNER (REAL DATA)
         ================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {publicOverview?.latestAnnouncements && publicOverview.latestAnnouncements.length > 0 && (
          <div className="mb-8 p-4 bg-[#171044] text-white rounded-2xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <AthleticBadge variant="lime">ANNOUNCEMENT</AthleticBadge>
              <span className="font-display font-black text-sm uppercase tracking-wide">
                {publicOverview.latestAnnouncements[0].title}
              </span>
            </div>
            <span className="text-xs text-white/60">
              {new Date(publicOverview.latestAnnouncements[0].publishedAt).toLocaleDateString()}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-6 md:p-8 rounded-[2rem] border border-[#171044]/10 shadow-lg text-center">
          <div className="space-y-1">
            <div className="text-3xl md:text-4xl font-black font-display text-[#171044]">
              {publicOverview ? publicOverview.activeAthletes : '-'}
            </div>
            <div className="text-xs font-extrabold uppercase text-[#171044]/60 tracking-wider">
              Enrolled Athletes
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl md:text-4xl font-black font-display text-[#FF5A00]">
              {publicOverview ? publicOverview.activeCoaches : '-'}
            </div>
            <div className="text-xs font-extrabold uppercase text-[#171044]/60 tracking-wider">
              Licensed Coaches
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl md:text-4xl font-black font-display text-[#171044]">
              {publicOverview ? publicOverview.activeTeams : '-'}
            </div>
            <div className="text-xs font-extrabold uppercase text-[#171044]/60 tracking-wider">
              Active Squads
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl md:text-4xl font-black font-display text-[#4B2A9B]">
              {publicOverview ? publicOverview.sportsCount : '-'}
            </div>
            <div className="text-xs font-extrabold uppercase text-[#171044]/60 tracking-wider">
              Sports Programs
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          3. OUR PROGRAMS SECTION
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              name: 'Football',
              icon: '⚽',
              bg: 'bg-[#171044]',
              btnBg: 'bg-[#D8F500] text-[#171044]',
              desc: 'Tactical periodization, position intelligence, and match exposure under accredited mentors.',
            },
            {
              name: 'Basketball',
              icon: '🏀',
              bg: 'bg-[#FF5A00]',
              btnBg: 'bg-white text-[#FF5A00]',
              desc: 'Precision shooting, court vision, vertical power development, and competitive league play.',
            },
            {
              name: 'Tennis',
              icon: '🎾',
              bg: 'bg-[#D8F500]',
              text: 'text-[#171044]',
              btnBg: 'bg-[#171044] text-white',
              desc: 'Serve mechanics, hard court strategy, footwork drills, and junior tournament preparation.',
            },
            {
              name: 'Swimming',
              icon: '🏊‍♂️',
              bg: 'bg-[#4B2A9B]',
              btnBg: 'bg-[#D8F500] text-[#171044]',
              desc: 'Hydrodynamic stroke perfection, flip-turn velocity, and endurance conditioning in Olympic pools.',
            },
            {
              name: 'Athletics',
              icon: '🏃‍♂️',
              bg: 'bg-gradient-to-br from-[#FF5A00] to-[#171044]',
              btnBg: 'bg-white text-[#171044]',
              desc: 'Sprint biomechanics, explosive starting block power, middle-distance pacing, and field events.',
            },
            {
              name: 'Volleyball',
              icon: '🏐',
              bg: 'bg-[#171044]',
              btnBg: 'bg-[#FF5A00] text-white',
              desc: 'Spike elevation, rotational defensive coverage, setting precision, and team communication.',
            },
          ].map((sport) => (
            <div
              key={sport.name}
              className={`${sport.bg} ${sport.text || 'text-white'} p-8 rounded-[2rem] shadow-xl flex flex-col justify-between group hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 relative overflow-hidden min-h-[300px]`}
            >
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center font-bold text-3xl group-hover:rotate-12 transition-transform">
                  {sport.icon}
                </div>
                <h3 className="text-3xl font-black font-display uppercase tracking-tight">
                  {sport.name}
                </h3>
                <p className="text-sm opacity-85 leading-relaxed font-medium">{sport.desc}</p>
              </div>
              <div className="pt-6">
                <Link to="/programs">
                  <button
                    className={`px-6 py-2.5 ${sport.btnBg} font-display font-black text-xs uppercase tracking-wider rounded-full flex items-center gap-2 transition-all hover:scale-105`}
                  >
                    <span>Explore</span> <ArrowRight size={14} />
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ==================================================
          4. DYNAMIC ACHIEVEMENTS SECTION (STEP 14B)
         ================================================== */}
      {achievements.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8"
        >
          <SectionHeader
            title="Achievements +"
            subtitle="Celebrating academy titles, championship trophies, and player progression milestones."
            crossColor="orange"
            action={
              <Link to="/achievements">
                <Button variant="outline" size="sm" iconRight={<ArrowRight size={16} />}>
                  View All Achievements
                </Button>
              </Link>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {achievements.slice(0, 6).map((ach) => (
              <div
                key={ach.id}
                className="bg-white rounded-[2rem] p-6 shadow-xl border border-[#171044]/10 flex flex-col justify-between group hover:-translate-y-1 hover:shadow-2xl transition-all duration-300"
              >
                <div className="space-y-4">
                  {/* Thumbnail */}
                  <div className="w-full h-44 rounded-2xl overflow-hidden bg-[#171044] text-[#D8F500] flex items-center justify-center relative border border-[#171044]/10">
                    <SafeImage
                      src={ach.imageUrl}
                      alt={ach.title}
                      name={ach.title}
                      fallbackKind="program"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {ach.featured && (
                      <div className="absolute top-3 right-3 bg-[#D8F500] text-[#171044] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow">
                        ★ Featured
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <AthleticBadge variant="purple">{ach.category}</AthleticBadge>
                      <span className="text-[11px] font-semibold text-[#171044]/60 flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(ach.achievedOn).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>

                    <h3 className="text-xl font-black font-display text-[#171044] group-hover:text-[#FF5A00] transition-colors leading-tight">
                      {ach.title}
                    </h3>

                    <p className="text-xs text-[#171044]/75 leading-relaxed font-medium line-clamp-2">
                      {ach.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ==================================================
          5. MEET OUR COACHES (LIVE API DATA)
         ================================================== */}
      {coaches.length > 0 && (
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
                Certified mentors dedicated to youth athletic development.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {coaches.length > 3 && (
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
              )}

              <Link to="/coaches">
                <Button variant="outline" size="sm">
                  View All Coaches
                </Button>
              </Link>
            </div>
          </div>

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
                    <div className="w-full h-80 rounded-[1.5rem] overflow-hidden border-2 border-[#171044]/10 group-hover:border-[#FF5A00] transition-colors relative bg-[#171044]">
                      <SafeImage
                        src={coach.photo}
                        alt={coach.name || coach.title}
                        name={coach.name || coach.title}
                        fallbackKind="coach"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {coach.sports && coach.sports.length > 0 && (
                        <div className="absolute top-4 right-4 bg-[#171044]/90 text-[#D8F500] text-xs font-black px-3.5 py-1.5 rounded-full border border-white/20">
                          {coach.sports[0].name}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 text-center pt-1">
                      <h3 className="font-display font-black text-2xl text-[#171044] group-hover:text-[#FF5A00] transition-colors">
                        {coach.name || coach.title}
                      </h3>
                      <p className="text-xs font-extrabold text-[#171044]/60 uppercase tracking-wider">
                        {coach.title}
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ==================================================
          6. TOURNAMENT SPOTLIGHT (REAL DATA)
         ================================================== */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8"
      >
        <SectionHeader
          title="Tournament Spotlight +"
          subtitle="Competitive regional and national championship events."
          crossColor="orange"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 bg-white p-8 rounded-[2.5rem] shadow-xl border border-[#171044]/10 space-y-6 relative overflow-hidden">
            <div className="rounded-2xl overflow-hidden h-52 border border-[#171044]/10">
              <img
                loading="lazy"
                decoding="async"
                src={trophySpotlightImg}
                alt="Trophy Spotlight"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-2">
              <AthleticBadge variant="orange">
                {publicOverview?.nextTournaments?.[0] ? 'UPCOMING TOURNAMENT' : 'FEATURED EVENT'}
              </AthleticBadge>
              <h3 className="text-3xl font-black font-display text-[#171044] uppercase">
                {publicOverview?.nextTournaments?.[0]?.name || 'Academy Championships'}
              </h3>
              <p className="text-xs text-[#171044]/70 font-medium leading-relaxed">
                {publicOverview?.nextTournaments?.[0]
                  ? `${publicOverview.nextTournaments[0].category} • ${publicOverview.nextTournaments[0].ageGroup} • Running from ${new Date(publicOverview.nextTournaments[0].startDate).toLocaleDateString()} to ${new Date(publicOverview.nextTournaments[0].endDate).toLocaleDateString()}`
                  : 'Teams competing across regional venues for the ultimate championship trophy.'}
              </p>
            </div>

            <Link to="/tournaments">
              <button className="w-full py-3.5 bg-[#FF5A00] text-white font-display font-black text-xs uppercase tracking-wider rounded-full shadow-lg hover:bg-[#e04f00] transition-colors">
                Browse Tournaments Hub
              </button>
            </Link>
          </div>

          <div className="lg:col-span-6 bg-[#171044] text-white p-8 rounded-[2.5rem] shadow-xl space-y-6">
            <h3 className="text-2xl font-black font-display uppercase tracking-tight text-[#D8F500]">
              Upcoming Tournaments
            </h3>
            <p className="text-sm text-white/80 leading-relaxed font-medium">
              Registered academy squads and affiliated club teams qualify for open registration tournaments throughout the active season.
            </p>

            <div className="space-y-3">
              {publicOverview?.nextTournaments && publicOverview.nextTournaments.length > 0 ? (
                publicOverview.nextTournaments.slice(0, 3).map((t) => (
                  <Link
                    key={t.id}
                    to={`/tournaments/${t.id}`}
                    className="block p-4 rounded-2xl bg-white/10 hover:bg-white/15 transition-all border border-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-display font-bold text-sm text-white">{t.name}</div>
                      <span className="text-xs text-[#D8F500] font-black">{t.category}</span>
                    </div>
                    <div className="text-[11px] text-white/60 mt-1 flex items-center gap-2">
                      <span>{t.ageGroup}</span>
                      <span>•</span>
                      <span>{new Date(t.startDate).toLocaleDateString()}</span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="p-6 text-center text-white/60 text-xs font-semibold">
                  Tournament schedule for upcoming term is being finalized.
                </div>
              )}
            </div>

            <Link to="/tournaments" className="block text-center pt-2">
              <span className="text-xs text-[#D8F500] font-bold hover:underline">
                View All Scheduled Events →
              </span>
            </Link>
          </div>
        </div>
      </motion.section>

      {/* ==================================================
          7. CONTACT US + SECTION (REAL API & SITE_CONFIG)
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
              Have questions about academy tryouts, sports programs, or tournament entry? Get in touch with our staff.
            </p>

            <div className="space-y-4 text-xs font-bold text-[#171044]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#171044] text-white flex items-center justify-center">
                  📞
                </div>
                <div>
                  <div className="text-[10px] text-[#171044]/60 uppercase">Phone</div>
                  <div className="text-sm font-black">{SITE_CONFIG.CONTACT_PHONE}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#171044] text-white flex items-center justify-center">
                  ✉️
                </div>
                <div>
                  <div className="text-[10px] text-[#171044]/60 uppercase">Email</div>
                  <div className="text-sm font-black">{SITE_CONFIG.CONTACT_EMAIL}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#171044] text-white flex items-center justify-center">
                  📍
                </div>
                <div>
                  <div className="text-[10px] text-[#171044]/60 uppercase">Location</div>
                  <div className="text-sm font-black">{SITE_CONFIG.CONTACT_ADDRESS}</div>
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
                <button
                  onClick={() => setContactSubmitted(false)}
                  className="px-6 py-2.5 bg-white text-[#171044] font-display font-bold text-xs uppercase rounded-full mt-2"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                {contactError && (
                  <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{contactError}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-white/80 block mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
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
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
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
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#D8F500] transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={contactSubmitting}
                  className="w-full py-4 bg-[#FF5A00] text-white font-display font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:bg-[#e04f00] transition-all duration-300 hover:scale-[1.02] active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>{contactSubmitting ? 'Sending...' : 'Send Message'}</span> <Send size={14} />
                </button>
              </form>
            )}
          </div>
        </div>
      </motion.section>
    </div>
  );
};
