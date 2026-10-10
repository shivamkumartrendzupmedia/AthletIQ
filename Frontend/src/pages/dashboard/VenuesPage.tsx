import React, { useState, useEffect, useCallback, useId } from 'react';
import { Card, CrossAccent, AthleticBadge, Button } from '../../design-system';
import { Plus, Edit2, Trash2, AlertTriangle, CheckCircle2, X, MapPin } from 'lucide-react';
import { StateContainer } from '../../components/StateContainer';
import { academyApi, type VenueItem, mapFieldErrors } from '../../services/academyApi';
import { ApiClientError } from '../../lib/apiClient';

export const VenuesPage: React.FC = () => {
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVenue, setEditingVenue] = useState<VenueItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string>>({});
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});

  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCapacity, setFormCapacity] = useState('');
  const [formActive, setFormActive] = useState(true);

  const createNameId = useId();
  const createAddressId = useId();
  const createCapacityId = useId();
  const createActiveId = useId();

  const editNameId = useId();
  const editAddressId = useId();
  const editCapacityId = useId();
  const editActiveId = useId();

  const fetchVenues = useCallback(async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const res = await academyApi.listVenues({ limit: 100 });
      setVenues(res.items);
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to load venues.';
      setErrorBanner(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVenues();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchVenues]);

  const openCreateModal = () => {
    setFormName('');
    setFormAddress('');
    setFormCapacity('');
    setFormActive(true);
    setCreateFieldErrors({});
    setShowCreateModal(true);
  };

  const openEditModal = (v: VenueItem) => {
    setEditingVenue(v);
    setFormName(v.name);
    setFormAddress(v.address);
    setFormCapacity(v.capacity !== undefined ? String(v.capacity) : '');
    setFormActive(v.active);
    setEditFieldErrors({});
  };

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorBanner(null);
    setCreateFieldErrors({});
    try {
      await academyApi.createVenue({
        name: formName,
        address: formAddress,
        capacity: formCapacity ? Number(formCapacity) : undefined,
        active: formActive,
      });
      setShowCreateModal(false);
      setSuccessBanner('Venue created successfully.');
      fetchVenues();
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

  const handleUpdateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVenue) return;
    setSubmitting(true);
    setErrorBanner(null);
    setEditFieldErrors({});
    try {
      await academyApi.updateVenue(editingVenue.id, {
        name: formName,
        address: formAddress,
        capacity: formCapacity ? Number(formCapacity) : undefined,
        active: formActive,
      });
      setEditingVenue(null);
      setSuccessBanner('Venue updated successfully.');
      fetchVenues();
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

  const handleDeleteVenue = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete venue "${name}"?`)) return;
    setErrorBanner(null);
    setSuccessBanner(null);
    try {
      await academyApi.deleteVenue(id);
      setSuccessBanner(`Venue "${name}" deleted.`);
      fetchVenues();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 409) {
          setErrorBanner(`Cannot delete venue: it is currently referenced by scheduled tournament matches.`);
        } else {
          setErrorBanner(err.message);
        }
      } else {
        setErrorBanner('Failed to delete venue.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#171044]">Venues & Facilities</h1>
            <CrossAccent color="orange" size="sm" />
          </div>
          <p className="text-sm text-[#111111]/60">Manage match pitches, stadiums, and arena facilities</p>
        </div>
        <Button onClick={openCreateModal} variant="primary" className="inline-flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>Add Venue</span>
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
        empty={venues.length === 0}
        emptyMessage="No venues registered yet. Add pitch facilities for tournament fixtures."
        onRetry={fetchVenues}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {venues.map((venue) => (
            <Card key={venue.id} className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#E65100]" />
                    <h3 className="font-semibold text-lg text-[#171044]">{venue.name}</h3>
                  </div>
                  <AthleticBadge variant={venue.active ? 'lime' : 'dark'} size="sm">
                    {venue.active ? 'Active' : 'Inactive'}
                  </AthleticBadge>
                </div>
                <p className="text-sm text-[#111111]/70 line-clamp-2">{venue.address}</p>
                {venue.capacity !== undefined && (
                  <div className="text-xs text-[#111111]/60 font-medium">
                    Capacity: {venue.capacity.toLocaleString()} spectators
                  </div>
                )}
                {venue.createdBy?.name && (
                  <div className="text-xs text-[#111111]/40">Added by: {venue.createdBy.name}</div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-[#111111]/10 flex items-center justify-end gap-2">
                <Button
                  onClick={() => openEditModal(venue)}
                  variant="outline"
                  size="sm"
                  className="inline-flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </Button>
                <Button
                  onClick={() => handleDeleteVenue(venue.id, venue.name)}
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
              <h2 className="text-xl font-bold text-[#171044]">Add New Venue</h2>
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

            <form onSubmit={handleCreateVenue} className="space-y-4">
              <div>
                <label htmlFor={createNameId} className="block text-xs font-bold uppercase text-[#111111]/60 mb-1">
                  Venue Name *
                </label>
                <input
                  id={createNameId}
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Center Pitch A"
                  className="w-full px-3 py-2 border border-[#111111]/20 rounded-lg text-sm focus:outline-none focus:border-[#E65100]"
                />
              </div>

              <div>
                <label htmlFor={createAddressId} className="block text-xs font-bold uppercase text-[#111111]/60 mb-1">
                  Address / Location *
                </label>
                <textarea
                  id={createAddressId}
                  required
                  rows={2}
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="e.g. 100 Academy Road, Sector 4"
                  className="w-full px-3 py-2 border border-[#111111]/20 rounded-lg text-sm focus:outline-none focus:border-[#E65100]"
                />
              </div>

              <div>
                <label htmlFor={createCapacityId} className="block text-xs font-bold uppercase text-[#111111]/60 mb-1">
                  Spectator Capacity (Optional)
                </label>
                <input
                  id={createCapacityId}
                  type="number"
                  min="0"
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full px-3 py-2 border border-[#111111]/20 rounded-lg text-sm focus:outline-none focus:border-[#E65100]"
                />
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
                  Active and available for match scheduling
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#111111]/10">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Venue'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingVenue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#171044]/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#111111]/10">
              <h2 className="text-xl font-bold text-[#171044]">Edit Venue</h2>
              <button
                onClick={() => setEditingVenue(null)}
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

            <form onSubmit={handleUpdateVenue} className="space-y-4">
              <div>
                <label htmlFor={editNameId} className="block text-xs font-bold uppercase text-[#111111]/60 mb-1">
                  Venue Name *
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
                <label htmlFor={editAddressId} className="block text-xs font-bold uppercase text-[#111111]/60 mb-1">
                  Address / Location *
                </label>
                <textarea
                  id={editAddressId}
                  required
                  rows={2}
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-[#111111]/20 rounded-lg text-sm focus:outline-none focus:border-[#E65100]"
                />
              </div>

              <div>
                <label htmlFor={editCapacityId} className="block text-xs font-bold uppercase text-[#111111]/60 mb-1">
                  Spectator Capacity (Optional)
                </label>
                <input
                  id={editCapacityId}
                  type="number"
                  min="0"
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(e.target.value)}
                  className="w-full px-3 py-2 border border-[#111111]/20 rounded-lg text-sm focus:outline-none focus:border-[#E65100]"
                />
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
                  Active and available for match scheduling
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#111111]/10">
                <Button type="button" variant="outline" onClick={() => setEditingVenue(null)}>
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
