import React, { useState, useEffect, useCallback, useId } from 'react';
import { Card, CrossAccent, AthleticBadge, Button } from '../../design-system';
import { Plus, Edit2, Trash2, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { StateContainer } from '../../components/StateContainer';
import { SafeImage } from '../../components/SafeImage';
import { academyApi, type SportItem, mapFieldErrors } from '../../services/academyApi';
import { ApiClientError } from '../../lib/apiClient';

const AVAILABLE_AGE_GROUPS = ['U10', 'U12', 'U14', 'U16', 'U18', 'U21', 'Senior'];

export const SportManagementPage: React.FC = () => {
  const [sports, setSports] = useState<SportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSport, setEditingSport] = useState<SportItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string>>({});
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAgeGroups, setFormAgeGroups] = useState<string[]>(['U16', 'U18']);
  const [formFeatures, setFormFeatures] = useState('');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formIcon, setFormIcon] = useState('');
  const [formImage, setFormImage] = useState('');

  // Accessible unique IDs
  const createNameId = useId();
  const createDescId = useId();
  const createStatusId = useId();
  const createFeaturesId = useId();
  const createIconId = useId();
  const createImageId = useId();

  const editNameId = useId();
  const editDescId = useId();
  const editStatusId = useId();
  const editFeaturesId = useId();
  const editIconId = useId();
  const editImageId = useId();

  const fetchSports = useCallback(async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const res = await academyApi.listSports({ limit: 100 });
      setSports(res.items);
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to load sports.';
      setErrorBanner(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSports();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchSports]);

  const openCreateModal = () => {
    setFormName('');
    setFormDescription('');
    setFormAgeGroups(['U16', 'U18']);
    setFormFeatures('Tournament Training, Certified Coaches');
    setFormStatus('Active');
    setFormIcon('');
    setFormImage('');
    setCreateFieldErrors({});
    setShowCreateModal(true);
  };

  const openEditModal = (s: SportItem) => {
    setEditingSport(s);
    setFormName(s.name);
    setFormDescription(s.description);
    setFormAgeGroups(s.ageGroups || []);
    setFormFeatures((s.features || []).join(', '));
    setFormStatus(s.status);
    setFormIcon(s.icon || '');
    setFormImage(s.image || '');
    setEditFieldErrors({});
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateFieldErrors({});
    const clientErrors: Record<string, string> = {};
    if (!formName.trim()) clientErrors.name = 'Sport name is required';
    if (!formDescription.trim()) clientErrors.description = 'Description is required';

    if (Object.keys(clientErrors).length > 0) {
      setCreateFieldErrors(clientErrors);
      setErrorBanner('Please fill in all required fields marked below.');
      return;
    }

    setSubmitting(true);
    setErrorBanner(null);
    try {
      const featuresArr = formFeatures
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);

      await academyApi.createSport({
        name: formName.trim(),
        description: formDescription.trim(),
        ageGroups: formAgeGroups,
        features: featuresArr,
        status: formStatus,
        icon: formIcon.trim() || undefined,
        image: formImage.trim() || undefined,
      });

      setShowCreateModal(false);
      setSuccessBanner(`Sport "${formName}" created successfully.`);
      fetchSports();
    } catch (err: unknown) {
      const mapped = mapFieldErrors(err);
      if (Object.keys(mapped).length > 0) {
        setCreateFieldErrors(mapped);
      }
      const msg = err instanceof ApiClientError ? err.message : 'Failed to create sport.';
      setErrorBanner(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSport) return;
    setEditFieldErrors({});
    const clientErrors: Record<string, string> = {};
    if (!formName.trim()) clientErrors.name = 'Sport name cannot be empty';
    if (!formDescription.trim()) clientErrors.description = 'Description cannot be empty';

    if (Object.keys(clientErrors).length > 0) {
      setEditFieldErrors(clientErrors);
      setErrorBanner('Please fill in all required fields marked below.');
      return;
    }

    setSubmitting(true);
    setErrorBanner(null);
    try {
      const featuresArr = formFeatures
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);

      await academyApi.updateSport(editingSport.id, {
        name: formName.trim(),
        description: formDescription.trim(),
        ageGroups: formAgeGroups,
        features: featuresArr,
        status: formStatus,
        icon: formIcon.trim() || undefined,
        image: formImage.trim() || undefined,
      });

      setEditingSport(null);
      setSuccessBanner(`Sport "${formName}" updated successfully.`);
      fetchSports();
    } catch (err: unknown) {
      const mapped = mapFieldErrors(err);
      if (Object.keys(mapped).length > 0) {
        setEditFieldErrors(mapped);
      }
      const msg = err instanceof ApiClientError ? err.message : 'Failed to update sport.';
      setErrorBanner(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSport = async (s: SportItem) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete sport "${s.name}"? If active teams reference this sport, deletion will be blocked.`
    );
    if (!confirmed) return;
    setErrorBanner(null);
    try {
      await academyApi.deleteSport(s.id);
      setSuccessBanner(`Sport "${s.name}" deleted.`);
      fetchSports();
    } catch (err: unknown) {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : 'Failed to delete sport. It may be referenced by existing teams.';
      setErrorBanner(msg);
    }
  };

  const toggleAgeGroup = (ag: string) => {
    setFormAgeGroups((prev) =>
      prev.includes(ag) ? prev.filter((item) => item !== ag) : [...prev, ag]
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <AthleticBadge variant="purple">ACADEMY SPORTS PROGRAMS</AthleticBadge>
          <h1 className="text-3xl md:text-4xl font-black font-display text-[#171044] mt-2">
            SPORTS & AGE GROUP BRACKETS ({(sports || []).length}) <CrossAccent color="orange" size="md" />
          </h1>
        </div>

        <Button variant="primary" iconLeft={<Plus size={18} />} onClick={openCreateModal}>
          Add Sport Program
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
        loading={loading && (sports || []).length === 0}
        error={errorBanner}
        empty={!loading && (sports || []).length === 0}
        emptyMessage="No sports programs created yet"
        emptyActionLabel="Add First Sport Program"
        onEmptyAction={openCreateModal}
        onRetry={fetchSports}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(sports || []).map((s) => (
            <Card key={s.id} variant="standard" className="space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <AthleticBadge variant={s.status === 'Active' ? 'lime' : 'dark'}>
                    {s.status}
                  </AthleticBadge>
                  <span className="text-xs font-bold text-[#FF5A00]">
                    {s.teamCount ?? 0} Teams
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-[#171044]/15">
                    <SafeImage
                      src={s.image || s.icon}
                      alt={s.name}
                      fallbackKind="program"
                      name={s.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-2xl font-bold font-display text-[#171044]">{s.name}</h3>
                </div>
                <div className="text-xs font-bold text-[#171044]/80">
                  Active Age Brackets:{' '}
                  <span className="text-[#4B2A9B]">
                    {s.ageGroups && s.ageGroups.length > 0 ? s.ageGroups.join(', ') : 'None'}
                  </span>
                </div>
                <p className="text-xs text-[#171044]/70 leading-relaxed line-clamp-3">
                  {s.description}
                </p>
                {s.features && s.features.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {s.features.map((f, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-semibold bg-[#F7F1E8] text-[#171044] px-2 py-0.5 rounded-md"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-[#171044]/10 flex items-center justify-end gap-2">
                <button
                  onClick={() => openEditModal(s)}
                  className="p-1.5 text-[#171044]/70 hover:text-[#171044] hover:bg-[#171044]/10 rounded-lg transition-colors"
                  title="Edit sport"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDeleteSport(s)}
                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete sport"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      </StateContainer>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-[#171044]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card variant="standard" className="w-full max-w-lg p-6 space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#171044]/10 pb-4">
              <h3 className="text-xl font-bold font-display text-[#171044]">Add Sport Program</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[#171044]/60 hover:text-[#171044]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label htmlFor={createNameId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Sport Name <span className="text-red-500">*</span>
                </label>
                <input
                  id={createNameId}
                  type="text"
                  placeholder="e.g. Football Academy"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (createFieldErrors.name) setCreateFieldErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  className={`w-full px-4 py-2 bg-[#F7F1E8] border rounded-xl text-sm outline-none focus:border-[#FF5A00] ${
                    createFieldErrors.name ? 'border-red-500' : 'border-[#171044]/20'
                  }`}
                />
                {createFieldErrors.name && (
                  <p className="text-xs text-red-600 font-bold mt-1">{createFieldErrors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor={createDescId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id={createDescId}
                  rows={3}
                  placeholder="Program overview and training methodology..."
                  value={formDescription}
                  onChange={(e) => {
                    setFormDescription(e.target.value);
                    if (createFieldErrors.description) setCreateFieldErrors((prev) => ({ ...prev, description: '' }));
                  }}
                  className={`w-full px-4 py-2 bg-[#F7F1E8] border rounded-xl text-sm outline-none focus:border-[#FF5A00] ${
                    createFieldErrors.description ? 'border-red-500' : 'border-[#171044]/20'
                  }`}
                />
                {createFieldErrors.description && (
                  <p className="text-xs text-red-600 font-bold mt-1">{createFieldErrors.description}</p>
                )}
              </div>

              <div>
                <span className="block text-xs font-bold text-[#171044] uppercase mb-2">Age Group Brackets</span>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_AGE_GROUPS.map((ag) => {
                    const selected = formAgeGroups.includes(ag);
                    return (
                      <button
                        key={ag}
                        type="button"
                        onClick={() => toggleAgeGroup(ag)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                          selected
                            ? 'bg-[#171044] text-[#D8F500]'
                            : 'bg-[#F7F1E8] text-[#171044]/70 hover:bg-[#171044]/10'
                        }`}
                      >
                        {ag}
                      </button>
                    );
                  })}
                </div>
                {createFieldErrors.ageGroups && (
                  <p className="text-xs text-red-600 font-bold mt-1">{createFieldErrors.ageGroups}</p>
                )}
              </div>

              <div>
                <label htmlFor={createFeaturesId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Features (comma separated)
                </label>
                <input
                  id={createFeaturesId}
                  type="text"
                  placeholder="e.g. FIFA Standard Pitch, Video Analysis"
                  value={formFeatures}
                  onChange={(e) => setFormFeatures(e.target.value)}
                  className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                />
                {createFieldErrors.features && (
                  <p className="text-xs text-red-600 font-bold mt-1">{createFieldErrors.features}</p>
                )}
              </div>

              <div>
                <label htmlFor={createImageId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Sport Banner Image URL
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    id={createImageId}
                    type="url"
                    placeholder="https://..."
                    value={formImage}
                    onChange={(e) => setFormImage(e.target.value)}
                    className="flex-1 px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                  />
                  <div className="w-10 h-10 shrink-0 rounded-xl border border-[#171044]/20 overflow-hidden bg-[#171044]">
                    <SafeImage
                      src={formImage}
                      alt="Preview"
                      fallbackKind="program"
                      name={formName || 'Sport'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-[#171044]/60 mt-1 font-semibold">
                  Optional. Must start with https://
                </p>
              </div>

              <div>
                <label htmlFor={createIconId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Icon URL
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    id={createIconId}
                    type="url"
                    placeholder="https://..."
                    value={formIcon}
                    onChange={(e) => {
                      setFormIcon(e.target.value);
                      if (createFieldErrors.icon) setCreateFieldErrors((prev) => ({ ...prev, icon: '' }));
                    }}
                    className={`flex-1 px-4 py-2 bg-[#F7F1E8] border rounded-xl text-sm outline-none focus:border-[#FF5A00] ${
                      createFieldErrors.icon ? 'border-red-500' : 'border-[#171044]/20'
                    }`}
                  />
                  <div className="w-10 h-10 shrink-0 rounded-xl border border-[#171044]/20 overflow-hidden bg-[#171044]">
                    <SafeImage
                      src={formIcon}
                      alt="Preview"
                      fallbackKind="program"
                      name={formName || 'Sport'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-[#171044]/60 mt-1 font-semibold">
                  Optional. Must start with https://
                </p>
                {createFieldErrors.icon && (
                  <p className="text-xs text-red-600 font-bold mt-1">{createFieldErrors.icon}</p>
                )}
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

              <div className="pt-4 border-t border-[#171044]/10 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Sport'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingSport && (
        <div className="fixed inset-0 z-50 bg-[#171044]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card variant="standard" className="w-full max-w-lg p-6 space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#171044]/10 pb-4">
              <h3 className="text-xl font-bold font-display text-[#171044]">
                Edit Sport: {editingSport.name}
              </h3>
              <button onClick={() => setEditingSport(null)} className="text-[#171044]/60 hover:text-[#171044]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label htmlFor={editNameId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Sport Name <span className="text-red-500">*</span>
                </label>
                <input
                  id={editNameId}
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (editFieldErrors.name) setEditFieldErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  className={`w-full px-4 py-2 bg-[#F7F1E8] border rounded-xl text-sm outline-none focus:border-[#FF5A00] ${
                    editFieldErrors.name ? 'border-red-500' : 'border-[#171044]/20'
                  }`}
                />
                {editFieldErrors.name && (
                  <p className="text-xs text-red-600 font-bold mt-1">{editFieldErrors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor={editDescId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id={editDescId}
                  rows={3}
                  value={formDescription}
                  onChange={(e) => {
                    setFormDescription(e.target.value);
                    if (editFieldErrors.description) setEditFieldErrors((prev) => ({ ...prev, description: '' }));
                  }}
                  className={`w-full px-4 py-2 bg-[#F7F1E8] border rounded-xl text-sm outline-none focus:border-[#FF5A00] ${
                    editFieldErrors.description ? 'border-red-500' : 'border-[#171044]/20'
                  }`}
                />
                {editFieldErrors.description && (
                  <p className="text-xs text-red-600 font-bold mt-1">{editFieldErrors.description}</p>
                )}
              </div>

              <div>
                <span className="block text-xs font-bold text-[#171044] uppercase mb-2">Age Group Brackets</span>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_AGE_GROUPS.map((ag) => {
                    const selected = formAgeGroups.includes(ag);
                    return (
                      <button
                        key={ag}
                        type="button"
                        onClick={() => toggleAgeGroup(ag)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                          selected
                            ? 'bg-[#171044] text-[#D8F500]'
                            : 'bg-[#F7F1E8] text-[#171044]/70 hover:bg-[#171044]/10'
                        }`}
                      >
                        {ag}
                      </button>
                    );
                  })}
                </div>
                {editFieldErrors.ageGroups && (
                  <p className="text-xs text-red-600 font-bold mt-1">{editFieldErrors.ageGroups}</p>
                )}
              </div>

              <div>
                <label htmlFor={editFeaturesId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Features (comma separated)
                </label>
                <input
                  id={editFeaturesId}
                  type="text"
                  value={formFeatures}
                  onChange={(e) => setFormFeatures(e.target.value)}
                  className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                />
                {editFieldErrors.features && (
                  <p className="text-xs text-red-600 font-bold mt-1">{editFieldErrors.features}</p>
                )}
              </div>

              <div>
                <label htmlFor={editImageId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Sport Banner Image URL
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    id={editImageId}
                    type="url"
                    placeholder="https://..."
                    value={formImage}
                    onChange={(e) => setFormImage(e.target.value)}
                    className="flex-1 px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                  />
                  <div className="w-10 h-10 shrink-0 rounded-xl border border-[#171044]/20 overflow-hidden bg-[#171044]">
                    <SafeImage
                      src={formImage}
                      alt="Preview"
                      fallbackKind="program"
                      name={formName || 'Sport'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-[#171044]/60 mt-1 font-semibold">
                  Optional. Must start with https://
                </p>
              </div>

              <div>
                <label htmlFor={editIconId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Icon URL
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    id={editIconId}
                    type="url"
                    placeholder="https://..."
                    value={formIcon}
                    onChange={(e) => {
                      setFormIcon(e.target.value);
                      if (editFieldErrors.icon) setEditFieldErrors((prev) => ({ ...prev, icon: '' }));
                    }}
                    className={`flex-1 px-4 py-2 bg-[#F7F1E8] border rounded-xl text-sm outline-none focus:border-[#FF5A00] ${
                      editFieldErrors.icon ? 'border-red-500' : 'border-[#171044]/20'
                    }`}
                  />
                  <div className="w-10 h-10 shrink-0 rounded-xl border border-[#171044]/20 overflow-hidden bg-[#171044]">
                    <SafeImage
                      src={formIcon}
                      alt="Preview"
                      fallbackKind="program"
                      name={formName || 'Sport'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-[#171044]/60 mt-1 font-semibold">
                  Optional. Must start with https://
                </p>
                {editFieldErrors.icon && (
                  <p className="text-xs text-red-600 font-bold mt-1">{editFieldErrors.icon}</p>
                )}
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

              <div className="pt-4 border-t border-[#171044]/10 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setEditingSport(null)}>
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
