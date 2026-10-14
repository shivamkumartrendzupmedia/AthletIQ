import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, CrossAccent } from '../../design-system';
import { User, Lock, Calendar, Eye, EyeOff, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  academyApi,
  type UserProfile,
  type UpdateProfilePayload,
  mapFieldErrors,
} from '../../services/academyApi';
import { buildProfilePayload, buildChangePasswordPayload } from '../../lib/profilePayloads';
import { ApiClientError } from '../../lib/apiClient';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuth();

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [dobInput, setDobInput] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMessage, setProfileSuccessMessage] = useState<string | null>(null);
  const [profileBannerError, setProfileBannerError] = useState<string | null>(null);
  const [profileFieldErrors, setProfileFieldErrors] = useState<Record<string, string>>({});

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null);
  const [passwordBannerError, setPasswordBannerError] = useState<string | null>(null);
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<Record<string, string>>({});

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchProfileData = useCallback(async () => {
    setIsLoadingProfile(true);
    setProfileBannerError(null);
    try {
      const data = await academyApi.getProfile();
      if (data) {
        setProfile(data);
        setNameInput(data.name);
        setDobInput(data.dateOfBirth || '');
      }
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 401) {
          setProfileBannerError('Session expired, please sign in again');
        } else {
          setProfileBannerError(err.message);
        }
      } else {
        setProfileBannerError('Failed to load profile details');
      }
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchProfileData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchProfileData]);

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileBannerError(null);
    setProfileFieldErrors({});
    setProfileSuccessMessage(null);
    setIsSavingProfile(true);

    const payload: UpdateProfilePayload = buildProfilePayload({
      name: nameInput,
      dateOfBirth: dobInput,
    });

    try {
      const data = await academyApi.updateProfile(payload);
      if (data) {
        setProfile(data);
        setNameInput(data.name);
        setDobInput(data.dateOfBirth || '');
        setIsEditing(false);
        setProfileSuccessMessage('Profile updated successfully');

        // Update AuthContext user so header & initials reflect name immediately
        if (user) {
          setUser({
            ...user,
            name: data.name,
          });
        }
      }
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 401) {
          setProfileBannerError('Session expired, please sign in again');
        } else {
          setProfileBannerError(err.message);
          setProfileFieldErrors(mapFieldErrors(err));
        }
      } else {
        setProfileBannerError('An unexpected error occurred while saving profile');
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    if (profile) {
      setNameInput(profile.name);
      setDobInput(profile.dateOfBirth || '');
    }
    setProfileFieldErrors({});
    setProfileBannerError(null);
    setIsEditing(false);
  };

  // Handle Password Change
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordBannerError(null);
    setPasswordFieldErrors({});
    setPasswordSuccessMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordFieldErrors({
        confirmPassword: 'New password and confirm password do not match',
      });
      setPasswordBannerError('confirmPassword: New password and confirm password do not match');
      return;
    }

    setIsSavingPassword(true);

    try {
      const payload = buildChangePasswordPayload({
        currentPassword,
        newPassword,
      });

      await academyApi.changePassword(payload.currentPassword, payload.newPassword);
      setPasswordSuccessMessage('Password changed successfully! Redirecting to login...');

      // Clear session and redirect to /login with visible notice
      setTimeout(async () => {
        try {
          await logout();
        } catch {
          // Ignore
        }
        navigate('/login', {
          replace: true,
          state: {
            message: 'Password changed. Please sign in again.',
          },
        });
      }, 1200);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 401) {
          setPasswordBannerError('Session expired, please sign in again');
        } else {
          setPasswordBannerError(err.message);
          setPasswordFieldErrors(mapFieldErrors(err));
        }
      } else {
        setPasswordBannerError('An unexpected error occurred while changing password');
      }
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
      {/* Top Banner */}
      <div className="bg-[#171044] text-white p-6 sm:p-8 rounded-[2rem] shadow-xl border border-white/10">
        <h1 className="text-2xl sm:text-3xl font-black font-display text-white uppercase tracking-tight flex items-center gap-2">
          My Account &amp; Profile <CrossAccent color="orange" size="md" />
        </h1>
        <p className="text-xs sm:text-sm text-white/60 mt-1">
          Manage your personal profile details, birth date, and account security credentials.
        </p>
      </div>

      {/* CARD 1: PROFILE INFORMATION */}
      <Card variant="dark" className="p-5 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-white/10 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF5A00]/20 flex items-center justify-center text-[#FF5A00] shrink-0">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-white">Profile Details</h2>
              <p className="text-xs text-white/60">Your basic identity and verified age information</p>
            </div>
          </div>
          {!isEditing && !isLoadingProfile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setProfileBannerError(null);
                setProfileSuccessMessage(null);
                setIsEditing(true);
              }}
              className="text-xs font-bold"
            >
              Edit Profile
            </Button>
          )}
        </div>

        {/* Dark ancestor error banner for Profile */}
        {profileBannerError && (
          <div className="p-4 rounded-2xl bg-[#FF3B30]/15 border border-[#FF3B30]/30 text-white flex items-start gap-3">
            <AlertCircle size={18} className="text-[#FF3B30] shrink-0 mt-0.5" />
            <div className="text-xs font-bold leading-relaxed">{profileBannerError}</div>
          </div>
        )}

        {/* Success banner for Profile */}
        {profileSuccessMessage && (
          <div className="p-4 rounded-2xl bg-[#D8F500]/15 border border-[#D8F500]/30 text-white flex items-start gap-3">
            <CheckCircle size={18} className="text-[#D8F500] shrink-0 mt-0.5" />
            <div className="text-xs font-bold leading-relaxed text-[#D8F500]">
              {profileSuccessMessage}
            </div>
          </div>
        )}

        {isLoadingProfile ? (
          <div className="py-8 text-center text-xs text-white/40">Loading profile information...</div>
        ) : !isEditing ? (
          /* READ-ONLY VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-2">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1">
                Full Name
              </span>
              <span className="text-sm sm:text-base font-bold text-white">
                {profile?.name || '—'}
              </span>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1">
                Platform Role
              </span>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#FF5A00]/20 text-[#FF5A00] border border-[#FF5A00]/30">
                {profile?.role || '—'}
              </span>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1">
                Date of Birth
              </span>
              <span className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Calendar size={14} className="text-[#D8F500]" />
                {profile?.dateOfBirth ? profile.dateOfBirth : 'Not specified'}
              </span>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1">
                Calculated Age
              </span>
              <span className="text-sm sm:text-base font-bold text-white">
                {profile?.age !== null && profile?.age !== undefined
                  ? `${profile.age} years old`
                  : '—'}
              </span>
            </div>
          </div>
        ) : (
          /* EDIT MODE FORM */
          <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={nameInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNameInput(e.target.value)}
                placeholder="Enter your full name"
                disabled={isSavingProfile}
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#D8F500] disabled:opacity-50"
              />
              {profileFieldErrors.name && (
                <span className="text-xs text-[#FF3B30] font-bold mt-1 block">
                  {profileFieldErrors.name}
                </span>
              )}
              <span className="text-[11px] text-white/40 mt-1 block">
                Must be between 2 and 80 characters.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
                Date of Birth (YYYY-MM-DD)
              </label>
              <div className="relative">
                <input
                  type="date"
                  max={todayStr}
                  value={dobInput}
                  onChange={(e) => setDobInput(e.target.value)}
                  disabled={isSavingProfile}
                  className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#D8F500] disabled:opacity-50"
                />
              </div>
              {profileFieldErrors.dateOfBirth && (
                <span className="text-xs text-[#FF3B30] font-bold mt-1 block">
                  {profileFieldErrors.dateOfBirth}
                </span>
              )}
              <span className="text-[11px] text-white/40 mt-1 block">
                Must be a valid past date resulting in an age between 5 and 100 years.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-white/10">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handleCancelEdit}
                disabled={isSavingProfile}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isSavingProfile}
                className="w-full sm:w-auto"
              >
                {isSavingProfile ? 'Saving Changes...' : 'Save Profile'}
              </Button>
            </div>
          </form>
        )}
      </Card>

      {/* CARD 2: CHANGE PASSWORD */}
      <Card variant="dark" className="p-5 sm:p-8 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="w-10 h-10 rounded-2xl bg-[#D8F500]/20 flex items-center justify-center text-[#D8F500] shrink-0">
            <Lock size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold font-display text-white">Change Password</h2>
            <p className="text-xs text-white/60">Update your secret credentials to secure your account</p>
          </div>
        </div>

        {/* Security Info & Rules Box */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-white/70 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-white mb-1">
            <Shield size={14} className="text-[#D8F500]" />
            Backend Security Policy Requirements:
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-white/60">
            <li>At least 8 characters long</li>
            <li>At least one uppercase letter (A-Z)</li>
            <li>At least one lowercase letter (a-z)</li>
            <li>At least one number (0-9)</li>
            <li>New password must be different from current password</li>
          </ul>
        </div>

        {/* Dark ancestor error banner for Password */}
        {passwordBannerError && (
          <div className="p-4 rounded-2xl bg-[#FF3B30]/15 border border-[#FF3B30]/30 text-white flex items-start gap-3">
            <AlertCircle size={18} className="text-[#FF3B30] shrink-0 mt-0.5" />
            <div className="text-xs font-bold leading-relaxed">{passwordBannerError}</div>
          </div>
        )}

        {/* Success banner for Password */}
        {passwordSuccessMessage && (
          <div className="p-4 rounded-2xl bg-[#D8F500]/15 border border-[#D8F500]/30 text-white flex items-start gap-3">
            <CheckCircle size={18} className="text-[#D8F500] shrink-0 mt-0.5" />
            <div className="text-xs font-bold leading-relaxed text-[#D8F500]">
              {passwordSuccessMessage}
            </div>
          </div>
        )}

        <form onSubmit={handleSavePassword} className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
              Current Password *
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                disabled={isSavingPassword}
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 pr-12 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#D8F500] disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-4 top-3 text-white/40 hover:text-white"
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {passwordFieldErrors.currentPassword && (
              <span className="text-xs text-[#FF3B30] font-bold mt-1 block">
                {passwordFieldErrors.currentPassword}
              </span>
            )}
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
              New Password *
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new secure password"
                disabled={isSavingPassword}
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 pr-12 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#D8F500] disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-4 top-3 text-white/40 hover:text-white"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {passwordFieldErrors.newPassword && (
              <span className="text-xs text-[#FF3B30] font-bold mt-1 block">
                {passwordFieldErrors.newPassword}
              </span>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
              Confirm New Password *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                disabled={isSavingPassword}
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 pr-12 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#D8F500] disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-3 text-white/40 hover:text-white"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {passwordFieldErrors.confirmPassword && (
              <span className="text-xs text-[#FF3B30] font-bold mt-1 block">
                {passwordFieldErrors.confirmPassword}
              </span>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-white/10">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSavingPassword}
              className="w-full sm:w-auto"
            >
              {isSavingPassword ? 'Updating Password...' : 'Update Password'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ProfilePage;
