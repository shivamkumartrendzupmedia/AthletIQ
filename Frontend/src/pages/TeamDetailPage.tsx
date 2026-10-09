import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CrossAccent, AthleticBadge } from '../design-system';
import { ArrowLeft, Users, Shield, Calendar } from 'lucide-react';
import { academyApi, type PublicTeamItem } from '../services/academyApi';
import { SafeImage } from '../components/SafeImage';

export const TeamDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [team, setTeam] = useState<PublicTeamItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchTeam = async () => {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const teamItem = await academyApi.getPublicTeamBySlug(id);
        if (teamItem) {
          setTeam(teamItem);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, [id]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="text-xl font-bold font-display text-[#171044]/60">
          Loading squad details...
        </div>
      </div>
    );
  }

  if (notFound || !team) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center space-y-6">
        <h1 className="text-4xl font-black font-display text-[#171044]">Squad Not Found</h1>
        <p className="text-sm text-[#171044]/70 max-w-md mx-auto">
          The team squad you requested is currently inactive or does not exist.
        </p>
        <Link to="/teams">
          <button className="px-6 py-2.5 rounded-full bg-[#171044] text-[#D8F500] font-display font-bold text-xs uppercase tracking-wider hover:bg-[#281c66] transition-colors">
            Back to All Squads
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-16 pb-20">
      {/* Back Link */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link
          to="/teams"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#171044] hover:text-[#FF5A00]"
        >
          <ArrowLeft size={16} /> Back to Squads
        </Link>
      </div>

      {/* Team Banner Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden h-80 border border-[#171044]/10 shadow-2xl">
          <SafeImage
            src={team.logo}
            alt={team.name}
            fallbackKind="team"
            name={team.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#171044] via-[#171044]/60 to-transparent p-8 md:p-12 flex flex-col justify-end">
            <div className="flex items-center gap-3 mb-2">
              <AthleticBadge variant="lime">{team.sport?.name || 'Sport'}</AthleticBadge>
              <AthleticBadge variant="orange">{team.ageGroup}</AthleticBadge>
              <AthleticBadge variant="dark">{team.athleteCount} Registered Athletes</AthleticBadge>
            </div>
            <h1 className="text-4xl md:text-6xl font-black font-display text-white">
              {team.name} <CrossAccent color="lime" size="lg" />
            </h1>
            <p className="text-white/80 font-medium mt-1">
              Head Coach: {team.coach?.name || 'Assigned Academy Coaching Staff'}
            </p>
          </div>
        </div>
      </section>

      {/* Squad Meta & Privacy Safe Info */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <Card variant="standard" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black font-display text-[#171044]">
                  Squad Overview <CrossAccent color="orange" size="sm" />
                </h2>
                <span className="text-xs text-[#171044]/60 font-bold">
                  Season {team.season || '2026'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 bg-[#F7F1E8] rounded-2xl space-y-1">
                  <span className="text-[#171044]/60 font-bold block uppercase">Sport Program</span>
                  <span className="text-base font-bold font-display text-[#171044]">
                    {team.sport?.name || 'Sport'}
                  </span>
                </div>
                <div className="p-4 bg-[#F7F1E8] rounded-2xl space-y-1">
                  <span className="text-[#171044]/60 font-bold block uppercase">Age Division</span>
                  <span className="text-base font-bold font-display text-[#FF5A00]">
                    {team.ageGroup} Bracket
                  </span>
                </div>
                <div className="p-4 bg-[#F7F1E8] rounded-2xl space-y-1">
                  <span className="text-[#171044]/60 font-bold block uppercase">Roster Size</span>
                  <span className="text-base font-bold font-display text-[#171044]">
                    {team.athleteCount} Athletes
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#171044]/10 space-y-2">
                <h4 className="text-sm font-bold font-display text-[#171044]">
                  Roster Privacy & Safety Notice
                </h4>
                <p className="text-xs text-[#171044]/70 leading-relaxed">
                  In accordance with youth sports safety and privacy standards, individual athlete roster identities and contact information are protected and accessible exclusively to authenticated academy staff and coaches.
                </p>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <Card variant="dark" className="space-y-6 sticky top-24">
              <h3 className="text-2xl font-black font-display text-white">
                Squad Details <CrossAccent color="lime" size="sm" />
              </h3>

              <div className="space-y-4 text-sm font-semibold">
                <div className="flex items-center gap-3 text-white/90">
                  <Shield size={18} className="text-[#D8F500]" />
                  <span>Division: {team.ageGroup}</span>
                </div>
                <div className="flex items-center gap-3 text-white/90">
                  <Calendar size={18} className="text-[#D8F500]" />
                  <span>Competition Season: {team.season || '2026'}</span>
                </div>
                <div className="flex items-center gap-3 text-white/90">
                  <Users size={18} className="text-[#D8F500]" />
                  <span>Head Coach: {team.coach?.name || 'Staff Coach'}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <Link to="/contact">
                  <button className="w-full py-3 rounded-full bg-[#FF5A00] text-white font-display font-extrabold text-sm uppercase tracking-wider hover:bg-[#e04f00] transition-colors">
                    Tryout Inquiry
                  </button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};
