import React, { useState, useEffect, useCallback, useId } from 'react';
import { Card, CrossAccent, AthleticBadge, Button } from '../../design-system';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
} from 'lucide-react';
import { SafeImage } from '../../components/SafeImage';
import { useAuth } from '../../context/AuthContext';
import {
  academyApi,
  type AthleteItem,
  type SportItem,
  type TeamItem,
  type AdminUserItem,
  type PaginationMeta,
  mapFieldErrors,
} from '../../services/academyApi';
import { ApiClientError } from '../../lib/apiClient';

export const AthleteManagementPage: React.FC = () => {
  const { role } = useAuth();
  const isAdmin = role === 'Admin';
  const isCoach = role === 'Coach';

  const [athletes, setAthletes] = useState<AthleteItem[]>([]);
  const [sports, setSports] = useState<SportItem[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [candidateUsers, setCandidateUsers] = useState<AdminUserItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<AthleteItem | null>(null);
  const [viewingAthlete, setViewingAthlete] = useState<AthleteItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states (Create)
  const [createUserId, setCreateUserId] = useState('');
  const [createSportId, setCreateSportId] = useState('');
  const [createTeamId, setCreateTeamId] = useState('');
  const [createJerseyNumber, setCreateJerseyNumber] = useState('');
  const [createPosition, setCreatePosition] = useState('Forward');
  const [createDOB, setCreateDOB] = useState('2009-05-15');
  const [createGender, setCreateGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [createMedicalNotes, setCreateMedicalNotes] = useState('');
  const [createHeightCm, setCreateHeightCm] = useState('');
  const [createWeightKg, setCreateWeightKg] = useState('');

  // Form states (Edit - Admin full / Coach limited)
  const [editPosition, setEditPosition] = useState('');
  const [editJerseyNumber, setEditJerseyNumber] = useState('');
  const [editStatus, setEditStatus] = useState<'Active' | 'Injured' | 'Trial' | 'Inactive'>('Active');
  const [editMedicalNotes, setEditMedicalNotes] = useState('');
  const [editVerificationStatus, setEditVerificationStatus] = useState<'Verified' | 'Pending ID' | 'Medical Required'>('Pending ID');

  // Accessible unique IDs
  const createUserIdInput = useId();
  const createSportIdInput = useId();
  const createTeamIdInput = useId();
  const createJerseyInput = useId();
  const createPositionInput = useId();
  const createDOBInput = useId();
  const createGenderInput = useId();
  const createMedicalInput = useId();
  const createHeightInput = useId();
  const createWeightInput = useId();

  const editPositionInput = useId();
  const editJerseyInput = useId();
  const editStatusInput = useId();
  const editMedicalInput = useId();
  const editVerificationInput = useId();

  const fetchAthletes = useCallback(async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const res = await academyApi.listAthletes({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm.trim() || undefined,
        sport: sportFilter || undefined,
        status: statusFilter || undefined,
      });

      setAthletes(res.items);
      setPagination(res.pagination);
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to load athletes.';
      setErrorBanner(msg);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm, sportFilter, statusFilter]);

  const fetchDependencies = useCallback(async () => {
    try {
      const [sportRes, teamRes, userRes] = await Promise.all([
        academyApi.listSports({ limit: 100 }),
        academyApi.listTeams({ limit: 100 }),
        isAdmin
          ? academyApi.listUsers({ role: 'Athlete', limit: 100 })
          : Promise.resolve({ items: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } }),
      ]);

      setSports(sportRes.items);
      setTeams(teamRes.items);
      setCandidateUsers(userRes.items);
    } catch {
      // Non-fatal dependencies fallback
    }
  }, [isAdmin]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDependencies();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchDependencies]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAthletes();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchAthletes]);

  const openCreateModal = () => {
    setCreateUserId('');
    setCreateSportId(sports[0]?.id || '');
    setCreateTeamId('');
    setCreateJerseyNumber('');
    setCreatePosition('Forward');
    setCreateDOB('2009-05-15');
    setCreateGender('Male');
    setCreateMedicalNotes('');
    setCreateHeightCm('');
    setCreateWeightKg('');
    setCreateFieldErrors({});
    setShowCreateModal(true);
  };

  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string>>({});
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});

  const openEditModal = (a: AthleteItem) => {
    setEditingAthlete(a);
    setEditPosition(a.position || '');
    setEditJerseyNumber(a.jerseyNumber !== undefined ? String(a.jerseyNumber) : '');
    setEditStatus(a.status);
    setEditMedicalNotes(a.medicalNotes || '');
    setEditVerificationStatus(a.verificationStatus);
    setEditFieldErrors({});
  };

  const openViewModal = async (a: AthleteItem) => {
    try {
      const res = await academyApi.getAthlete(a.id);
      setViewingAthlete(res || a);
    } catch {
      setViewingAthlete(a);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateFieldErrors({});
    const clientErrors: Record<string, string> = {};
    if (!createSportId) clientErrors.sport = 'Sport selection is required';
    if (!createDOB) clientErrors.dateOfBirth = 'Date of birth is required';

    if (Object.keys(clientErrors).length > 0) {
      setCreateFieldErrors(clientErrors);
      setErrorBanner('Please fill in all required fields marked below.');
      return;
    }

    setSubmitting(true);
    setErrorBanner(null);
    try {
      await academyApi.createAthlete({
        user: createUserId || undefined,
        sport: createSportId,
        team: createTeamId || undefined,
        jerseyNumber: createJerseyNumber ? Number(createJerseyNumber) : undefined,
        position: createPosition.trim() || undefined,
        dateOfBirth: createDOB,
        gender: createGender,
        medicalNotes: createMedicalNotes.trim() || undefined,
        heightCm: createHeightCm ? Number(createHeightCm) : undefined,
        weightKg: createWeightKg ? Number(createWeightKg) : undefined,
      });

      setShowCreateModal(false);
      setSuccessBanner('Athlete enrolled successfully.');
      fetchAthletes();
    } catch (err: unknown) {
      const mapped = mapFieldErrors(err);
      if (Object.keys(mapped).length > 0) {
        setCreateFieldErrors(mapped);
      }
      const msg = err instanceof ApiClientError ? err.message : 'Failed to enroll athlete.';
      setErrorBanner(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAthlete) return;
    setEditFieldErrors({});
    setSubmitting(true);
    setErrorBanner(null);
    try {
      const payload: Record<string, unknown> = {
        position: editPosition.trim() || undefined,
        status: editStatus,
      };

      if (isAdmin) {
        if (editJerseyNumber) payload.jerseyNumber = Number(editJerseyNumber);
        if (editMedicalNotes) payload.medicalNotes = editMedicalNotes.trim();
        payload.verificationStatus = editVerificationStatus;
      }

      await academyApi.updateAthlete(editingAthlete.id, payload);
      setEditingAthlete(null);
      setSuccessBanner('Athlete details updated.');
      fetchAthletes();
    } catch (err: unknown) {
      const mapped = mapFieldErrors(err);
      if (Object.keys(mapped).length > 0) {
        setEditFieldErrors(mapped);
      }
      const msg = err instanceof ApiClientError ? err.message : 'Failed to update athlete.';
      setErrorBanner(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAthlete = async (a: AthleteItem) => {
    const athleteName = a.user?.name || `Athlete #${a.jerseyNumber || a.id.slice(-4)}`;
    const confirmed = window.confirm(
      `Are you sure you want to deactivate athlete "${athleteName}"? (Soft deactivation)`
    );
    if (!confirmed) return;
    setErrorBanner(null);
    try {
      await academyApi.deleteAthlete(a.id);
      setSuccessBanner(`Athlete "${athleteName}" has been deactivated.`);
      fetchAthletes();
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to deactivate athlete.';
      setErrorBanner(msg);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <AthleticBadge variant="orange">ATHLETE ROSTER MANAGEMENT</AthleticBadge>
          <h1 className="text-3xl md:text-4xl font-black font-display text-[#171044] mt-2">
            ACADEMY ATHLETES ({pagination.total}) <CrossAccent color="orange" size="md" />
          </h1>
        </div>

        {isAdmin && (
          <Button variant="primary" iconLeft={<Plus size={18} />} onClick={openCreateModal}>
            Enroll New Athlete
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

      {/* Filter and Search Bar */}
      <Card variant="standard" className="p-4 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-4 top-3 text-[#171044]/40" />
          <input
            type="text"
            placeholder="Search athletes by name or position..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-[#F7F1E8] border border-[#171044]/10 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={sportFilter}
            onChange={(e) => setSportFilter(e.target.value)}
            className="px-4 py-2.5 bg-[#F7F1E8] border border-[#171044]/10 rounded-xl text-xs font-bold text-[#171044] outline-none"
          >
            <option value="">All Sports</option>
            {sports.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-[#F7F1E8] border border-[#171044]/10 rounded-xl text-xs font-bold text-[#171044] outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Injured">Injured</option>
            <option value="Trial">Trial</option>
            <option value="Inactive">Inactive</option>
          </select>
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
                <th className="p-4">Jersey / Pos</th>
                <th className="p-4">Verification</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171044]/10 text-sm font-semibold">
              {loading && (athletes || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#171044]/60">
                    Loading athletes...
                  </td>
                </tr>
              ) : (athletes || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#171044]/60">
                    No athletes found matching your filters.
                  </td>
                </tr>
              ) : (
                (athletes || []).map((ath) => {
                  const athleteName = ath.user?.name || 'Unlinked Athlete';
                  const sportName =
                    typeof ath.sport === 'object' && ath.sport ? ath.sport.name : 'Sport';
                  const teamName = ath.team?.name || 'Unassigned';

                  return (
                    <tr key={ath.id} className="hover:bg-[#F7F1E8]/50 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <SafeImage
                            src={undefined}
                            fallbackKind="person"
                            name={athleteName}
                            className="w-10 h-10 rounded-full shrink-0"
                          />
                          <div>
                            <div className="font-bold font-display text-[#171044]">
                              {athleteName}
                            </div>
                            <div className="text-xs text-[#171044]/60">
                              Age: {ath.age ?? '—'} • {ath.gender}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="text-xs font-bold text-[#171044]">{sportName}</div>
                        <div className="text-xs text-[#FF5A00] font-semibold">{teamName}</div>
                      </td>

                      <td className="p-4">
                        <span className="font-display font-extrabold text-[#171044]">
                          {ath.position || '—'}
                        </span>
                        {ath.jerseyNumber !== undefined && (
                          <span className="text-xs text-gray-500 ml-1">
                            (#{ath.jerseyNumber})
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <AthleticBadge
                          variant={
                            ath.verificationStatus === 'Verified'
                              ? 'lime'
                              : ath.verificationStatus === 'Pending ID'
                              ? 'orange'
                              : 'dark'
                          }
                          size="sm"
                        >
                          {ath.verificationStatus}
                        </AthleticBadge>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                            ath.status === 'Active'
                              ? 'text-green-700'
                              : ath.status === 'Injured'
                              ? 'text-amber-700'
                              : ath.status === 'Trial'
                              ? 'text-blue-700'
                              : 'text-red-600'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              ath.status === 'Active'
                                ? 'bg-green-500'
                                : ath.status === 'Injured'
                                ? 'bg-amber-500'
                                : ath.status === 'Trial'
                                ? 'bg-blue-500'
                                : 'bg-red-500'
                            }`}
                          />
                          {ath.status}
                        </span>
                      </td>

                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openViewModal(ath)}
                            className="p-1.5 text-[#171044]/70 hover:text-[#171044] hover:bg-[#171044]/10 rounded-lg transition-colors"
                            title="View athlete profile"
                          >
                            <Eye size={16} />
                          </button>

                          {(isAdmin || isCoach) && (
                            <button
                              onClick={() => openEditModal(ath)}
                              className="p-1.5 text-[#171044]/70 hover:text-[#FF5A00] hover:bg-[#FF5A00]/10 rounded-lg transition-colors"
                              title={isAdmin ? 'Edit athlete' : 'Update position/status'}
                            >
                              <Edit2 size={16} />
                            </button>
                          )}

                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteAthlete(ath)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Deactivate athlete"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-[#171044]/10 flex items-center justify-between text-xs font-bold text-[#171044]/70">
            <div>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} athletes)
            </div>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                className="px-3 py-1 bg-white border border-[#171044]/20 rounded-lg disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                className="px-3 py-1 bg-white border border-[#171044]/20 rounded-lg disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* VIEW SINGLE ATHLETE MODAL */}
      {viewingAthlete && (
        <div className="fixed inset-0 z-50 bg-[#171044]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card variant="standard" className="w-full max-w-lg p-6 space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#171044]/10 pb-4">
              <div className="flex items-center gap-3">
                <SafeImage
                  src={undefined}
                  fallbackKind="person"
                  name={viewingAthlete.user?.name || 'Athlete Profile'}
                  className="w-12 h-12 rounded-full shrink-0"
                />
                <div>
                  <h3 className="text-xl font-bold font-display text-[#171044]">
                    {viewingAthlete.user?.name || 'Athlete Profile'}
                  </h3>
                  <p className="text-xs text-[#171044]/60">
                    {viewingAthlete.user?.email || 'No linked user account'}
                  </p>
                </div>
              </div>
              <button onClick={() => setViewingAthlete(null)} className="text-[#171044]/60 hover:text-[#171044]">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-[#F7F1E8] rounded-xl space-y-1">
                <span className="text-[#171044]/60 font-bold block">Sport Program</span>
                <span className="font-bold text-[#171044] text-sm">
                  {typeof viewingAthlete.sport === 'object' && viewingAthlete.sport
                    ? viewingAthlete.sport.name
                    : 'Sport'}
                </span>
              </div>
              <div className="p-3 bg-[#F7F1E8] rounded-xl space-y-1">
                <span className="text-[#171044]/60 font-bold block">Assigned Squad</span>
                <span className="font-bold text-[#FF5A00] text-sm">
                  {viewingAthlete.team?.name || 'Unassigned'}
                </span>
              </div>
              <div className="p-3 bg-[#F7F1E8] rounded-xl space-y-1">
                <span className="text-[#171044]/60 font-bold block">Position & Jersey</span>
                <span className="font-bold text-[#171044]">
                  {viewingAthlete.position || '—'} {viewingAthlete.jerseyNumber !== undefined ? `(#${viewingAthlete.jerseyNumber})` : ''}
                </span>
              </div>
              <div className="p-3 bg-[#F7F1E8] rounded-xl space-y-1">
                <span className="text-[#171044]/60 font-bold block">Date of Birth / Age</span>
                <span className="font-bold text-[#171044]">
                  {viewingAthlete.dateOfBirth} ({viewingAthlete.age ?? '—'} yrs)
                </span>
              </div>
              <div className="p-3 bg-[#F7F1E8] rounded-xl space-y-1">
                <span className="text-[#171044]/60 font-bold block">Physical Stats</span>
                <span className="font-bold text-[#171044]">
                  {viewingAthlete.heightCm ? `${viewingAthlete.heightCm} cm` : '—'} /{' '}
                  {viewingAthlete.weightKg ? `${viewingAthlete.weightKg} kg` : '—'}
                </span>
              </div>
              <div className="p-3 bg-[#F7F1E8] rounded-xl space-y-1">
                <span className="text-[#171044]/60 font-bold block">Verification State</span>
                <span className="font-bold text-[#171044]">{viewingAthlete.verificationStatus}</span>
              </div>
            </div>

            {/* medicalNotes shown ONLY to Admin (Correction 4) */}
            {isAdmin && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <FileText size={14} className="text-amber-700" />
                  <span>Confidential Medical Notes (Admin Only View)</span>
                </div>
                <p className="text-xs text-amber-950 font-medium leading-relaxed">
                  {viewingAthlete.medicalNotes || 'No medical notes or injury warnings recorded.'}
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-[#171044]/10 flex justify-end">
              <Button variant="ghost" onClick={() => setViewingAthlete(null)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* CREATE MODAL (Admin only) */}
      {isAdmin && showCreateModal && (
        <div className="fixed inset-0 z-50 bg-[#171044]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card variant="standard" className="w-full max-w-lg p-6 space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#171044]/10 pb-4">
              <h3 className="text-xl font-bold font-display text-[#171044]">Enroll New Athlete</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[#171044]/60 hover:text-[#171044]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label htmlFor={createUserIdInput} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  User Account (Optional for unlinked profile)
                </label>
                <select
                  id={createUserIdInput}
                  value={createUserId}
                  onChange={(e) => setCreateUserId(e.target.value)}
                  className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm font-semibold outline-none"
                >
                  <option value="">No linked user account (unlinked)</option>
                  {candidateUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor={createSportIdInput} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                    Sport Discipline <span className="text-red-500">*</span>
                  </label>
                  <select
                    id={createSportIdInput}
                    value={createSportId}
                    onChange={(e) => {
                      setCreateSportId(e.target.value);
                      if (createFieldErrors.sport) setCreateFieldErrors((prev) => ({ ...prev, sport: '' }));
                    }}
                    className={`w-full px-4 py-2 bg-[#F7F1E8] border rounded-xl text-sm font-semibold outline-none ${
                      createFieldErrors.sport ? 'border-red-500' : 'border-[#171044]/20'
                    }`}
                  >
                    <option value="">Select Sport...</option>
                    {sports.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.name}
                      </option>
                    ))}
                  </select>
                  {createFieldErrors.sport && (
                    <p className="text-xs text-red-600 font-bold mt-1">{createFieldErrors.sport}</p>
                  )}
                </div>

                <div>
                  <label htmlFor={createTeamIdInput} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                    Team Squad (Optional)
                  </label>
                  <select
                    id={createTeamIdInput}
                    value={createTeamId}
                    onChange={(e) => setCreateTeamId(e.target.value)}
                    className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm font-semibold outline-none"
                  >
                    <option value="">No Team (Unassigned)</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.ageGroup})
                      </option>
                    ))}
                  </select>
                  {createFieldErrors.team && (
                    <p className="text-xs text-red-600 font-bold mt-1">{createFieldErrors.team}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor={createPositionInput} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                    Position
                  </label>
                  <input
                    id={createPositionInput}
                    type="text"
                    placeholder="e.g. Forward / Guard"
                    value={createPosition}
                    onChange={(e) => setCreatePosition(e.target.value)}
                    className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                  />
                  {createFieldErrors.position && (
                    <p className="text-xs text-red-600 font-bold mt-1">{createFieldErrors.position}</p>
                  )}
                </div>

                <div>
                  <label htmlFor={createJerseyInput} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                    Jersey Number (Optional)
                  </label>
                  <input
                    id={createJerseyInput}
                    type="number"
                    min="0"
                    max="99"
                    value={createJerseyNumber}
                    onChange={(e) => setCreateJerseyNumber(e.target.value)}
                    className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                  />
                  {createFieldErrors.jerseyNumber && (
                    <p className="text-xs text-red-600 font-bold mt-1">{createFieldErrors.jerseyNumber}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor={createDOBInput} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    id={createDOBInput}
                    type="date"
                    value={createDOB}
                    onChange={(e) => {
                      setCreateDOB(e.target.value);
                      if (createFieldErrors.dateOfBirth) setCreateFieldErrors((prev) => ({ ...prev, dateOfBirth: '' }));
                    }}
                    className={`w-full px-4 py-2 bg-[#F7F1E8] border rounded-xl text-sm outline-none focus:border-[#FF5A00] ${
                      createFieldErrors.dateOfBirth ? 'border-red-500' : 'border-[#171044]/20'
                    }`}
                  />
                  {createFieldErrors.dateOfBirth && (
                    <p className="text-xs text-red-600 font-bold mt-1">{createFieldErrors.dateOfBirth}</p>
                  )}
                </div>

                <div>
                  <label htmlFor={createGenderInput} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                    Gender
                  </label>
                  <select
                    id={createGenderInput}
                    value={createGender}
                    onChange={(e) => setCreateGender(e.target.value as 'Male' | 'Female' | 'Other')}
                    className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm font-semibold outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor={createHeightInput} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                    Height (cm)
                  </label>
                  <input
                    id={createHeightInput}
                    type="number"
                    placeholder="e.g. 180"
                    value={createHeightCm}
                    onChange={(e) => setCreateHeightCm(e.target.value)}
                    className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                  />
                </div>

                <div>
                  <label htmlFor={createWeightInput} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                    Weight (kg)
                  </label>
                  <input
                    id={createWeightInput}
                    type="number"
                    placeholder="e.g. 72"
                    value={createWeightKg}
                    onChange={(e) => setCreateWeightKg(e.target.value)}
                    className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor={createMedicalInput} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Confidential Medical Notes
                </label>
                <textarea
                  id={createMedicalInput}
                  rows={2}
                  placeholder="Allergies, previous injuries, medication..."
                  value={createMedicalNotes}
                  onChange={(e) => setCreateMedicalNotes(e.target.value)}
                  className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                />
              </div>

              <div className="pt-4 border-t border-[#171044]/10 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? 'Enrolling...' : 'Enroll Athlete'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* EDIT MODAL (Admin full / Coach limited: position & status) */}
      {editingAthlete && (
        <div className="fixed inset-0 z-50 bg-[#171044]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card variant="standard" className="w-full max-w-lg p-6 space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#171044]/10 pb-4">
              <h3 className="text-xl font-bold font-display text-[#171044]">
                Update Athlete: {editingAthlete.user?.name || `Athlete #${editingAthlete.jerseyNumber || editingAthlete.id.slice(-4)}`}
              </h3>
              <button onClick={() => setEditingAthlete(null)} className="text-[#171044]/60 hover:text-[#171044]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label htmlFor={editPositionInput} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Position
                </label>
                <input
                  id={editPositionInput}
                  type="text"
                  value={editPosition}
                  onChange={(e) => setEditPosition(e.target.value)}
                  className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                />
                {editFieldErrors.position && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{editFieldErrors.position}</p>
                )}
              </div>

              <div>
                <label htmlFor={editStatusInput} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Athlete Status
                </label>
                <select
                  id={editStatusInput}
                  value={editStatus}
                  onChange={(e) =>
                    setEditStatus(e.target.value as 'Active' | 'Injured' | 'Trial' | 'Inactive')
                  }
                  className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm font-semibold outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Injured">Injured</option>
                  <option value="Trial">Trial</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {isAdmin && (
                <>
                  <div>
                    <label htmlFor={editJerseyInput} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                      Jersey Number
                    </label>
                    <input
                      id={editJerseyInput}
                      type="number"
                      min="0"
                      max="99"
                      value={editJerseyNumber}
                      onChange={(e) => setEditJerseyNumber(e.target.value)}
                      className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                    />
                    {editFieldErrors.jerseyNumber && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{editFieldErrors.jerseyNumber}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor={editVerificationInput} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                      Verification Status
                    </label>
                    <select
                      id={editVerificationInput}
                      value={editVerificationStatus}
                      onChange={(e) =>
                        setEditVerificationStatus(e.target.value as 'Verified' | 'Pending ID' | 'Medical Required')
                      }
                      className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm font-semibold outline-none"
                    >
                      <option value="Pending ID">Pending ID</option>
                      <option value="Verified">Verified</option>
                      <option value="Medical Required">Medical Required</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor={editMedicalInput} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                      Confidential Medical Notes
                    </label>
                    <textarea
                      id={editMedicalInput}
                      rows={2}
                      value={editMedicalNotes}
                      onChange={(e) => setEditMedicalNotes(e.target.value)}
                      className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                    />
                  </div>
                </>
              )}

              <div className="pt-4 border-t border-[#171044]/10 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setEditingAthlete(null)}>
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
