import React, { useState } from 'react';
import { Card, CrossAccent, AthleticBadge, Button } from '../../design-system';
import { Users, Plus, Search, Filter, CheckCircle2, AlertCircle } from 'lucide-react';
import { mockAthletes, type AcademyAthlete } from '../../data/academyData';

export const AthleteManagementPage: React.FC = () => {
  const [athletes, setAthletes] = useState<AcademyAthlete[]>(mockAthletes);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAthlete, setNewAthlete] = useState({
    name: '',
    sport: 'Football',
    ageGroup: 'U16',
    position: 'Forward',
    teamName: 'U16 Strikers',
  });

  const handleAddAthlete = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAthlete.name) {
      const created: AcademyAthlete = {
        id: `ath-${Date.now()}`,
        name: newAthlete.name,
        age: 16,
        ageGroup: newAthlete.ageGroup,
        sport: newAthlete.sport,
        teamId: 'u16-strikers',
        teamName: newAthlete.teamName,
        position: newAthlete.position,
        jerseyNumber: Math.floor(Math.random() * 90) + 10,
        ovr: 82,
        attendanceRate: '100%',
        status: 'Active',
        avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=400&auto=format&fit=crop',
        medicalClearance: true,
        parentContact: '+1 506 555-0199',
      };
      setAthletes([created, ...athletes]);
      setShowAddModal(false);
      setNewAthlete({ name: '', sport: 'Football', ageGroup: 'U16', position: 'Forward', teamName: 'U16 Strikers' });
    }
  };

  const filtered = athletes.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.sport.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <AthleticBadge variant="orange">ATHLETE ROSTER MANAGEMENT</AthleticBadge>
          <h1 className="text-3xl md:text-4xl font-black font-display text-[#171044] mt-2">
            ACADEMY ATHLETES ({athletes.length}) <CrossAccent color="orange" size="md" />
          </h1>
        </div>

        <Button variant="primary" iconLeft={<Plus size={18} />} onClick={() => setShowAddModal(true)}>
          Add New Athlete
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <Card variant="standard" className="p-4 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-4 top-3 text-[#171044]/40" />
          <input
            type="text"
            placeholder="Search athletes by name or sport..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-[#F7F1E8] border border-[#171044]/10 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
          />
        </div>
      </Card>

      {/* Athlete Table Card */}
      <Card variant="standard" className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#171044] text-white text-xs font-extrabold uppercase font-display border-b border-white/10">
                <th className="p-4 pl-6">Athlete</th>
                <th className="p-4">Sport & Team</th>
                <th className="p-4">Age Group</th>
                <th className="p-4">Rating</th>
                <th className="p-4">Medical Clearance</th>
                <th className="p-4 pr-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171044]/10 text-sm font-semibold">
              {filtered.map((ath) => (
                <tr key={ath.id} className="hover:bg-[#F7F1E8]/50 transition-colors">
                  <td className="p-4 pl-6 flex items-center gap-3">
                    <img src={ath.avatar} alt={ath.name} className="w-10 h-10 rounded-full object-cover border border-[#171044]" />
                    <div>
                      <div className="font-bold font-display text-[#171044]">{ath.name}</div>
                      <div className="text-xs text-[#171044]/60">#{ath.jerseyNumber} • {ath.position}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-[#171044]">{ath.sport}</div>
                    <div className="text-xs text-[#FF5A00] font-semibold">{ath.teamName}</div>
                  </td>
                  <td className="p-4">
                    <AthleticBadge variant="purple" size="sm">{ath.ageGroup}</AthleticBadge>
                  </td>
                  <td className="p-4">
                    <span className="font-black text-[#171044] font-display text-base">OVR {ath.ovr}</span>
                  </td>
                  <td className="p-4">
                    {ath.medicalClearance ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full">
                        <CheckCircle2 size={14} /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-500/10 px-3 py-1 rounded-full">
                        <AlertCircle size={14} /> Pending
                      </span>
                    )}
                  </td>
                  <td className="p-4 pr-6">
                    <span className="text-xs font-extrabold bg-[#171044] text-[#D8F500] px-3 py-1 rounded-full">
                      {ath.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Athlete Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#171044] text-white p-8 rounded-3xl max-w-md w-full space-y-6 border border-white/20 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black font-display text-white">Add New Athlete <CrossAccent color="lime" size="sm" /></h3>
              <button onClick={() => setShowAddModal(false)} className="text-white/60 hover:text-white text-xl">✕</button>
            </div>

            <form onSubmit={handleAddAthlete} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/80 uppercase mb-1">Athlete Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jordan Smith"
                  value={newAthlete.name}
                  onChange={(e) => setNewAthlete({ ...newAthlete, name: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#D8F500]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 uppercase mb-1">Sport</label>
                <select
                  value={newAthlete.sport}
                  onChange={(e) => setNewAthlete({ ...newAthlete, sport: e.target.value })}
                  className="w-full bg-[#171044] border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#D8F500]"
                >
                  <option value="Football">Football / Soccer</option>
                  <option value="Basketball">Basketball</option>
                  <option value="Tennis">Tennis</option>
                  <option value="Swimming">Swimming</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 uppercase mb-1">Age Group</label>
                <select
                  value={newAthlete.ageGroup}
                  onChange={(e) => setNewAthlete({ ...newAthlete, ageGroup: e.target.value })}
                  className="w-full bg-[#171044] border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#D8F500]"
                >
                  <option value="U12">U12</option>
                  <option value="U14">U14</option>
                  <option value="U16">U16</option>
                  <option value="U18">U18</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit" variant="lime">Create Athlete Profile</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
