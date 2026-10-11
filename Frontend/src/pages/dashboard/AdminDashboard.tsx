import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  academyApi,
  type AdminDashboardOverview,
  type AthleteItem,
  type AnnouncementItem,
} from '../../services/academyApi';
import { CrossAccent, AthleticBadge } from '../../design-system';
import { SafeImage, getInitials, isValidImageUrl } from '../../components/SafeImage';
import {
  Users,
  Bell,
  Plus,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [overview, setOverview] = useState<AdminDashboardOverview | null>(null);
  const [athletes, setAthletes] = useState<AthleteItem[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [overviewData, athletesData, annData] = await Promise.all([
        academyApi.getDashboardOverview(),
        academyApi.listAthletes({ limit: 4 }),
        academyApi.getAnnouncements({ limit: 3 }),
      ]);
      if (overviewData && overviewData.role === 'Admin') {
        setOverview(overviewData);
      }
      if (athletesData) {
        setAthletes(athletesData.items);
      }
      if (annData) {
        setAnnouncements(annData.items);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load administrative overview.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-8 bg-[#F7F1E8] p-4 md:p-8 rounded-[2.5rem]">
      {/* Top Banner */}
      <div className="bg-[#171044] text-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AthleticBadge variant="lime">ADMIN CONTROL CENTER</AthleticBadge>
            <span className="text-xs text-white/70">Season 2026</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black font-display text-white uppercase tracking-tight">
            Academy Overview <CrossAccent color="orange" size="lg" />
          </h1>
          <p className="text-sm text-white/80 mt-1 max-w-xl">
            Real-time management of sports programs, rosters, coaching assignments, and training schedules.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="px-4 py-2.5 bg-white/10 text-white font-display font-black text-xs uppercase tracking-wider rounded-full hover:bg-white/20 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </button>
          <Link to="/dashboard/training">
            <button className="px-5 py-2.5 bg-[#D8F500] text-[#171044] font-display font-black text-xs uppercase tracking-wider rounded-full hover:bg-[#c4e000] transition-colors flex items-center gap-1.5 cursor-pointer">
              <Plus size={16} /> New Session
            </button>
          </Link>
          <Link to="/dashboard/athletes">
            <button className="px-5 py-2.5 bg-[#FF5A00] text-white font-display font-black text-xs uppercase tracking-wider rounded-full hover:bg-[#e04f00] transition-colors flex items-center gap-1.5 shadow-md cursor-pointer">
              <Plus size={16} /> Add Athlete
            </button>
          </Link>
        </div>
      </div>

      {/* Error banner if fetch fails */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-700 rounded-2xl flex items-center justify-between text-xs font-bold">
          <span>{error}</span>
          <button
            onClick={loadData}
            className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-[#171044]/10 shadow-md space-y-1">
          <div className="text-xs font-bold uppercase text-[#171044]/60">Total Users</div>
          <div className="text-4xl font-black font-display text-[#171044]">
            {overview?.userCounts?.total ?? 0}
          </div>
          <div className="text-xs font-bold text-emerald-600">
            {overview?.activeAthletes ?? 0} active athletes
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[#171044]/10 shadow-md space-y-1">
          <div className="text-xs font-bold uppercase text-[#171044]/60">Active Coaches</div>
          <div className="text-4xl font-black font-display text-[#FF5A00]">
            {overview?.coaches ?? 0}
          </div>
          <div className="text-xs font-bold text-[#171044]/60">Assigned staff</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[#171044]/10 shadow-md space-y-1">
          <div className="text-xs font-bold uppercase text-[#171044]/60">Active Teams</div>
          <div className="text-4xl font-black font-display text-[#171044]">
            {overview?.teams ?? 0}
          </div>
          <div className="text-xs font-bold text-[#171044]/60">
            {overview?.upcomingSessions ?? 0} upcoming sessions
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[#171044]/10 shadow-md space-y-1">
          <div className="text-xs font-bold uppercase text-[#171044]/60">Unread Inquiries</div>
          <div className="text-4xl font-black font-display text-[#4B2A9B]">
            {overview?.unreadContactMessages ?? 0}
          </div>
          <Link
            to="/dashboard/messages"
            className="text-xs font-bold text-[#FF5A00] hover:underline inline-block"
          >
            Review messages →
          </Link>
        </div>
      </div>

      {/* Main Dashboard Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Recent Athlete Roster */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-7 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black font-display text-[#171044] uppercase tracking-tight">
                Recent Registered Athletes <CrossAccent color="orange" size="sm" />
              </h2>
              <Link
                to="/dashboard/athletes"
                className="text-xs font-bold text-[#FF5A00] hover:underline flex items-center gap-1"
              >
                View All Athletes <ArrowRight size={14} />
              </Link>
            </div>

            {athletes.length === 0 ? (
              <div className="py-12 text-center space-y-3 bg-[#F7F1E8]/50 rounded-2xl border border-dashed border-[#171044]/15">
                <Users size={36} className="mx-auto text-[#171044]/30" />
                <h3 className="font-display font-bold text-base text-[#171044]">
                  No Athletes Registered
                </h3>
                <p className="text-xs text-[#171044]/60 max-w-sm mx-auto">
                  Roster assignments and athlete profiles will populate here once enrolled.
                </p>
                <Link to="/dashboard/athletes">
                  <button className="px-4 py-2 bg-[#FF5A00] text-white font-display font-bold text-xs uppercase tracking-wider rounded-full hover:bg-[#e04f00] transition-colors inline-flex items-center gap-1.5 mt-2 cursor-pointer">
                    <Plus size={14} /> Add Athlete
                  </button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {athletes.map((ath) => {
                  const athleteName = ath.user?.name || 'Athlete';
                  return (
                    <div
                      key={ath.id}
                      className="flex items-center justify-between p-4 bg-[#F7F1E8] rounded-2xl border border-[#171044]/5 hover:border-[#FF5A00] transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-[#171044] flex items-center justify-center text-white font-bold text-sm shrink-0 border-2 border-[#171044]">
                          {ath.user?.avatar && isValidImageUrl(ath.user.avatar) ? (
                            <SafeImage
                              src={ath.user.avatar}
                              alt={athleteName}
                              fallbackKind="person"
                              name={athleteName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{getInitials(athleteName, 'A')}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-bold font-display text-[#171044] text-base">
                            {athleteName}
                          </div>
                          <div className="text-xs text-[#171044]/70 font-medium">
                            {ath.sport?.name || 'General'} • {ath.team?.name || 'Unassigned'}
                            {ath.jerseyNumber ? ` (#${ath.jerseyNumber})` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full">
                          {ath.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Broadcast Announcements */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-7 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black font-display text-[#171044] uppercase tracking-tight">
                Announcements <CrossAccent color="orange" size="sm" />
              </h3>
              <Bell size={18} className="text-[#FF5A00]" />
            </div>

            {announcements.length === 0 ? (
              <div className="py-8 text-center space-y-2 bg-[#F7F1E8]/50 rounded-2xl border border-dashed border-[#171044]/15">
                <Bell size={28} className="mx-auto text-[#171044]/30" />
                <div className="text-xs font-bold text-[#171044]/60">No announcements posted</div>
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((ann) => (
                  <div key={ann.id} className="p-4 bg-[#F7F1E8] rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <AthleticBadge variant="orange" size="sm">
                        {ann.audience}
                      </AthleticBadge>
                      <span className="text-[10px] text-[#171044]/60 font-bold">
                        {new Date(ann.publishedAt || ann.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-[#171044]">{ann.title}</div>
                    <p className="text-xs text-[#171044]/70 leading-relaxed line-clamp-2">
                      {ann.body}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <Link to="/dashboard/announcements" className="block text-center pt-2">
              <button className="w-full py-3 bg-[#171044] text-white font-display font-black text-xs uppercase tracking-wider rounded-full hover:bg-[#281c66] transition-colors cursor-pointer">
                Manage Announcements
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
