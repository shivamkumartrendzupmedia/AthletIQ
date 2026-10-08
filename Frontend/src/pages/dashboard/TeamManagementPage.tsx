import React, { useState, useEffect, useCallback, useId } from 'react';
import { Card, CrossAccent, AthleticBadge, Button } from '../../design-system';
import { Plus, Edit2, Trash2, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  academyApi,
  type TeamItem,
  type SportItem,
  type CoachItem,
} from '../../services/academyApi';
import { ApiClientError } from '../../lib/apiClient';

export const TeamManagementPage: React.FC = () => {
  const { role } = useAuth();
  const isAdmin = role === 'Admin';

  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [sports, setSports] = useState<SportItem[]>([]);
  const [coaches, setCoaches] = useState<CoachItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formSportId, setFormSportId] = useState('');
  const [formAgeGroup, setFormAgeGroup] = useState('');
  const [formSeason, setFormSeason] = useState('2026');
  const [formCoachId, setFormCoachId] = useState('');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');

  // Accessible unique IDs
  const createNameId = useId();
  const createSportId = useId();
  const createAgeGroupId = useId();
  const createSeasonId = useId();
  const createCoachId = useId();
  const createStatusId = useId();

  const editNameId = useId();
  const editSportId = useId();
  const editAgeGroupId = useId();
  const editSeasonId = useId();
  const editCoachId = useId();
  const editStatusId = useId();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const [teamsRes, sportsRes, coachesRes] = await Promise.all([
        academyApi.listTeams({ limit: 100 }),
        academyApi.listSports({ limit: 100 }),
        isAdmin ? academyApi.listCoaches({ limit: 100 }) : Promise.resolve({ data: undefined }),
      ]);

      if (teamsRes.data) {
        setTeams(teamsRes.data.data);
      }
      if (sportsRes.data) {
        setSports(sportsRes.data.data);
      }
      if (coachesRes.data) {
        setCoaches(coachesRes.data.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to load teams.';
      setErrorBanner(msg);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const selectedSportObj = sports.find((s) => s.id === formSportId);
  const availableAgeGroups = selectedSportObj?.ageGroups || ['U14', 'U16', 'U18', 'Senior'];

  const openCreateModal = () => {
    const defaultSport = sports[0]?.id || '';
    const defaultSportObj = sports.find((s) => s.id === defaultSport);
    setFormName('');
    setFormSportId(defaultSport);
    setFormAgeGroup(defaultSportObj?.ageGroups?.[0] || 'U16');
    setFormSeason('2026');
    setFormCoachId('');
    setFormStatus('Active');
    setShowCreateModal(true);
  };

  const openEditModal = (t: TeamItem) => {
    setEditingTeam(t);
    setFormName(t.name);
    const sId = typeof t.sport === 'string' ? t.sport : t.sport?.id || '';
    setFormSportId(sId);
    setFormAgeGroup(t.ageGroup);
    setFormSeason(t.season || '2026');
    const cId = t.coach?.id || '';
    setFormCoachId(cId);
    setFormStatus(t.status);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSportId || !formAgeGroup) return;
    setSubmitting(true);
    setErrorBanner(null);
    try {
      await academyApi.createTeam({
        name: formName.trim(),
        sport: formSportId,
        ageGroup: formAgeGroup,
        season: formSeason.trim(),
        coach: formCoachId || undefined,
        status: formStatus,
      });

      setShowCreateModal(false);
      setSuccessBanner(`Team "${formName}" created successfully.`);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to create team.';
      setErrorBanner(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;
    setSubmitting(true);
    setErrorBanner(null);
    try {
      await academyApi.updateTeam(editingTeam.id, {
        name: formName.trim(),
        sport: formSportId,
        ageGroup: formAgeGroup,
        season: formSeason.trim(),
        coach: formCoachId || null,
        status: formStatus,
      });

      setEditingTeam(null);
      setSuccessBanner(`Team "${formName}" updated successfully.`);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to update team.';
      setErrorBanner(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeam = async (t: TeamItem) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete squad "${t.name}"? If active athletes are assigned to this squad, deletion will be blocked.`
    );
    if (!confirmed) return;
    setErrorBanner(null);
    try {
      await academyApi.deleteTeam(t.id);
      setSuccessBanner(`Squad "${t.name}" deleted.`);
      fetchData();
    } catch (err: unknown) {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : 'Failed to delete squad. It may have athletes assigned.';
      setErrorBanner(msg);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <AthleticBadge variant="orange">ACADEMY TEAMS & SQUADS</AthleticBadge>
          <h1 className="text-3xl md:text-4xl font-black font-display text-[#171044] mt-2">
            TEAM MANAGEMENT ({teams.length}) <CrossAccent color="orange" size="md" />
          </h1>
        </div>

        {isAdmin && (
          <Button variant="primary" iconLeft={<Plus size={18} />} onClick={openCreateModal}>
            Create New Team
          </Button>
        )}
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

      {/* Grid */}
      {loading && teams.length === 0 ? (
        <div className="p-12 text-center text-sm font-bold text-[#171044]/60">
          Loading teams...
        </div>
      ) : teams.length === 0 ? (
        <Card variant="dark" className="p-12 text-center space-y-4">
          <div className="text-xl font-bold font-display text-white">
            No teams available.
          </div>
          <p className="text-xs text-white/70 max-w-md mx-auto">
            {isAdmin
              ? 'Get started by creating your academy squad with assigned sports and age groups.'
              : 'No teams currently assigned to your profile.'}
          </p>
          {isAdmin && (
            <Button variant="primary" onClick={openCreateModal}>
              Create First Team
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teams.map((t) => {
            const sportName =
              typeof t.sport === 'object' && t.sport ? t.sport.name : 'Sport Program';
            const coachName = t.coach?.user?.name || 'Unassigned Coach';

            return (
              <Card key={t.id} variant="dark" className="space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex gap-2 mb-2">
                        <AthleticBadge variant="lime" size="sm">
                          {sportName}
                        </AthleticBadge>
                        <AthleticBadge variant="orange" size="sm">
                          {t.ageGroup}
                        </AthleticBadge>
                        <AthleticBadge variant={t.status === 'Active' ? 'dark' : 'orange'} size="sm">
                          {t.status}
                        </AthleticBadge>
                      </div>
                      <h3 className="text-2xl font-black font-display text-white">{t.name}</h3>
                      <p className="text-xs text-[#D8F500] font-semibold mt-0.5">
                        Head Coach: {coachName}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-white">{t.athleteCount ?? 0}</div>
                      <div className="text-[10px] uppercase text-white/60 font-bold">Roster Size</div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex justify-between items-center text-xs font-bold text-white/80 mt-4">
                    <span>Season: {t.season || '2026'}</span>
                    <span>Squad: {t.slug}</span>
                  </div>
                </div>

                {/* Role-Aware UI: Actions shown only for Admin */}
                {isAdmin && (
                  <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditModal(t)}
                      className="p-1.5 text-white/70 hover:text-[#D8F500] hover:bg-white/10 rounded-lg transition-colors"
                      title="Edit squad"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(t)}
                      className="p-1.5 text-red-400 hover:text-red-300 hover:bg-white/10 rounded-lg transition-colors"
                      title="Delete squad"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE TEAM MODAL (Admin only) */}
      {isAdmin && showCreateModal && (
        <div className="fixed inset-0 z-50 bg-[#171044]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card variant="standard" className="w-full max-w-lg p-6 space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#171044]/10 pb-4">
              <h3 className="text-xl font-bold font-display text-[#171044]">Create New Team</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[#171044]/60 hover:text-[#171044]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label htmlFor={createNameId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Team Name
                </label>
                <input
                  id={createNameId}
                  type="text"
                  required
                  placeholder="e.g. U16 Strikers Football"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor={createSportId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                    Sport Discipline
                  </label>
                  <select
                    id={createSportId}
                    required
                    value={formSportId}
                    onChange={(e) => {
                      const newSportId = e.target.value;
                      setFormSportId(newSportId);
                      const sp = sports.find((s) => s.id === newSportId);
                      if (sp && sp.ageGroups && sp.ageGroups.length > 0) {
                        setFormAgeGroup(sp.ageGroups[0]);
                      }
                    }}
                    className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm font-semibold outline-none"
                  >
                    {sports.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor={createAgeGroupId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                    Age Group
                  </label>
                  <select
                    id={createAgeGroupId}
                    required
                    value={formAgeGroup}
                    onChange={(e) => setFormAgeGroup(e.target.value)}
                    className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm font-semibold outline-none"
                  >
                    {availableAgeGroups.map((ag) => (
                      <option key={ag} value={ag}>
                        {ag}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor={createSeasonId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                    Season
                  </label>
                  <input
                    id={createSeasonId}
                    type="text"
                    required
                    value={formSeason}
                    onChange={(e) => setFormSeason(e.target.value)}
                    className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                  />
                </div>

                <div>
                  <label htmlFor={createStatusId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                    Status
                  </label>
                  <select
                    id={createStatusId}
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'Active' | 'Inactive')}
                    className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm font-semibold outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor={createCoachId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Assigned Coach (Optional)
                </label>
                <select
                  id={createCoachId}
                  value={formCoachId}
                  onChange={(e) => setFormCoachId(e.target.value)}
                  className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm font-semibold outline-none"
                >
                  <option value="">No Coach Assigned</option>
                  {coaches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.user?.name || c.title} ({c.title})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-[#171044]/10 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Team'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* EDIT TEAM MODAL (Admin only) */}
      {isAdmin && editingTeam && (
        <div className="fixed inset-0 z-50 bg-[#171044]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card variant="standard" className="w-full max-w-lg p-6 space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#171044]/10 pb-4">
              <h3 className="text-xl font-bold font-display text-[#171044]">
                Edit Team: {editingTeam.name}
              </h3>
              <button onClick={() => setEditingTeam(null)} className="text-[#171044]/60 hover:text-[#171044]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label htmlFor={editNameId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Team Name
                </label>
                <input
                  id={editNameId}
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor={editSportId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                    Sport Discipline
                  </label>
                  <select
                    id={editSportId}
                    required
                    value={formSportId}
                    onChange={(e) => {
                      const newSportId = e.target.value;
                      setFormSportId(newSportId);
                      const sp = sports.find((s) => s.id === newSportId);
                      if (sp && sp.ageGroups && sp.ageGroups.length > 0) {
                        setFormAgeGroup(sp.ageGroups[0]);
                      }
                    }}
                    className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm font-semibold outline-none"
                  >
                    {sports.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor={editAgeGroupId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                    Age Group
                  </label>
                  <select
                    id={editAgeGroupId}
                    required
                    value={formAgeGroup}
                    onChange={(e) => setFormAgeGroup(e.target.value)}
                    className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm font-semibold outline-none"
                  >
                    {availableAgeGroups.map((ag) => (
                      <option key={ag} value={ag}>
                        {ag}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor={editSeasonId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                    Season
                  </label>
                  <input
                    id={editSeasonId}
                    type="text"
                    required
                    value={formSeason}
                    onChange={(e) => setFormSeason(e.target.value)}
                    className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                  />
                </div>

                <div>
                  <label htmlFor={editStatusId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                    Status
                  </label>
                  <select
                    id={editStatusId}
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'Active' | 'Inactive')}
                    className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm font-semibold outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor={editCoachId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Assigned Coach (Optional)
                </label>
                <select
                  id={editCoachId}
                  value={formCoachId}
                  onChange={(e) => setFormCoachId(e.target.value)}
                  className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm font-semibold outline-none"
                >
                  <option value="">No Coach Assigned</option>
                  {coaches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.user?.name || c.title} ({c.title})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-[#171044]/10 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setEditingTeam(null)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
