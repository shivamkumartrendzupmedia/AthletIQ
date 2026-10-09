import React, { useState, useEffect, useCallback, useId } from 'react';
import { Card, CrossAccent, AthleticBadge, Button } from '../../design-system';
import {
  Plus,
  Search,
  Lock,
  Unlock,
  KeyRound,
  History,
  Edit2,
  UserX,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { SafeImage } from '../../components/SafeImage';
import { useAuthenticatedUser } from '../../context/AuthContext';
import {
  academyApi,
  type AdminUserItem,
  type UserAuditItem,
  type PaginationMeta,
  mapFieldErrors,
} from '../../services/academyApi';
import { ApiClientError } from '../../lib/apiClient';

export const UserAccountsPage: React.FC = () => {
  const currentAdmin = useAuthenticatedUser();

  const [users, setUsers] = useState<AdminUserItem[]>([]);
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
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editUser, setEditUser] = useState<AdminUserItem | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<AdminUserItem | null>(null);
  const [auditTarget, setAuditTarget] = useState<AdminUserItem | null>(null);
  const [auditLogs, setAuditLogs] = useState<UserAuditItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Athlete' as 'Admin' | 'Coach' | 'Athlete' | 'Organizer',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    role: 'Athlete' as 'Admin' | 'Coach' | 'Athlete' | 'Organizer',
    isActive: true,
  });

  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Accessible unique IDs for form labels
  const createNameId = useId();
  const createEmailId = useId();
  const createPasswordId = useId();
  const createRoleId = useId();

  const editNameId = useId();
  const editRoleId = useId();
  const editActiveId = useId();

  const resetPasswordId = useId();

  // Password validation checks
  const validatePassword = (pass: string) => {
    return {
      minLength: pass.length >= 8,
      hasUpper: /[A-Z]/.test(pass),
      hasLower: /[a-z]/.test(pass),
      hasNumber: /[0-9]/.test(pass),
      hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pass),
    };
  };

  const createPasswordValid = Object.values(validatePassword(createForm.password)).every(Boolean);
  const resetPasswordValid = Object.values(validatePassword(newPasswordValue)).every(Boolean);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const res = await academyApi.listUsers({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm.trim() || undefined,
        role: roleFilter || undefined,
        isActive: activeFilter === '' ? undefined : activeFilter === 'true',
      });
      setUsers(res.items);
      setPagination(res.pagination);
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to load user accounts.';
      setErrorBanner(msg);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm, roleFilter, activeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string>>({});
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateFieldErrors({});
    const clientErrors: Record<string, string> = {};
    if (!createForm.name.trim()) clientErrors.name = 'Full name is required';
    if (!createForm.email.trim()) clientErrors.email = 'Email address is required';
    if (!createForm.password) clientErrors.password = 'Password is required';
    else if (!createPasswordValid) clientErrors.password = 'Password does not meet complexity requirements';

    if (Object.keys(clientErrors).length > 0) {
      setCreateFieldErrors(clientErrors);
      setErrorBanner('Please resolve the errors highlighted below.');
      return;
    }

    setFormSubmitting(true);
    setErrorBanner(null);
    try {
      await academyApi.createUser({
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role,
      });
      // Safety: Clear password from form state immediately after submission
      setCreateForm({
        name: '',
        email: '',
        password: '',
        role: 'Athlete',
      });
      setShowCreateModal(false);
      setSuccessBanner('User account created successfully.');
      fetchUsers();
    } catch (err: unknown) {
      const mapped = mapFieldErrors(err);
      if (Object.keys(mapped).length > 0) {
        setCreateFieldErrors(mapped);
      }
      const msg = err instanceof ApiClientError ? err.message : 'Failed to create user.';
      setErrorBanner(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditFieldErrors({});
    const clientErrors: Record<string, string> = {};
    if (!editForm.name.trim()) clientErrors.name = 'Full name cannot be empty';

    if (Object.keys(clientErrors).length > 0) {
      setEditFieldErrors(clientErrors);
      setErrorBanner('Please resolve the errors highlighted below.');
      return;
    }

    setFormSubmitting(true);
    setErrorBanner(null);
    try {
      const isSelf = editUser.id === currentAdmin.id;
      await academyApi.updateUser(editUser.id, {
        name: editForm.name.trim(),
        role: isSelf ? undefined : editForm.role,
        isActive: isSelf ? undefined : editForm.isActive,
      });
      setEditUser(null);
      setSuccessBanner('User account updated successfully.');
      fetchUsers();
    } catch (err: unknown) {
      const mapped = mapFieldErrors(err);
      if (Object.keys(mapped).length > 0) {
        setEditFieldErrors(mapped);
      }
      const msg = err instanceof ApiClientError ? err.message : 'Failed to update user.';
      setErrorBanner(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordTarget || !resetPasswordValid) return;
    setFormSubmitting(true);
    setErrorBanner(null);
    try {
      await academyApi.resetUserPassword(resetPasswordTarget.id, newPasswordValue);
      // Safety: Clear password immediately
      setNewPasswordValue('');
      setResetPasswordTarget(null);
      setSuccessBanner(`Password reset successfully for ${resetPasswordTarget.name}.`);
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to reset password.';
      setErrorBanner(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUnlockUser = async (u: AdminUserItem) => {
    setErrorBanner(null);
    try {
      await academyApi.unlockUser(u.id);
      setSuccessBanner(`User account "${u.name}" has been unlocked.`);
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to unlock user account.';
      setErrorBanner(msg);
    }
  };

  const handleToggleActiveUser = async (u: AdminUserItem) => {
    if (u.id === currentAdmin.id) return;
    const action = u.isActive ? 'deactivate' : 'reactivate';
    const confirmed = window.confirm(`Are you sure you want to ${action} user account "${u.name}" (${u.email})?`);
    if (!confirmed) return;
    setErrorBanner(null);
    try {
      await academyApi.updateUser(u.id, { isActive: !u.isActive });
      setSuccessBanner(`User "${u.name}" has been ${u.isActive ? 'deactivated' : 'reactivated'}.`);
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : `Failed to ${action} user.`;
      setErrorBanner(msg);
    }
  };

  const openAuditDrawer = async (u: AdminUserItem) => {
    setAuditTarget(u);
    setAuditLoading(true);
    try {
      const res = await academyApi.getUserAudit(u.id);
      setAuditLogs(res.items);
    } catch {
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <AthleticBadge variant="purple">ACADEMY DIRECTORY</AthleticBadge>
          <h1 className="text-3xl md:text-4xl font-black font-display text-[#171044] mt-2">
            USER ACCOUNTS ({pagination.total}) <CrossAccent color="orange" size="md" />
          </h1>
        </div>

        <Button
          variant="primary"
          iconLeft={<Plus size={18} />}
          onClick={() => {
            setCreateForm({
              name: '',
              email: '',
              password: '',
              role: 'Athlete',
            });
            setShowCreateModal(true);
          }}
        >
          Add User Account
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

      {/* Search and Filters */}
      <Card variant="standard" className="p-4 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-4 top-3 text-[#171044]/40" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-[#F7F1E8] border border-[#171044]/10 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2.5 bg-[#F7F1E8] border border-[#171044]/10 rounded-xl text-xs font-bold text-[#171044] outline-none"
          >
            <option value="">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Coach">Coach</option>
            <option value="Athlete">Athlete</option>
            <option value="Organizer">Organizer</option>
          </select>

          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="px-4 py-2.5 bg-[#F7F1E8] border border-[#171044]/10 rounded-xl text-xs font-bold text-[#171044] outline-none"
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>
        </div>
      </Card>

      {/* Users Table */}
      <Card variant="standard" className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#171044] text-white text-xs font-extrabold uppercase font-display border-b border-white/10">
                <th className="p-4 pl-6">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Lock State</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171044]/10 text-sm font-semibold">
              {loading && (users || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#171044]/60">
                    Loading users...
                  </td>
                </tr>
              ) : (users || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#171044]/60">
                    No user accounts found.
                  </td>
                </tr>
              ) : (
                (users || []).map((u) => {
                  const isSelf = u.id === currentAdmin.id;
                  return (
                    <tr key={u.id} className="hover:bg-[#F7F1E8]/50 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <SafeImage
                            src={u.avatar}
                            alt={u.name}
                            fallbackKind="person"
                            name={u.name}
                            className="w-10 h-10 rounded-full object-cover shrink-0"
                          />
                          <div>
                            <div className="font-bold font-display text-[#171044] flex items-center gap-2">
                              <span>{u.name}</span>
                              {isSelf && (
                                <span className="text-[10px] bg-[#D8F500] text-[#171044] font-black px-2 py-0.5 rounded-full">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[#171044]/60">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <AthleticBadge
                          variant={
                            u.role === 'Admin'
                              ? 'purple'
                              : u.role === 'Coach'
                              ? 'lime'
                              : u.role === 'Organizer'
                              ? 'orange'
                              : 'dark'
                          }
                          size="sm"
                        >
                          {u.role}
                        </AthleticBadge>
                      </td>

                      <td className="p-4">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-green-700 font-bold">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-red-600 font-bold">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        {u.isLocked ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <Lock size={12} className="text-amber-700" />
                            Locked
                          </span>
                        ) : (
                          <span className="text-xs text-[#171044]/40 font-bold">Normal</span>
                        )}
                      </td>

                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {u.isLocked && (
                            <button
                              onClick={() => handleUnlockUser(u)}
                              className="px-2.5 py-1 rounded-lg bg-[#FF5A00] text-white hover:bg-[#e04f00] text-xs font-bold flex items-center gap-1 transition-colors"
                              title="Unlock account"
                            >
                              <Unlock size={14} />
                              <span>Unlock</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setEditUser(u);
                              setEditForm({
                                name: u.name,
                                role: u.role,
                                isActive: u.isActive,
                              });
                            }}
                            className="p-1.5 text-[#171044]/70 hover:text-[#171044] hover:bg-[#171044]/10 rounded-lg transition-colors"
                            title="Edit user"
                          >
                            <Edit2 size={16} />
                          </button>

                          <button
                            onClick={() => {
                              setResetPasswordTarget(u);
                              setNewPasswordValue('');
                            }}
                            className="p-1.5 text-[#171044]/70 hover:text-[#FF5A00] hover:bg-[#FF5A00]/10 rounded-lg transition-colors"
                            title="Reset password"
                          >
                            <KeyRound size={16} />
                          </button>

                          <button
                            onClick={() => openAuditDrawer(u)}
                            className="p-1.5 text-[#171044]/70 hover:text-[#4B2A9B] hover:bg-[#4B2A9B]/10 rounded-lg transition-colors"
                            title="View audit trail"
                          >
                            <History size={16} />
                          </button>

                          <button
                            onClick={() => handleToggleActiveUser(u)}
                            disabled={isSelf}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isSelf
                                ? 'text-gray-300 cursor-not-allowed'
                                : u.isActive
                                ? 'text-red-500 hover:text-red-700 hover:bg-red-50'
                                : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                            }`}
                            title={
                              isSelf
                                ? 'Cannot deactivate self'
                                : u.isActive
                                ? 'Deactivate user'
                                : 'Reactivate user'
                            }
                          >
                            {u.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                          </button>
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
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} users)
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

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-[#171044]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card variant="standard" className="w-full max-w-lg p-6 space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#171044]/10 pb-4">
              <h3 className="text-xl font-bold font-display text-[#171044]">Create User Account</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[#171044]/60 hover:text-[#171044]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label htmlFor={createNameId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Full Name
                </label>
                <input
                  id={createNameId}
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                />
                {createFieldErrors.name && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{createFieldErrors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor={createEmailId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Email Address
                </label>
                <input
                  id={createEmailId}
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                />
                {createFieldErrors.email && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{createFieldErrors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor={createPasswordId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Temporary Password
                </label>
                <input
                  id={createPasswordId}
                  type="password"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                />
                {createFieldErrors.password && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{createFieldErrors.password}</p>
                )}
                {/* Live Password Hints */}
                <div className="mt-2 p-3 bg-[#F7F1E8] rounded-xl space-y-1 text-xs">
                  {(() => {
                    const v = validatePassword(createForm.password);
                    return (
                      <>
                        <div className={v.minLength ? 'text-green-700 font-bold' : 'text-gray-500'}>
                          • At least 8 characters
                        </div>
                        <div className={v.hasUpper ? 'text-green-700 font-bold' : 'text-gray-500'}>
                          • At least 1 uppercase letter
                        </div>
                        <div className={v.hasLower ? 'text-green-700 font-bold' : 'text-gray-500'}>
                          • At least 1 lowercase letter
                        </div>
                        <div className={v.hasNumber ? 'text-green-700 font-bold' : 'text-gray-500'}>
                          • At least 1 number
                        </div>
                        <div className={v.hasSpecial ? 'text-green-700 font-bold' : 'text-gray-500'}>
                          • At least 1 special character (!@#$%^&*)
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div>
                <label htmlFor={createRoleId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Role
                </label>
                <select
                  id={createRoleId}
                  value={createForm.role}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      role: e.target.value as 'Admin' | 'Coach' | 'Athlete' | 'Organizer',
                    })
                  }
                  className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm font-semibold outline-none"
                >
                  <option value="Admin">Admin</option>
                  <option value="Coach">Coach</option>
                  <option value="Athlete">Athlete</option>
                  <option value="Organizer">Organizer</option>
                </select>
                {createFieldErrors.role && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{createFieldErrors.role}</p>
                )}
              </div>

              <div className="pt-4 border-t border-[#171044]/10 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={!createPasswordValid || formSubmitting}>
                  {formSubmitting ? 'Creating...' : 'Create Account'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editUser && (
        <div className="fixed inset-0 z-50 bg-[#171044]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card variant="standard" className="w-full max-w-lg p-6 space-y-6 relative">
            <div className="flex items-center justify-between border-b border-[#171044]/10 pb-4">
              <h3 className="text-xl font-bold font-display text-[#171044]">
                Edit User: {editUser.name}
              </h3>
              <button onClick={() => setEditUser(null)} className="text-[#171044]/60 hover:text-[#171044]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label htmlFor={editNameId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  Full Name
                </label>
                <input
                  id={editNameId}
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                />
                {editFieldErrors.name && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{editFieldErrors.name}</p>
                )}
              </div>

              <div>
                <span className="block text-xs font-bold text-[#171044] uppercase mb-1">Email (Immutable)</span>
                <input
                  type="email"
                  disabled
                  value={editUser.email}
                  className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor={editRoleId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                    Role
                  </label>
                  <select
                    id={editRoleId}
                    disabled={editUser.id === currentAdmin.id}
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        role: e.target.value as 'Admin' | 'Coach' | 'Athlete' | 'Organizer',
                      })
                    }
                    className={`w-full px-4 py-2 rounded-xl text-sm font-semibold outline-none ${
                      editUser.id === currentAdmin.id
                        ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-[#F7F1E8] border border-[#171044]/20'
                    }`}
                  >
                    <option value="Admin">Admin</option>
                    <option value="Coach">Coach</option>
                    <option value="Athlete">Athlete</option>
                    <option value="Organizer">Organizer</option>
                  </select>
                  {editFieldErrors.role && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{editFieldErrors.role}</p>
                  )}
                  {editUser.id === currentAdmin.id && (
                    <span className="text-[10px] text-amber-700 block mt-1">Cannot change your own role</span>
                  )}
                </div>

                <div className="flex flex-col justify-center pt-2">
                  <label
                    htmlFor={editActiveId}
                    className={`flex items-center gap-2 text-xs font-bold ${
                      editUser.id === currentAdmin.id ? 'text-gray-400 cursor-not-allowed' : 'text-[#171044] cursor-pointer'
                    }`}
                  >
                    <input
                      id={editActiveId}
                      type="checkbox"
                      disabled={editUser.id === currentAdmin.id}
                      checked={editForm.isActive}
                      onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                      className="w-4 h-4 rounded text-[#FF5A00]"
                    />
                    <span>Account Active</span>
                  </label>
                  {editUser.id === currentAdmin.id && (
                    <span className="text-[10px] text-amber-700 block mt-1">Cannot deactivate yourself</span>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-[#171044]/10 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setEditUser(null)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={formSubmitting}>
                  {formSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetPasswordTarget && (
        <div className="fixed inset-0 z-50 bg-[#171044]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card variant="standard" className="w-full max-w-md p-6 space-y-6 relative">
            <div className="flex items-center justify-between border-b border-[#171044]/10 pb-4">
              <h3 className="text-xl font-bold font-display text-[#171044]">
                Reset Password: {resetPasswordTarget.name}
              </h3>
              <button onClick={() => setResetPasswordTarget(null)} className="text-[#171044]/60 hover:text-[#171044]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor={resetPasswordId} className="block text-xs font-bold text-[#171044] uppercase mb-1">
                  New Temporary Password
                </label>
                <input
                  id={resetPasswordId}
                  type="password"
                  required
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  className="w-full px-4 py-2 bg-[#F7F1E8] border border-[#171044]/20 rounded-xl text-sm outline-none focus:border-[#FF5A00]"
                />
                <div className="mt-2 p-3 bg-[#F7F1E8] rounded-xl space-y-1 text-xs">
                  {(() => {
                    const v = validatePassword(newPasswordValue);
                    return (
                      <>
                        <div className={v.minLength ? 'text-green-700 font-bold' : 'text-gray-500'}>
                          • At least 8 characters
                        </div>
                        <div className={v.hasUpper ? 'text-green-700 font-bold' : 'text-gray-500'}>
                          • At least 1 uppercase letter
                        </div>
                        <div className={v.hasLower ? 'text-green-700 font-bold' : 'text-gray-500'}>
                          • At least 1 lowercase letter
                        </div>
                        <div className={v.hasNumber ? 'text-green-700 font-bold' : 'text-gray-500'}>
                          • At least 1 number
                        </div>
                        <div className={v.hasSpecial ? 'text-green-700 font-bold' : 'text-gray-500'}>
                          • At least 1 special character
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="pt-4 border-t border-[#171044]/10 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setResetPasswordTarget(null)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={!resetPasswordValid || formSubmitting}>
                  {formSubmitting ? 'Resetting...' : 'Set New Password'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* AUDIT TRAIL DRAWER */}
      {auditTarget && (
        <div className="fixed inset-0 z-50 bg-[#171044]/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-[#171044]/10 pb-4">
              <div>
                <h3 className="text-xl font-bold font-display text-[#171044]">Audit Trail</h3>
                <p className="text-xs text-[#171044]/60">{auditTarget.name} ({auditTarget.email})</p>
              </div>
              <button onClick={() => setAuditTarget(null)} className="text-[#171044]/60 hover:text-[#171044]">
                <X size={20} />
              </button>
            </div>

            {auditLoading ? (
              <div className="py-12 text-center text-xs font-bold text-[#171044]/60">
                Loading audit trail...
              </div>
            ) : (auditLogs || []).length === 0 ? (
              <div className="py-12 text-center text-xs text-[#171044]/60">
                No recorded audit actions for this user account.
              </div>
            ) : (
              <div className="space-y-3">
                {(auditLogs || []).map((log) => (
                  <div key={log.id} className="p-3 bg-[#F7F1E8] rounded-xl space-y-1 text-xs">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-[#4B2A9B]">{log.action}</span>
                      <span className="text-[10px] text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#171044]/80">
                      Actor: {log.actor?.name || 'System'} ({log.actor?.role || 'System'})
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
