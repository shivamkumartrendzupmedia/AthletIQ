import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  tournamentService,
  type FullTournamentData,
  type RegisteredTeam,
} from '../../services/tournamentService';
import { Card, CrossAccent, AthleticBadge, Button } from '../../design-system';
import {
  Trophy,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Calendar,
  MapPin,
  Users,
  Shield,
  Clock,
  Eye,
} from 'lucide-react';

export const TournamentManagementPage: React.FC = () => {
  const [tournaments, setTournaments] = useState<FullTournamentData[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<FullTournamentData | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Rejection modal state
  const [rejectingTeam, setRejectingTeam] = useState<RegisteredTeam | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // Create form state
  const [name, setName] = useState<string>('');
  const [sport, setSport] = useState<string>('Football');
  const [category, setCategory] = useState<FullTournamentData['category']>('Academy Championship');
  const [ageGroup, setAgeGroup] = useState<FullTournamentData['ageGroup']>('U16');
  const [format, setFormat] = useState<FullTournamentData['format']>('Group Stage + Knockout');
  const [startDate, setStartDate] = useState<string>('2026-11-01');
  const [endDate, setEndDate] = useState<string>('2026-11-07');
  const [regDeadline, setRegDeadline] = useState<string>('2026-10-20');
  const [venue, setVenue] = useState<string>('AthletiQ Main Sports Complex');
  const [description, setDescription] = useState<string>('');
  const [rulesText, setRulesText] = useState<string>('');

  const loadData = async () => {
    const list = await tournamentService.getTournaments();
    setTournaments(list);
    if (!selectedTournament && list.length > 0) {
      setSelectedTournament(list[0]);
    } else if (selectedTournament) {
      const updated = list.find((t) => t.id === selectedTournament.id);
      if (updated) setSelectedTournament(updated);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = tournamentService.subscribe(loadData);
    return () => unsub();
  }, []);

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const created = await tournamentService.createTournament({
      name,
      sport,
      category,
      ageGroup,
      format,
      startDate,
      endDate,
      registrationDeadline: regDeadline,
      status: 'Upcoming',
      venue,
      description: description || 'Official AthletiQ sanctioned academy tournament.',
      bannerImage: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1200&auto=format&fit=crop',
      rulesText: rulesText || 'Standard tournament rules apply.',
    });

    setSelectedTournament(created);
    setShowCreateModal(false);
    setName('');
  };

  const handleApproveTeam = async (teamId: string) => {
    if (!selectedTournament) return;
    await tournamentService.updateTeamStatus(selectedTournament.id, teamId, 'Approved');
  };

  const handleConfirmRejectTeam = async () => {
    if (!selectedTournament || !rejectingTeam) return;
    await tournamentService.updateTeamStatus(
      selectedTournament.id,
      rejectingTeam.id,
      'Rejected',
      rejectionReason || 'Documentation or eligibility verification failed.'
    );
    setRejectingTeam(null);
    setRejectionReason('');
  };

  return (
    <div className="space-y-8 bg-[#F7F1E8] p-4 md:p-8 rounded-[2.5rem]">
      {/* Top Banner */}
      <div className="bg-[#171044] text-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-white/10">
        <div>
          <AthleticBadge variant="lime">ADMIN CONTROL CENTER</AthleticBadge>
          <h1 className="text-3xl md:text-5xl font-black font-display text-white uppercase tracking-tight mt-2">
            Tournament Management <CrossAccent color="lime" size="lg" />
          </h1>
          <p className="text-sm text-white/80 mt-1">
            Create, verify rosters, approve applications, and manage match schedules.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-[#FF5A00] text-white font-display font-black text-xs uppercase tracking-wider rounded-full hover:bg-[#e04f00] transition-colors flex items-center gap-2 shadow-lg"
        >
          <Plus size={16} /> Create New Tournament
        </button>
      </div>

      {/* Tournament Selector Bar */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
        {tournaments.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedTournament(t)}
            className={`px-5 py-3 rounded-2xl font-display font-black text-xs uppercase tracking-wider whitespace-nowrap transition-all ${
              selectedTournament?.id === t.id
                ? 'bg-[#171044] text-[#D8F500] shadow-md'
                : 'bg-white text-[#171044] hover:bg-[#171044]/10'
            }`}
          >
            {t.name} ({t.sport})
          </button>
        ))}
      </div>

      {selectedTournament && (
        <div className="space-y-8">
          {/* Selected Tournament Overview */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <AthleticBadge variant="orange">{selectedTournament.sport}</AthleticBadge>
                  <AthleticBadge variant="dark">{selectedTournament.ageGroup}</AthleticBadge>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
                    {selectedTournament.status}
                  </span>
                </div>
                <h2 className="text-3xl font-black font-display text-[#171044]">{selectedTournament.name}</h2>
                <p className="text-xs text-[#171044]/70 mt-1">{selectedTournament.venue}</p>
              </div>

              <div className="text-right">
                <div className="text-xs text-[#171044]/60 font-bold">Registration Deadline</div>
                <div className="text-sm font-black text-[#FF5A00]">{selectedTournament.registrationDeadline}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-4 bg-[#F7F1E8] rounded-2xl">
                <div className="text-[10px] font-extrabold uppercase text-[#171044]/60">Category</div>
                <div className="text-sm font-black text-[#171044]">{selectedTournament.category}</div>
              </div>
              <div className="p-4 bg-[#F7F1E8] rounded-2xl">
                <div className="text-[10px] font-extrabold uppercase text-[#171044]/60">Format</div>
                <div className="text-sm font-black text-[#171044]">{selectedTournament.format}</div>
              </div>
              <div className="p-4 bg-[#F7F1E8] rounded-2xl">
                <div className="text-[10px] font-extrabold uppercase text-[#171044]/60">Total Teams</div>
                <div className="text-sm font-black text-[#FF5A00]">{selectedTournament.teams.length} Teams</div>
              </div>
              <div className="p-4 bg-[#F7F1E8] rounded-2xl">
                <div className="text-[10px] font-extrabold uppercase text-[#171044]/60">Dates</div>
                <div className="text-sm font-black text-[#171044]">{selectedTournament.datesFormatted}</div>
              </div>
            </div>
          </div>

          {/* Team Approvals & Roster Verification Workflow */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black font-display text-[#171044] uppercase tracking-tight">
                Team Registration Approvals & Roster Verification <CrossAccent color="orange" size="sm" />
              </h3>
              <span className="text-xs font-bold text-[#171044]/60">
                {selectedTournament.teams.filter((t) => t.status === 'Pending Review').length} Pending Approval
              </span>
            </div>

            <div className="space-y-4">
              {selectedTournament.teams.length === 0 ? (
                <div className="p-8 text-center text-xs font-bold text-[#171044]/60 bg-[#F7F1E8] rounded-2xl">
                  No teams have registered for this tournament yet.
                </div>
              ) : (
                selectedTournament.teams.map((t) => (
                  <div key={t.id} className="p-6 bg-[#F7F1E8] rounded-3xl border border-[#171044]/10 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{t.logo}</span>
                        <div>
                          <h4 className="font-black font-display text-lg text-[#171044]">{t.name}</h4>
                          <div className="text-xs text-[#171044]/70">
                            Coach: {t.coachName} • Email: {t.contactEmail} • Applied: {t.appliedDate}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black ${
                            t.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : t.status === 'Rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {t.status}
                        </span>

                        {t.status === 'Pending Review' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveTeam(t.id)}
                              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 transition-colors flex items-center gap-1"
                            >
                              <CheckCircle2 size={14} /> Approve
                            </button>
                            <button
                              onClick={() => setRejectingTeam(t)}
                              className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black hover:bg-red-700 transition-colors flex items-center gap-1"
                            >
                              <XCircle size={14} /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Roster Submission Details */}
                    <div className="space-y-2 pt-2 border-t border-[#171044]/10">
                      <div className="text-xs font-black uppercase text-[#171044]/60">Submitted Player Roster</div>
                      <div className="flex flex-wrap gap-2">
                        {t.roster.map((p) => (
                          <div key={p.id} className="p-2.5 bg-white rounded-xl text-xs font-bold text-[#171044] flex items-center gap-2 border">
                            <span>#{p.jerseyNumber} {p.name} ({p.position})</span>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
                              {p.verificationStatus}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {t.rejectionReason && (
                      <div className="text-xs text-red-700 font-bold bg-red-50 p-3 rounded-xl">
                        Rejection Reason: {t.rejectionReason}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE TOURNAMENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-[#171044]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-black font-display text-[#171044] uppercase tracking-tight">
              Create New Tournament <CrossAccent color="orange" size="sm" />
            </h3>

            <form onSubmit={handleCreateTournament} className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase text-[#171044]/60 block mb-1">Tournament Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. AthletiQ Winter Cup 2026"
                  className="w-full p-3.5 bg-[#F7F1E8] rounded-2xl border border-[#171044]/10 text-sm font-bold text-[#171044]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase text-[#171044]/60 block mb-1">Sport</label>
                  <select value={sport} onChange={(e) => setSport(e.target.value)} className="w-full p-3.5 bg-[#F7F1E8] rounded-2xl text-xs font-bold text-[#171044]">
                    <option value="Football">Football</option>
                    <option value="Basketball">Basketball</option>
                    <option value="Tennis">Tennis</option>
                    <option value="Swimming">Swimming</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-[#171044]/60 block mb-1">Age Group</label>
                  <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value as any)} className="w-full p-3.5 bg-[#F7F1E8] rounded-2xl text-xs font-bold text-[#171044]">
                    <option value="U14">U14 Junior</option>
                    <option value="U16">U16 Strikers</option>
                    <option value="U18">U18 Youth</option>
                    <option value="Senior Elite">Senior Elite</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase text-[#171044]/60 block mb-1">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="w-full p-3.5 bg-[#F7F1E8] rounded-2xl text-xs font-bold text-[#171044]">
                    <option value="Academy Championship">Academy Championship</option>
                    <option value="Invitational">Invitational</option>
                    <option value="Open League">Open League</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-[#171044]/60 block mb-1">Format</label>
                  <select value={format} onChange={(e) => setFormat(e.target.value as any)} className="w-full p-3.5 bg-[#F7F1E8] rounded-2xl text-xs font-bold text-[#171044]">
                    <option value="Group Stage + Knockout">Group Stage + Knockout</option>
                    <option value="Single Elimination">Single Elimination</option>
                    <option value="Round Robin">Round Robin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase text-[#171044]/60 block mb-1">Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-3.5 bg-[#F7F1E8] rounded-2xl text-xs font-bold text-[#171044]" />
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-[#171044]/60 block mb-1">Reg. Deadline</label>
                  <input type="date" value={regDeadline} onChange={(e) => setRegDeadline(e.target.value)} className="w-full p-3.5 bg-[#F7F1E8] rounded-2xl text-xs font-bold text-[#171044]" />
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase text-[#171044]/60 block mb-1">Venue Location</label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g. Moncton Sports Complex..."
                  className="w-full p-3.5 bg-[#F7F1E8] rounded-2xl text-xs font-bold text-[#171044]"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase text-[#171044]/60 block mb-1">Rules & Regulations</label>
                <textarea
                  rows={3}
                  value={rulesText}
                  onChange={(e) => setRulesText(e.target.value)}
                  placeholder="Enter official tournament rules..."
                  className="w-full p-3.5 bg-[#F7F1E8] rounded-2xl text-xs font-bold text-[#171044]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowCreateModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" className="flex-1">
                  Publish Tournament
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectingTeam && (
        <div className="fixed inset-0 z-50 bg-[#171044]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-xl font-black font-display text-red-600 uppercase">Reject Application: {rejectingTeam.name}</h3>
            <div>
              <label className="text-xs font-black uppercase text-[#171044]/60 block mb-1">Reason for Rejection</label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="State reason (e.g. ineligible player age, missing medical waivers)..."
                className="w-full p-3 bg-[#F7F1E8] rounded-2xl text-xs font-bold text-[#171044]"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={() => setRejectingTeam(null)} className="flex-1">
                Cancel
              </Button>
              <button
                onClick={handleConfirmRejectTeam}
                className="flex-1 py-2 bg-red-600 text-white rounded-full font-display font-black text-xs uppercase"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
