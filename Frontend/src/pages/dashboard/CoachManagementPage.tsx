import React, { useState, useEffect, useCallback, useId } from 'react';
import { Card, CrossAccent, AthleticBadge, Button } from '../../design-system';
import { Plus, Edit2, Trash2, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { StateContainer } from '../../components/StateContainer';
import { SafeImage } from '../../components/SafeImage';
import {
  academyApi,
  type CoachItem,
  type SportItem,
  type AdminUserItem,
  mapFieldErrors,
} from '../../services/academyApi';
import { ApiClientError } from '../../lib/apiClient';

export const CoachManagementPage: React.FC = () => {
  const [coaches, setCoaches] = useState<CoachItem[]>([]);
  const [sports, setSports] = useState<SportItem[]>([]);
  const [candidateUsers, setCandidateUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCoach, setEditingCoach] = useState<CoachItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formUserId, setFormUserId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formSports, setFormSports] = useState<string[]>([]);
  const [formSpecialties, setFormSpecialties] = useState('');
  const [formExpYears, setFormExpYears] = useState('5');
  const [formBio, setFormBio] = useState('');
  const [formPhoto, setFormPhoto] = useState('');
  const [formIsPublic, setFormIsPublic] = useState(true);

  // Accessible unique IDs
  const createUserId = useId();
  const createTitleId = useId();
  const createExpId = useId();
  const createSpecialtiesId = useId();
  const createBioId = useId();
  const createPhotoId = useId();
  const createPublicId = useId();

  const editTitleId = useId();
  const editExpId = useId();
  const editSpecialtiesId = useId();
  const editBioId = useId();
  const editPhotoId = useId();
  const editPublicId = useId();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const [coachRes, sportRes, userRes] = await Promise.all([
        academyApi.listCoaches({ limit: 100 }),
        academyApi.listSports({ limit: 100 }),
        academyApi.listUsers({ role: 'Coach', limit: 100 }),
      ]);

      setCoaches(coachRes.items);
      setSports(sportRes.items);
      setCandidateUsers(userRes.items);
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to load coaches directory.';
      setErrorBanner(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string>>({});
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});

  const openCreateModal = () => {
    // Find candidate users who don't already have coach profile
    const existingCoachUserIds = new Set((coaches || []).map((c) => c.user?.id));
    const available = (candidateUsers || []).filter((u) => !existingCoachUserIds.has(u.id));

    setFormUserId(available[0]?.id || candidateUsers[0]?.id || '');
    setFormTitle('Head Coach');
    setFormSports((sports || [])[0]?.id ? [sports[0].id] : []);
    setFormSpecialties('Tactical Development, Fitness');
    setFormExpYears('5');
    setFormBio('Dedicated academy coach focused on youth athlete progression.');
    setFormPhoto('');
    setFormIsPublic(true);
    setCreateFieldErrors({});
    setShowCreateModal(true);
  };

  const openEditModal = (c: CoachItem) => {
    setEditingCoach(c);
    setFormTitle(c.title);
    const sIds = (c.sports || []).map((s) => (typeof s === 'string' ? s : s.id));
    setFormSports(sIds);
    setFormSpecialties((c.specialties || []).join(', '));
    setFormExpYears(String(c.experienceYears ?? 5));
    setFormBio(c.bio || '');
    setFormPhoto(c.photo || '');
    setFormIsPublic(c.isPublic);
    setEditFieldErrors({});
  };

  const toggleSport = (sportId: string) => {
    setFormSports((prev) =>
      prev.includes(sportId) ? prev.filter((id) => id !== sportId) : [...prev, sportId]
    );
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateFieldErrors({});
    const clientErrors: Record<string, string> = {};
    if (!formUserId) clientErrors.user = 'Coach user account selection is required';
    if (!formTitle.trim()) clientErrors.title = 'Coach title is required';

    if (Object.keys(clientErrors).length > 0) {
      setCreateFieldErrors(clientErrors);
      setErrorBanner('Please fill in all required fields marked below.');
      return;
    }

    setSubmitting(true);
    setErrorBanner(null);
    try {
      const specArr = formSpecialties
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await academyApi.createCoach({
        user: formUserId,
        title: formTitle.trim(),
        sports: formSports,
        specialties: specArr,
        experienceYears: Number(formExpYears) || 0,
        bio: formBio.trim(),
        photo: formPhoto.trim() || undefined,
        isPublic: formIsPublic,
      });

      setShowCreateModal(false);
      setSuccessBanner('Coach profile created successfully.');
      fetchData();
    } catch (err: unknown) {
      const mapped = mapFieldErrors(err);
      if (Object.keys(mapped).length > 0) {
        setCreateFieldErrors(mapped);
      }
      const msg = err instanceof ApiClientError ? err.message : 'Failed to create coach profile.';
      setErrorBanner(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoach) return;
    setEditFieldErrors({});
    const clientErrors: Record<string, string> = {};
    if (!formTitle.trim()) clientErrors.title = 'Coach title cannot be empty';

    if (Object.keys(clientErrors).length > 0) {
      setEditFieldErrors(clientErrors);
      setErrorBanner('Please fill in all required fields marked below.');
      return;
    }

    setSubmitting(true);
    setErrorBanner(null);
    try {
      const specArr = formSpecialties
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await academyApi.updateCoach(editingCoach.id, {
        title: formTitle.trim(),
        sports: formSports,
        specialties: specArr,
        experienceYears: Number(formExpYears) || 0,
        bio: formBio.trim(),
        photo: formPhoto.trim() || undefined,
        isPublic: formIsPublic,
      });

      setEditingCoach(null);
      setSuccessBanner('Coach profile updated successfully.');
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to update coach profile.';
      setErrorBanner(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCoach = async (c: CoachItem) => {
    const coachName = c.user?.name || c.title;
    const confirmed = window.confirm(
      `Are you sure you want to delete coach profile for "${coachName}"?`
    );
    if (!confirmed) return;
    setErrorBanner(null);
    try {
      await academyApi.deleteCoach(c.id);
      setSuccessBanner(`Coach profile for "${coachName}" deleted.`);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to delete coach profile.';
      setErrorBanner(msg);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <AthleticBadge variant="lime">COACHING STAFF DIRECTORY</AthleticBadge>
          <h1 className="text-3xl md:text-4xl font-black font-display text-[#171044] mt-2">
            COACH MANAGEMENT ({(coaches || []).length}) <CrossAccent color="orange" size="md" />
          </h1>
        </div>

        <Button variant="primary" iconLeft={<Plus size={18} />} onClick={openCreateModal}>
          Assign New Coach
        </Button>
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

      {/* Grid with StateContainer */}
      <StateContainer
        loading={loading && (coaches || []).length === 0}
        error={errorBanner}
        empty={!loading && (coaches || []).length === 0}
        emptyMessage="No coach profiles created yet"
        emptyActionLabel="Assign First Coach"
        onEmptyAction={openCreateModal}
        onRetry={fetchData}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(coaches || []).map((c) => {
            const coachName = c.user?.name || 'Coach';
            const coachEmail = c.user?.email;

            return (
              <Card key={c.id} variant="standard" className="space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-4">
                    <SafeImage
                      src={c.photo}
                      alt={coachName}
                      fallbackKind="coach"
                      name={coachName}
                      className="w-16 h-16 rounded-2xl object-cover shrink-0 border-2 border-[#171044]"
                    />
                    <div>
                      <div className="flex gap-2 items-center">
                        <AthleticBadge variant="purple" size="sm">
                          {c.title}
                        </AthleticBadge>
                        <AthleticBadge variant={c.isPublic ? 'lime' : 'dark'} size="sm">
                          {c.isPublic ? 'Public' : 'Private'}
                        </AthleticBadge>
                      </div>
                      <div className="font-bold font-display text-[#171044] text-lg mt-1">
                        {coachName}
                      </div>
                      {coachEmail && (
                        <div className="text-xs text-[#FF5A00] font-semibold">{coachEmail}</div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#171044]/10 space-y-1 text-xs text-[#171044]/70 mt-3">
                    <div>
                      <span className="font-bold text-[#171044]">Experience:</span>{' '}
                      {c.experienceYears ?? 0} Years
                    </div>
                    <div>
                      <span className="font-bold text-[#171044]">Specialties:</span>{' '}
                      {c.specialties && c.specialties.length > 0
                        ? c.specialties.join(', ')
                        : 'General Training'}
                    </div>
                    {c.bio && (
                      <p className="text-[11px] text-[#171044]/60 line-clamp-2 pt-1">{c.bio}</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-[#171044]/10 flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEditModal(c)}
                    className="p-1.5 text-[#171044]/70 hover:text-[#171044] hover:bg-[#171044]/10 rounded-lg transition-colors"
                    title="Edit coach profile"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteCoach(c)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete coach profile"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </StateContainer>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-[#171044]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card variant="standard" className="w-full max-w-lg p-6 space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#171044]/10 pb-4">
              <h3 className="text-xl font-bold font-display text-[#171044]">Assign Coach Profile</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[#171044]/60 hover:text-[#171044]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label htmlFor={createUserId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Coach User Account <span className="text-red-500">*</span>
                </label>
                <select
                  id={createUserId}
                  value={formUserId}
                  onChange={(e) => {
                    setFormUserId(e.target.value);
                    if (createFieldErrors.user) setCreateFieldErrors((prev) => ({ ...prev, user: '' }));
                  }}
                  className={`w-full px-4 py-2 bg-[#F7F1E8] border rounded-xl text-sm font-semibold outline-none ${
                    createFieldErrors.user ? 'border-red-500' : 'border-[#171044]/20'
                  }`}
                >
                  <option value="">Select Coach User...</option>
                  {candidateUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
                {createFieldErrors.user && (
                  <p className="text-xs text-red-600 font-bold mt-1">{createFieldErrors.user}</p>
                )}
              </div>

              <div>
                <label htmlFor={createTitleId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Professional Title <span className="text-red-500">*</span>
                </label>
                <input
                  id={createTitleId}
                  type="text"
                  placeholder="e.g. Head Football Coach"
                  value={formTitle}
                  onChange={(e) => {
                    setFormTitle(e.target.value);
                    if (createFieldErrors.title) setCreateFieldErrors((prev) => ({ ...prev, title: '' }));
                  }}
                  className={`w-full px-4 py-2 bg-[#F7F1E8] border rounded-xl text-sm outline-none focus:border-[#FF5A00] ${
                    createFieldErrors.title ? 'border-red-500' : 'border-[#171044]/20'
                  }`}
                />
                {createFieldErrors.title && (
                  <p className="text-xs text-red-600 font-bold mt-1">{createFieldErrors.title}</p>
                )}
              </div>

              <div>
                <span className="block text-xs font-bold text-[#171044] uppercase mb-2">Sports Coached</span>
                <div className="flex flex-wrap gap-2">
                  {sports.map((sp) => {
                    const selected = formSports.includes(sp.id);
                    return (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => toggleSport(sp.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                          selected
                            ? 'bg-[#171044] text-[#D8F500]'
                            : 'bg-[#F7F1E8] text-[#171044]/70 hover:bg-[#171044]/10'
                        }`}
                      >
                        {sp.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor={createExpId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                    Experience (Years)
                  </label>
                  <input
                    id={createExpId}
                    type="number"
                    min="0"
                    value={formExpYears}
                    onChange={(e) => setFormExpYears(e.target.value)}
                    className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <label htmlFor={createPublicId} className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#171044]">
                    <input
                      id={createPublicId}
                      type="checkbox"
                      checked={formIsPublic}
                      onChange={(e) => setFormIsPublic(e.target.checked)}
                      className="w-4 h-4 rounded text-[#FF5A00]"
                    />
                    <span>Public on Website</span>
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor={createSpecialtiesId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Specialties (comma separated)
                </label>
                <input
                  id={createSpecialtiesId}
                  type="text"
                  placeholder="e.g. Tactical Analysis, Strength & Conditioning"
                  value={formSpecialties}
                  onChange={(e) => setFormSpecialties(e.target.value)}
                  className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                />
              </div>

              <div>
                <label htmlFor={createPhotoId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Coach Photo URL
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    id={createPhotoId}
                    type="url"
                    placeholder="https://..."
                    value={formPhoto}
                    onChange={(e) => setFormPhoto(e.target.value)}
                    className="flex-1 px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                  />
                  <div className="w-10 h-10 shrink-0 rounded-xl border border-[#171044]/20 overflow-hidden bg-[#171044]">
                    <SafeImage
                      src={formPhoto}
                      alt="Preview"
                      fallbackKind="coach"
                      name={formTitle || 'Coach'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-[#171044]/60 mt-1 font-semibold">
                  Optional. Must start with https://
                </p>
              </div>

              <div>
                <label htmlFor={createBioId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Coach Bio
                </label>
                <textarea
                  id={createBioId}
                  rows={3}
                  value={formBio}
                  onChange={(e) => setFormBio(e.target.value)}
                  className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                />
              </div>

              <div className="pt-4 border-t border-[#171044]/10 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? 'Assigning...' : 'Assign Coach'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingCoach && (
        <div className="fixed inset-0 z-50 bg-[#171044]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card variant="standard" className="w-full max-w-lg p-6 space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#171044]/10 pb-4">
              <h3 className="text-xl font-bold font-display text-[#171044]">
                Edit Coach: {editingCoach.user?.name || editingCoach.title}
              </h3>
              <button onClick={() => setEditingCoach(null)} className="text-[#171044]/60 hover:text-[#171044]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label htmlFor={editTitleId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Professional Title <span className="text-red-500">*</span>
                </label>
                <input
                  id={editTitleId}
                  type="text"
                  value={formTitle}
                  onChange={(e) => {
                    setFormTitle(e.target.value);
                    if (editFieldErrors.title) setEditFieldErrors((prev) => ({ ...prev, title: '' }));
                  }}
                  className={`w-full px-4 py-2 bg-[#F7F1E8] border rounded-xl text-sm outline-none focus:border-[#FF5A00] ${
                    editFieldErrors.title ? 'border-red-500' : 'border-[#171044]/20'
                  }`}
                />
                {editFieldErrors.title && (
                  <p className="text-xs text-red-600 font-bold mt-1">{editFieldErrors.title}</p>
                )}
              </div>

              <div>
                <span className="block text-xs font-bold text-[#171044] uppercase mb-2">Sports Coached</span>
                <div className="flex flex-wrap gap-2">
                  {sports.map((sp) => {
                    const selected = formSports.includes(sp.id);
                    return (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => toggleSport(sp.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                          selected
                            ? 'bg-[#171044] text-[#D8F500]'
                            : 'bg-[#F7F1E8] text-[#171044]/70 hover:bg-[#171044]/10'
                        }`}
                      >
                        {sp.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor={editExpId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                    Experience (Years)
                  </label>
                  <input
                    id={editExpId}
                    type="number"
                    min="0"
                    value={formExpYears}
                    onChange={(e) => setFormExpYears(e.target.value)}
                    className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <label htmlFor={editPublicId} className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#171044]">
                    <input
                      id={editPublicId}
                      type="checkbox"
                      checked={formIsPublic}
                      onChange={(e) => setFormIsPublic(e.target.checked)}
                      className="w-4 h-4 rounded text-[#FF5A00]"
                    />
                    <span>Public on Website</span>
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor={editSpecialtiesId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Specialties (comma separated)
                </label>
                <input
                  id={editSpecialtiesId}
                  type="text"
                  value={formSpecialties}
                  onChange={(e) => setFormSpecialties(e.target.value)}
                  className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                />
              </div>

              <div>
                <label htmlFor={editPhotoId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Coach Photo URL
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    id={editPhotoId}
                    type="url"
                    placeholder="https://..."
                    value={formPhoto}
                    onChange={(e) => setFormPhoto(e.target.value)}
                    className="flex-1 px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                  />
                  <div className="w-10 h-10 shrink-0 rounded-xl border border-[#171044]/20 overflow-hidden bg-[#171044]">
                    <SafeImage
                      src={formPhoto}
                      alt="Preview"
                      fallbackKind="coach"
                      name={formTitle || 'Coach'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-[#171044]/60 mt-1 font-semibold">
                  Optional. Must start with https://
                </p>
              </div>

              <div>
                <label htmlFor={editBioId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Coach Bio
                </label>
                <textarea
                  id={editBioId}
                  rows={3}
                  value={formBio}
                  onChange={(e) => setFormBio(e.target.value)}
                  className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                />
              </div>

              <div className="pt-4 border-t border-[#171044]/10 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setEditingCoach(null)}>
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
