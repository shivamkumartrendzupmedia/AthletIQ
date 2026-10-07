import React from 'react';
import { Link } from 'react-router-dom';
import { Card, SectionHeader, CrossAccent, AthleticBadge } from '../../design-system';
import { Users, UserCheck, Shield, Calendar, Bell, Plus, ArrowRight, CheckCircle2 } from 'lucide-react';
import { mockAthletes, mockTrainingSessions, mockAnnouncements } from '../../data/academyData';

export const AdminDashboard: React.FC = () => {
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
          <Link to="/dashboard/training">
            <button className="px-5 py-2.5 bg-[#D8F500] text-[#171044] font-display font-black text-xs uppercase tracking-wider rounded-full hover:bg-[#c4e000] transition-colors flex items-center gap-1.5">
              <Plus size={16} /> New Session
            </button>
          </Link>
          <Link to="/dashboard/athletes">
            <button className="px-5 py-2.5 bg-[#FF5A00] text-white font-display font-black text-xs uppercase tracking-wider rounded-full hover:bg-[#e04f00] transition-colors flex items-center gap-1.5 shadow-md">
              <Plus size={16} /> Add Athlete
            </button>
          </Link>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-[#171044]/10 shadow-md space-y-1">
          <div className="text-xs font-bold uppercase text-[#171044]/60">Total Athletes</div>
          <div className="text-4xl font-black font-display text-[#171044]">142</div>
          <div className="text-xs font-bold text-emerald-600">+14% this month</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[#171044]/10 shadow-md space-y-1">
          <div className="text-xs font-bold uppercase text-[#171044]/60">Active Coaches</div>
          <div className="text-4xl font-black font-display text-[#FF5A00]">12</div>
          <div className="text-xs font-bold text-[#171044]/60">Certified Pro</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[#171044]/10 shadow-md space-y-1">
          <div className="text-xs font-bold uppercase text-[#171044]/60">Academy Teams</div>
          <div className="text-4xl font-black font-display text-[#171044]">08</div>
          <div className="text-xs font-bold text-[#171044]/60">6 Sports</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[#171044]/10 shadow-md space-y-1">
          <div className="text-xs font-bold uppercase text-[#171044]/60">Attendance Rate</div>
          <div className="text-4xl font-black font-display text-[#4B2A9B]">94.2%</div>
          <div className="text-xs font-bold text-emerald-600">+3.8% vs last month</div>
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
              <Link to="/dashboard/athletes" className="text-xs font-bold text-[#FF5A00] hover:underline flex items-center gap-1">
                View All Athletes <ArrowRight size={14} />
              </Link>
            </div>

            <div className="space-y-3">
              {mockAthletes.map((ath) => (
                <div
                  key={ath.id}
                  className="flex items-center justify-between p-4 bg-[#F7F1E8] rounded-2xl border border-[#171044]/5 hover:border-[#FF5A00] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <img src={ath.avatar} alt={ath.name} className="w-12 h-12 rounded-full object-cover border-2 border-[#171044]" />
                    <div>
                      <div className="font-bold font-display text-[#171044] text-base">{ath.name}</div>
                      <div className="text-xs text-[#171044]/70 font-medium">{ath.sport} • {ath.teamName} ({ath.position})</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <AthleticBadge variant="purple">OVR {ath.ovr}</AthleticBadge>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full">
                      {ath.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Training Sessions Card */}
          <div className="bg-[#171044] text-white p-7 rounded-[2.5rem] shadow-xl space-y-6 border border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black font-display text-white uppercase tracking-tight">
                Today's Training Sessions <CrossAccent color="lime" size="sm" />
              </h2>
              <Link to="/dashboard/training" className="text-xs font-bold text-[#D8F500] hover:underline">
                Full Schedule →
              </Link>
            </div>

            <div className="space-y-3">
              {mockTrainingSessions.map((session) => (
                <div key={session.id} className="p-4 bg-white/10 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <AthleticBadge variant="lime" size="sm">{session.teamName}</AthleticBadge>
                      <span className="text-xs text-white/70 font-semibold">{session.time}</span>
                    </div>
                    <div className="font-bold text-white text-base">{session.title}</div>
                    <div className="text-xs text-white/60">Pitch: {session.pitchLocation} • Coach {session.coachName}</div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-[#D8F500]">
                      {session.attendanceCount.present} / {session.attendanceCount.total} Attending
                    </div>
                    <span className="text-[10px] text-white/60 uppercase font-semibold">Attendance Logged</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Broadcast Announcements */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-7 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black font-display text-[#171044] uppercase tracking-tight">
                Broadcast Announcements <CrossAccent color="orange" size="sm" />
              </h3>
              <Bell size={18} className="text-[#FF5A00]" />
            </div>

            <div className="space-y-4">
              {mockAnnouncements.map((ann) => (
                <div key={ann.id} className="p-4 bg-[#F7F1E8] rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <AthleticBadge variant="orange" size="sm">{ann.audience}</AthleticBadge>
                    <span className="text-[10px] text-[#171044]/60 font-bold">{ann.date}</span>
                  </div>
                  <div className="font-bold text-sm text-[#171044]">{ann.title}</div>
                  <p className="text-xs text-[#171044]/70 leading-relaxed">{ann.content}</p>
                </div>
              ))}
            </div>

            <Link to="/dashboard/announcements" className="block text-center pt-2">
              <button className="w-full py-3 bg-[#171044] text-white font-display font-black text-xs uppercase tracking-wider rounded-full hover:bg-[#281c66] transition-colors">
                Manage Announcements
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
