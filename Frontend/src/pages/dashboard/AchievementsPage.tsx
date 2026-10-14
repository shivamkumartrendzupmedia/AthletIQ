import React, { useState, useEffect, useCallback } from 'react';
import {
  academyApi,
  mapFieldErrors,
  type AchievementItem,
  type AchievementCategory,
} from '../../services/academyApi';
import { ApiClientError } from '../../lib/apiClient';
import { SafeImage } from '../../components/SafeImage';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Award,
  Calendar,
  AlertCircle,
  X,
  Check,
  Star,
  RefreshCw,
} from 'lucide-react';

const CATEGORIES: AchievementCategory[] = [
  'Tournament Win',
  'Individual Award',
  'Team Milestone',
  'Academy Milestone',
  'Other',
];

export const AchievementsPage: React.FC = () => {
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [featuredFilter, setFeaturedFilter] = useState<string>('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AchievementItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<AchievementItem | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<AchievementCategory>('Tournament Win');
  const [formDate, setFormDate] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formFeatured, setFormFeatured] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchAchievements = useCallback(async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const res = await academyApi.listAchievements({
        page,
        limit: 10,
        search: search.trim() || undefined,
        category: categoryFilter ? (categoryFilter as AchievementCategory) : undefined,
        featured: featuredFilter ? featuredFilter === 'true' : undefined,
      });
      setAchievements(res.items);
      setTotalPages(res.pagination.totalPages || 1);
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to load achievements.';
      setErrorBanner(msg);
      setAchievements([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, featuredFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAchievements();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchAchievements]);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormTitle('');
    setFormDescription('');
    setFormCategory('Tournament Win');
    const today = new Date().toISOString().split('T')[0];
    setFormDate(today);
    setFormImageUrl('');
    setFormFeatured(false);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (item: AchievementItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormDescription(item.description);
    setFormCategory(item.category);
    const dateStr = item.achievedOn ? new Date(item.achievedOn).toISOString().split('T')[0] : '';
    setFormDate(dateStr);
    setFormImageUrl(item.imageUrl || '');
    setFormFeatured(item.featured);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors({});
    setErrorBanner(null);

    // Basic client validation
    const errors: Record<string, string> = {};
    if (!formTitle.trim()) {
      errors.title = 'Title is required';
    } else if (formTitle.trim().length > 120) {
      errors.title = 'Title cannot exceed 120 characters';
    }
    if (!formDescription.trim()) {
      errors.description = 'Description is required';
    } else if (formDescription.trim().length > 500) {
      errors.description = 'Description cannot exceed 500 characters';
    }
    if (!formDate) {
      errors.achievedOn = 'Achieved date is required';
    } else {
      const selected = new Date(formDate);
      if (selected.getTime() > Date.now() + 86400000) {
        errors.achievedOn = 'Achieved date cannot be in the future';
      }
    }
    if (formImageUrl.trim()) {
      if (!/^https:\/\/.+/i.test(formImageUrl.trim())) {
        errors.imageUrl = 'Image URL must use secure https protocol';
      } else if (formImageUrl.trim().length > 500) {
        errors.imageUrl = 'Image URL cannot exceed 500 characters';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setSubmitting(false);
      return;
    }

    try {
      if (editingItem) {
        await academyApi.updateAchievement(editingItem.id, {
          title: formTitle,
          description: formDescription,
          category: formCategory,
          achievedOn: new Date(formDate).toISOString(),
          imageUrl: formImageUrl.trim() ? formImageUrl.trim() : undefined,
          featured: formFeatured,
        });
        setSuccessBanner('Achievement updated successfully.');
      } else {
        await academyApi.createAchievement({
          title: formTitle,
          description: formDescription,
          category: formCategory,
          achievedOn: new Date(formDate).toISOString(),
          imageUrl: formImageUrl.trim() ? formImageUrl.trim() : undefined,
          featured: formFeatured,
        });
        setSuccessBanner('Achievement created successfully.');
      }
      closeModal();
      fetchAchievements();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        const mapped = mapFieldErrors(err);
        if (Object.keys(mapped).length > 0) {
          setFormErrors(mapped);
        } else {
          setFormErrors({ general: err.message || 'Validation failed.' });
        }
      } else {
        setFormErrors({ general: err instanceof Error ? err.message : 'An error occurred.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (item: AchievementItem) => {
    setDeletingItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setSubmitting(true);
    try {
      await academyApi.deleteAchievement(deletingItem.id);
      setSuccessBanner('Achievement deleted successfully.');
      setIsDeleteModalOpen(false);
      setDeletingItem(null);
      fetchAchievements();
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to delete achievement.';
      setErrorBanner(msg);
      setIsDeleteModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#171044]/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#FF5A00]/10 text-[#FF5A00] rounded-xl">
              <Award size={24} />
            </span>
            <h1 className="text-3xl font-black font-display text-[#171044] tracking-tight">
              Achievements
            </h1>
          </div>
          <p className="mt-1 text-sm text-[#171044]/70 font-medium">
            Manage academy milestones, tournament titles, and hall of fame honors.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-6 py-3 bg-[#171044] hover:bg-[#281c66] text-[#D8F500] font-display font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all active:scale-95"
        >
          <Plus size={16} />
          <span>Add Achievement</span>
        </button>
      </div>

      {/* Global Status Banners */}
      {errorBanner && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-700 rounded-2xl flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-600 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button onClick={() => setErrorBanner(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {successBanner && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 rounded-2xl flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-[#171044]/10 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#171044]/40" />
          <input
            type="text"
            placeholder="Search by title or description..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-[#F7F1E8]/50 border border-[#171044]/10 rounded-xl text-xs font-medium focus:outline-none focus:border-[#171044] transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-[#F7F1E8]/50 border border-[#171044]/10 rounded-xl text-xs font-bold text-[#171044] focus:outline-none"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={featuredFilter}
            onChange={(e) => {
              setFeaturedFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-[#F7F1E8]/50 border border-[#171044]/10 rounded-xl text-xs font-bold text-[#171044] focus:outline-none"
          >
            <option value="">All Featured</option>
            <option value="true">Featured Only</option>
            <option value="false">Non-Featured</option>
          </select>

          <button
            onClick={() => fetchAchievements()}
            className="p-2 bg-[#F7F1E8] hover:bg-[#171044]/10 rounded-xl text-[#171044] transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 text-center font-display font-bold text-sm text-[#171044]/60">
          Loading achievements...
        </div>
      ) : achievements.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#171044]/10 space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#171044]/5 text-[#171044]/40 mx-auto flex items-center justify-center">
            <Award size={32} />
          </div>
          <h3 className="text-xl font-bold font-display text-[#171044]">No achievements found</h3>
          <p className="text-xs text-[#171044]/60 max-w-sm mx-auto">
            {search || categoryFilter || featuredFilter
              ? 'No achievements match your filter criteria. Try clearing filters.'
              : 'Start building your academy hall of fame by recording your first achievement.'}
          </p>
          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 bg-[#FF5A00] text-white font-display font-bold text-xs uppercase tracking-wider rounded-xl shadow hover:bg-[#e04f00] transition-colors"
          >
            Add Achievement Now
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[#171044]/10 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F1E8]/70 border-b border-[#171044]/10 text-[#171044]/70 uppercase font-black tracking-wider">
                <tr>
                  <th className="py-4 px-6">Achievement</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Achieved Date</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#171044]/5">
                {achievements.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F7F1E8]/20 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#171044] text-[#D8F500] shrink-0 flex items-center justify-center border border-[#171044]/10">
                          <SafeImage
                            src={item.imageUrl}
                            alt={item.title}
                            name={item.title}
                            fallbackKind="program"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <div className="font-bold font-display text-sm text-[#171044]">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-[#171044]/60 line-clamp-1 max-w-md">
                            {item.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-3 py-1 bg-[#171044]/5 text-[#171044] rounded-full font-bold text-[10px] uppercase tracking-wide border border-[#171044]/10">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium text-[#171044]/80">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-[#171044]/40" />
                        {new Date(item.achievedOn).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {item.featured ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#D8F500]/30 text-[#171044] border border-[#D8F500] rounded-full text-[10px] font-black uppercase tracking-wider">
                          <Star size={11} className="fill-[#171044]" /> Featured
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#171044]/40 font-semibold">Standard</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-2 hover:bg-[#171044]/10 rounded-xl text-[#171044] transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => confirmDelete(item)}
                          className="p-2 hover:bg-red-500/10 rounded-xl text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-[#171044]/10 bg-[#F7F1E8]/30 flex items-center justify-between text-xs">
              <span className="text-[#171044]/60 font-medium">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-white border border-[#171044]/15 rounded-lg font-bold disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 bg-white border border-[#171044]/15 rounded-lg font-bold disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#171044]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-[#171044]/10 overflow-hidden animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-[#171044] text-white flex items-center justify-between">
              <h3 className="font-display font-black text-lg tracking-tight">
                {editingItem ? 'Edit Achievement' : 'New Achievement'}
              </h3>
              <button onClick={closeModal} className="text-white/60 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Error Banner inside Modal */}
            {formErrors.general && (
              <div className="m-6 mb-0 p-3 bg-red-500/10 border border-red-500/30 text-red-600 rounded-xl text-xs font-semibold">
                {formErrors.general}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#171044]/70 mb-1">
                  Title <span className="text-[#FF5A00]">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  placeholder="e.g. State Youth Cup Champions"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F7F1E8]/50 border border-[#171044]/15 rounded-xl text-xs font-medium focus:outline-none focus:border-[#171044]"
                />
                {formErrors.title && (
                  <p className="mt-1 text-[11px] font-bold text-red-600">title: {formErrors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#171044]/70 mb-1">
                  Category <span className="text-[#FF5A00]">*</span>
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as AchievementCategory)}
                  className="w-full px-4 py-2.5 bg-[#F7F1E8]/50 border border-[#171044]/15 rounded-xl text-xs font-bold text-[#171044] focus:outline-none focus:border-[#171044]"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {formErrors.category && (
                  <p className="mt-1 text-[11px] font-bold text-red-600">category: {formErrors.category}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#171044]/70 mb-1">
                  Achieved Date <span className="text-[#FF5A00]">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F7F1E8]/50 border border-[#171044]/15 rounded-xl text-xs font-medium focus:outline-none focus:border-[#171044]"
                />
                {formErrors.achievedOn && (
                  <p className="mt-1 text-[11px] font-bold text-red-600">achievedOn: {formErrors.achievedOn}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#171044]/70 mb-1">
                  Description <span className="text-[#FF5A00]">*</span>
                </label>
                <textarea
                  required
                  maxLength={500}
                  rows={3}
                  placeholder="Summary of tournament, milestone, or award..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F7F1E8]/50 border border-[#171044]/15 rounded-xl text-xs font-medium focus:outline-none focus:border-[#171044]"
                />
                {formErrors.description && (
                  <p className="mt-1 text-[11px] font-bold text-red-600">description: {formErrors.description}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#171044]/70 mb-1">
                  Image URL (Optional https://)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/trophy.png"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F7F1E8]/50 border border-[#171044]/15 rounded-xl text-xs font-medium focus:outline-none focus:border-[#171044]"
                />
                {formErrors.imageUrl && (
                  <p className="mt-1 text-[11px] font-bold text-red-600">imageUrl: {formErrors.imageUrl}</p>
                )}
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <input
                  type="checkbox"
                  id="featuredCheck"
                  checked={formFeatured}
                  onChange={(e) => setFormFeatured(e.target.checked)}
                  className="w-4 h-4 rounded text-[#171044] focus:ring-[#171044]"
                />
                <label htmlFor="featuredCheck" className="text-xs font-bold text-[#171044] select-none cursor-pointer">
                  Feature this achievement on Home and highlights
                </label>
              </div>

              {/* Actions */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#171044]/10">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 border border-[#171044]/20 rounded-xl text-xs font-bold text-[#171044] hover:bg-[#F7F1E8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-[#171044] hover:bg-[#281c66] text-[#D8F500] font-display font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingItem && (
        <div className="fixed inset-0 z-50 bg-[#171044]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-[#171044]/10 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center">
              <Trash2 size={24} />
            </div>
            <h3 className="font-display font-black text-lg text-[#171044]">
              Delete Achievement?
            </h3>
            <p className="text-xs text-[#171044]/70 leading-relaxed font-medium">
              Are you sure you want to permanently delete{' '}
              <span className="font-bold text-[#171044]">"{deletingItem.title}"</span>? This action
              cannot be undone.
            </p>
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border border-[#171044]/20 rounded-xl text-xs font-bold text-[#171044]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDelete}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-display font-bold text-xs uppercase rounded-xl transition-colors disabled:opacity-50"
              >
                {submitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
