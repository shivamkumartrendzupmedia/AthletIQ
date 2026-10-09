import React, { useState, useEffect, useCallback, useId } from 'react';
import { Card, CrossAccent, AthleticBadge, Button } from '../../design-system';
import { Trash2, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { SafeImage } from '../../components/SafeImage';
import {
  academyApi,
  type AthleteItem,
  type TeamItem,
} from '../../services/academyApi';
import { ApiClientError } from '../../lib/apiClient';

export const RosterManagementPage: React.FC = () => {
  const [unassignedAthletes, setUnassignedAthletes] = useState<AthleteItem[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [teamRoster, setTeamRoster] = useState<AthleteItem[]>([]);

  const [loadingUnassigned, setLoadingUnassigned] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Assign modal state
  const [assignTarget, setAssignTarget] = useState<AthleteItem | null>(null);
  const [assignTeamId, setAssignTeamId] = useState<string>('');
  const [assignJerseyNumber, setAssignJerseyNumber] = useState<string>('');
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // Accessible unique IDs
  const assignTeamSelectId = useId();
  const assignJerseyInputId = useId();

  const fetchUnassigned = useCallback(async () => {
    setLoadingUnassigned(true);
    try {
      const res = await academyApi.listAthletes({ unassigned: true, limit: 100 });
      setUnassignedAthletes(res.items);
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to load unassigned athletes.';
      setErrorBanner(msg);
    } finally {
      setLoadingUnassigned(false);
    }
  }, []);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await academyApi.listTeams({ limit: 100 });
      setTeams(res.items);
      if (res.items.length > 0) {
        setSelectedTeamId((prev) => prev || res.items[0].id);
      }
    } catch {
      // Non-fatal
    }
  }, []);

  const fetchTeamRoster = useCallback(async (teamId: string) => {
    if (!teamId) return;
    setLoadingRoster(true);
    try {
      const res = await academyApi.getTeamRoster(teamId);
      setTeamRoster(res.items);
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to load squad roster.';
      setErrorBanner(msg);
    } finally {
      setLoadingRoster(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUnassigned();
      fetchTeams();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchUnassigned, fetchTeams]);

  useEffect(() => {
    if (selectedTeamId) {
      const timer = setTimeout(() => {
        fetchTeamRoster(selectedTeamId);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectedTeamId, fetchTeamRoster]);

  const openAssignModal = (ath: AthleteItem) => {
    setAssignTarget(ath);
    setAssignTeamId(selectedTeamId || teams[0]?.id || '');
    setAssignJerseyNumber(ath.jerseyNumber ? String(ath.jerseyNumber) : '');
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTarget || !assignTeamId) return;
    setSubmittingAssign(true);
    setErrorBanner(null);
    try {
      await academyApi.assignAthleteTeam(
        assignTarget.id,
        assignTeamId,
        assignJerseyNumber ? Number(assignJerseyNumber) : undefined
      );

      setAssignTarget(null);
      setSuccessBanner(
        `Athlete ${assignTarget.user?.name || 'assigned'} placed on squad roster.`
      );
      fetchUnassigned();
      if (selectedTeamId === assignTeamId) {
        fetchTeamRoster(selectedTeamId);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : 'Failed to assign athlete to squad. Jersey number may already be taken.';
      setErrorBanner(msg);
    } finally {
      setSubmittingAssign(false);
    }
  };

  const handleUnassignAthlete = async (ath: AthleteItem) => {
    const athleteName = ath.user?.name || `Athlete #${ath.jerseyNumber || ath.id.slice(-4)}`;
    const confirmed = window.confirm(
      `Remove athlete "${athleteName}" from current squad roster?`
    );
    if (!confirmed) return;
    setErrorBanner(null);
    try {
      await academyApi.unassignAthleteTeam(ath.id);
      setSuccessBanner(`Athlete "${athleteName}" removed from squad.`);
      if (selectedTeamId) {
        fetchTeamRoster(selectedTeamId);
      }
      fetchUnassigned();
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to unassign athlete.';
      setErrorBanner(msg);
    }
  };

  const activeSelectedTeam = teams.find((t) => t.id === selectedTeamId);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <AthleticBadge variant="orange">SQUAD ROSTER ASSIGNMENT</AthleticBadge>
          <h1 className="text-3xl md:text-4xl font-black font-display text-[#171044] mt-2">
            ROSTER & ATHLETE ASSIGNMENTS <CrossAccent color="orange" size="md" />
          </h1>
        </div>
      </div>

      {/* Notifications */}
      {errorBanner && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-center justify-between text-red-800 text-sm font-semibold">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-600 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button onClick={() => setErrorBanner(null)} className="text-red-600 hover:text-red-900">
            <X size={16} />
          </button>
        </div>
      )}

      {successBanner && (
        <div className="p-4 bg-green-50 border-l-4 border-[#D8F500] rounded-r-xl flex items-center justify-between text-green-900 text-sm font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-green-600 hover:text-green-900">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Unassigned / Trial Athletes */}
        <div className="lg:col-span-6 space-y-4">
          <Card variant="standard" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold font-display text-[#171044]">
                  Unassigned Athletes ({(unassignedAthletes || []).length}){' '}
                  <CrossAccent color="orange" size="sm" />
                </h3>
                <p className="text-xs text-[#171044]/70 mt-0.5">
                  Athletes awaiting team placement or seasonal squad assignment.
                </p>
              </div>
            </div>

            {loadingUnassigned ? (
              <div className="py-12 text-center text-xs font-bold text-[#171044]/60">
                Loading unassigned athletes...
              </div>
            ) : (unassignedAthletes || []).length === 0 ? (
              <div className="p-8 text-center bg-[#F7F1E8] rounded-2xl text-xs font-bold text-[#171044]/60">
                All active academy athletes are currently assigned to teams.
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {(unassignedAthletes || []).map((a) => {
                  const athleteName = a.user?.name || 'Unlinked Athlete';
                  const sportName =
                    typeof a.sport === 'object' && a.sport ? a.sport.name : 'Sport';

                  return (
                    <div
                      key={a.id}
                      className="p-3 bg-[#F7F1E8] rounded-xl flex items-center justify-between hover:bg-[#eae3d5] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <SafeImage
                          src={undefined}
                          fallbackKind="person"
                          name={athleteName}
                          className="w-10 h-10 rounded-full shrink-0"
                        />
                        <div>
                          <div className="font-bold text-xs text-[#171044]">{athleteName}</div>
                          <div className="text-[10px] text-[#171044]/60 font-semibold">
                            {sportName} • {a.position || 'No Position'} • Age {a.age ?? '—'}
                          </div>
                        </div>
                      </div>

                      <Button variant="outline" size="sm" onClick={() => openAssignModal(a)}>
                        Assign to Team
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Active Team Rosters */}
        <div className="lg:col-span-6 space-y-4">
          <Card variant="dark" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold font-display text-white">
                  Active Squad Roster <CrossAccent color="lime" size="sm" />
                </h3>
                <p className="text-xs text-white/70 mt-0.5">
                  Select a team to view and manage its current registered athletes.
                </p>
              </div>

              {(teams || []).length > 0 && (
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-xl text-xs font-bold text-white outline-none"
                >
                  {(teams || []).map((t) => (
                    <option key={t.id} value={t.id} className="text-[#171044]">
                      {t.name} ({t.ageGroup})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {activeSelectedTeam && (
              <div className="p-4 bg-white/10 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-sm font-bold text-white">
                  <span>{activeSelectedTeam.name}</span>
                  <span className="text-[#D8F500]">{(teamRoster || []).length} Players</span>
                </div>
                <div className="text-xs text-white/70">
                  Coach: {activeSelectedTeam.coach?.user?.name || 'Unassigned'} • Season:{' '}
                  {activeSelectedTeam.season || '2026'}
                </div>
              </div>
            )}

            {loadingRoster ? (
              <div className="py-12 text-center text-xs font-bold text-white/60">
                Loading roster...
              </div>
            ) : (teamRoster || []).length === 0 ? (
              <div className="p-8 text-center bg-white/5 rounded-2xl text-xs font-bold text-white/60">
                No athletes currently assigned to this squad roster.
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {(teamRoster || []).map((ath) => {
                  const athleteName = ath.user?.name || 'Athlete';
                  return (
                    <div
                      key={ath.id}
                      className="p-3 bg-white/10 rounded-xl flex items-center justify-between hover:bg-white/15 transition-colors text-white"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-[#D8F500] text-[#171044] font-black text-xs flex items-center justify-center font-display shrink-0">
                          #{ath.jerseyNumber ?? '—'}
                        </span>
                        <div>
                          <div className="font-bold text-xs">{athleteName}</div>
                          <div className="text-[10px] text-white/70 font-semibold">
                            {ath.position || 'Player'} • Status: {ath.status}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleUnassignAthlete(ath)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-white/10 rounded-lg transition-colors"
                        title="Remove from squad"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ASSIGN TO TEAM MODAL */}
      {assignTarget && (
        <div className="fixed inset-0 z-50 bg-[#171044]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card variant="standard" className="w-full max-w-md p-6 space-y-6 relative">
            <div className="flex items-center justify-between border-b border-[#171044]/10 pb-4">
              <h3 className="text-xl font-bold font-display text-[#171044]">
                Assign Athlete to Squad
              </h3>
              <button onClick={() => setAssignTarget(null)} className="text-[#171044]/60 hover:text-[#171044]">
                <X size={20} />
              </button>
            </div>

            <div className="text-xs text-[#171044]/70">
              Assigning{' '}
              <span className="font-bold text-[#171044]">
                {assignTarget.user?.name || 'Athlete'}
              </span>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label htmlFor={assignTeamSelectId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Target Squad
                </label>
                <select
                  id={assignTeamSelectId}
                  required
                  value={assignTeamId}
                  onChange={(e) => setAssignTeamId(e.target.value)}
                  className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm font-semibold outline-none"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.ageGroup})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={assignJerseyInputId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Jersey Number
                </label>
                <input
                  id={assignJerseyInputId}
                  type="number"
                  min="0"
                  max="99"
                  placeholder="e.g. 10"
                  value={assignJerseyNumber}
                  onChange={(e) => setAssignJerseyNumber(e.target.value)}
                  className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                />
                <span className="text-[10px] text-[#171044]/60 block mt-1">
                  Must be unique within the squad. Collisions will return 409 Conflict.
                </span>
              </div>

              <div className="pt-4 border-t border-[#171044]/10 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setAssignTarget(null)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submittingAssign}>
                  {submittingAssign ? 'Assigning...' : 'Confirm Assignment'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
