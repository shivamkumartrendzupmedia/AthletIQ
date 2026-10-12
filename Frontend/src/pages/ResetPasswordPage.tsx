import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, Button, CrossAccent } from '../design-system';
import { Lock, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { academyApi } from '../services/academyApi';
import { ApiClientError } from '../lib/apiClient';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setErrorMessage('Reset token is missing from the URL. Please use the link sent to your email.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await academyApi.resetPassword({
        token,
        password,
        confirmPassword,
      });
      setSuccessMessage(res.message || 'Password has been reset successfully. You may now log in.');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Unable to reset password. The link may have expired or already been used.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-md mx-auto">
      <Card variant="dark" className="p-8 md:p-10 shadow-2xl relative overflow-hidden space-y-6">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-block mb-2 group transition-transform duration-200 hover:scale-105">
            <img src="/logo-white.png" alt="ATHLETIQ" className="h-10 md:h-12 w-auto object-contain mx-auto" />
          </Link>
          <h1 className="text-2xl md:text-3xl font-black font-display text-white">
            RESET PASSWORD <CrossAccent color="lime" size="md" />
          </h1>
          <p className="text-xs text-white/70">
            Create a new, strong password to regain access to your account.
          </p>
        </div>

        {!token && (
          <div className="p-3.5 rounded-2xl bg-[#FF3B30]/15 border border-[#FF3B30]/30 text-white flex items-start gap-3">
            <AlertCircle size={18} className="text-[#FF3B30] shrink-0 mt-0.5" />
            <div className="text-xs font-bold leading-relaxed">
              No reset token found in URL. Please click the full link in your recovery email or request a new one below.
            </div>
          </div>
        )}

        {successMessage ? (
          <div className="space-y-6 text-center">
            <div className="p-4 rounded-2xl bg-[#D8F500]/15 border border-[#D8F500]/30 text-white flex items-start gap-3 text-left">
              <CheckCircle2 size={20} className="text-[#D8F500] shrink-0 mt-0.5" />
              <div className="text-xs font-bold leading-relaxed">{successMessage}</div>
            </div>
            <Link to="/login" className="inline-block w-full">
              <Button variant="primary" fullWidth size="lg">
                Log In Now
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-[#FF3B30]/15 border border-[#FF3B30]/30 text-white flex items-start gap-3">
                <AlertCircle size={18} className="text-[#FF3B30] shrink-0 mt-0.5" />
                <div className="text-xs font-bold leading-relaxed">{errorMessage}</div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-3.5 text-white/40" />
                <input
                  type="password"
                  required
                  disabled={isSubmitting || !token}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-2xl pl-12 pr-5 py-3 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#D8F500] disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-3.5 text-white/40" />
                <input
                  type="password"
                  required
                  disabled={isSubmitting || !token}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-2xl pl-12 pr-5 py-3 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#D8F500] disabled:opacity-50"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              disabled={isSubmitting || !token || !password || !confirmPassword}
              className="mt-2"
            >
              {isSubmitting ? 'Updating Password...' : 'Reset Password'}
            </Button>

            <div className="text-center pt-2">
              <Link to="/forgot-password" className="inline-flex items-center gap-2 text-xs font-bold text-white/70 hover:text-white transition-colors">
                <ArrowLeft size={14} /> Request a new reset link
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};
