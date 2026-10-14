import React, { useState, useEffect, useCallback, useId } from 'react';
import { Card, CrossAccent, AthleticBadge, Button } from '../../design-system';
import { Plus, Edit2, Trash2, AlertTriangle, CheckCircle2, X, UserCheck } from 'lucide-react';
import { StateContainer } from '../../components/StateContainer';
import { academyApi, type OfficialItem, mapFieldErrors } from '../../services/academyApi';
import { ApiClientError } from '../../lib/apiClient';

const OFFICIAL_TYPES: Array<'Referee' | 'Assistant Referee' | 'Scorer'> = [
  'Referee',
  'Assistant Referee',
  'Scorer',
];

export const OfficialsPage: React.FC = () => {
  const [officials, setOfficials] = useState<OfficialItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOfficial, setEditingOfficial] = useState<OfficialItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string>>({});
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});

  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'Referee' | 'Assistant Referee' | 'Scorer'>('Referee');
  const [formActive, setFormActive] = useState(true);

  const createNameId = useId();
  const createTypeId = useId();
  const createActiveId = useId();

  const editNameId = useId();
  const editTypeId = useId();
  const editActiveId = useId();

  const fetchOfficials = useCallback(async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const res = await academyApi.listOfficials({ limit: 100 });
      setOfficials(res.items);
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to load officials.';
      setErrorBanner(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOfficials();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchOfficials]);

  const openCreateModal = () => {
    setFormName('');
    setFormType('Referee');
    setFormActive(true);
    setCreateFieldErrors({});
    setShowCreateModal(true);
  };

  const openEditModal = (o: OfficialItem) => {
    setEditingOfficial(o);
    setFormName(o.name);
    setFormType(o.type);
    setFormActive(o.active);
    setEditFieldErrors({});
  };

  const handleCreateOfficial = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorBanner(null);
    setCreateFieldErrors({});
    try {
      await academyApi.createOfficial({
        name: formName,
        type: formType,
        active: formActive,
      });
      setShowCreateModal(false);
      setSuccessBanner('Official added successfully.');
      fetchOfficials();
    } catch (err: unknown) {
      const mapped = mapFieldErrors(err);
      setCreateFieldErrors(mapped);
      if (err instanceof ApiClientError && !Object.keys(mapped).length) {
        setErrorBanner(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateOfficial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOfficial) return;
    setSubmitting(true);
    setErrorBanner(null);
    setEditFieldErrors({});
    try {
      await academyApi.updateOfficial(editingOfficial.id, {
        name: formName,
        type: formType,
        active: formActive,
      });
      setEditingOfficial(null);
      setSuccessBanner('Official updated successfully.');
      fetchOfficials();
    } catch (err: unknown) {
      const mapped = mapFieldErrors(err);
      setEditFieldErrors(mapped);
      if (err instanceof ApiClientError && !Object.keys(mapped).length) {
        setErrorBanner(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOfficial = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove official "${name}"?`)) return;
    setErrorBanner(null);
    setSuccessBanner(null);
    try {
      await academyApi.deleteOfficial(id);
      setSuccessBanner(`Official "${name}" removed.`);
      fetchOfficials();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 409) {
          setErrorBanner(`Cannot delete official: assigned as referee to scheduled tournament matches.`);
        } else {
          setErrorBanner(err.message);
        }
      } else {
        setErrorBanner('Failed to delete official.');
      }
    }
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#171044]">Match Officials</h1>
            <CrossAccent color="orange" size="sm" />
          </div>
          <p className="text-sm text-[#111111]/60">Manage tournament referees, assistant referees, and scorers</p>
        </div>
        <Button onClick={openCreateModal} variant="primary" className="inline-flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>Add Official</span>
        </Button>
      </div>

      {/* Global Alerts */}
      {errorBanner && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-sm">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorBanner}</div>
          <button onClick={() => setErrorBanner(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{successBanner}</div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* List or Empty State */}
      <StateContainer
        loading={loading}
        empty={officials.length === 0}
        emptyMessage="No officials registered yet. Register certified referees for tournament fixtures."
        onRetry={fetchOfficials}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {officials.map((official) => (
            <Card key={official.id} className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-[#E65100]" />
                    <h3 className="font-semibold text-lg text-[#171044]">{official.name}</h3>
                  </div>
                  <AthleticBadge variant={official.active ? 'lime' : 'dark'} size="sm">
                    {official.active ? 'Active' : 'Inactive'}
                  </AthleticBadge>
                </div>
                <div className="inline-block px-2.5 py-1 bg-[#171044]/5 text-[#171044] rounded-lg text-xs font-semibold">
                  {official.type}
                </div>
                {official.createdBy?.name && (
                  <div className="text-[11px] text-[#111111]/40">Registered by: {official.createdBy.name}</div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-[#111111]/10 flex flex-wrap items-center justify-end gap-2">
                <Button
                  onClick={() => openEditModal(official)}
                  variant="outline"
                  size="sm"
                  className="inline-flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </Button>
                <Button
                  onClick={() => handleDeleteOfficial(official.id, official.name)}
                  variant="outline"
                  size="sm"
                  className="inline-flex items-center gap-1.5 text-red-600 hover:bg-red-50 border-red-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </StateContainer>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#171044]/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#111111]/10">
              <h2 className="text-xl font-bold text-[#171044]">Add Match Official</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#111111]/40 hover:text-[#111111]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {Object.keys(createFieldErrors).length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1 text-xs text-red-800">
                {Object.entries(createFieldErrors).map(([field, msg]) => (
                  <div key={field}>
                    <span className="font-bold capitalize">{field}:</span> {msg}
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleCreateOfficial} className="space-y-4">
              <div>
                <label htmlFor={createNameId} className="block text-xs font-bold uppercase text-[#111111]/60 mb-1">
                  Official Full Name *
                </label>
                <input
                  id={createNameId}
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Official Full Name"
                  className="w-full px-3 py-2 border border-[#111111]/20 rounded-lg text-sm focus:outline-none focus:border-[#E65100]"
                />
              </div>

              <div>
                <label htmlFor={createTypeId} className="block text-xs font-bold uppercase text-[#111111]/60 mb-1">
                  Official Role / Type *
                </label>
                <select
                  id={createTypeId}
                  value={formType}
                  onChange={(e) =>
                    setFormType(e.target.value as 'Referee' | 'Assistant Referee' | 'Scorer')
                  }
                  className="w-full px-3 py-2 border border-[#111111]/20 rounded-lg text-sm focus:outline-none focus:border-[#E65100]"
                >
                  {OFFICIAL_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id={createActiveId}
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="w-4 h-4 text-[#E65100] rounded focus:ring-[#E65100]"
                />
                <label htmlFor={createActiveId} className="text-sm font-medium text-[#111111]">
                  Active and available for match assignment
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#111111]/10">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Official'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingOfficial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#171044]/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#111111]/10">
              <h2 className="text-xl font-bold text-[#171044]">Edit Official</h2>
              <button
                onClick={() => setEditingOfficial(null)}
                className="text-[#111111]/40 hover:text-[#111111]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {Object.keys(editFieldErrors).length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1 text-xs text-red-800">
                {Object.entries(editFieldErrors).map(([field, msg]) => (
                  <div key={field}>
                    <span className="font-bold capitalize">{field}:</span> {msg}
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleUpdateOfficial} className="space-y-4">
              <div>
                <label htmlFor={editNameId} className="block text-xs font-bold uppercase text-[#111111]/60 mb-1">
                  Official Full Name *
                </label>
                <input
                  id={editNameId}
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#111111]/20 rounded-lg text-sm focus:outline-none focus:border-[#E65100]"
                />
              </div>

              <div>
                <label htmlFor={editTypeId} className="block text-xs font-bold uppercase text-[#111111]/60 mb-1">
                  Official Role / Type *
                </label>
                <select
                  id={editTypeId}
                  value={formType}
                  onChange={(e) =>
                    setFormType(e.target.value as 'Referee' | 'Assistant Referee' | 'Scorer')
                  }
                  className="w-full px-3 py-2 border border-[#111111]/20 rounded-lg text-sm focus:outline-none focus:border-[#E65100]"
                >
                  {OFFICIAL_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id={editActiveId}
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="w-4 h-4 text-[#E65100] rounded focus:ring-[#E65100]"
                />
                <label htmlFor={editActiveId} className="text-sm font-medium text-[#111111]">
                  Active and available for match assignment
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#111111]/10">
                <Button type="button" variant="outline" onClick={() => setEditingOfficial(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
