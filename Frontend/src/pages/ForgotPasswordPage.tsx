import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, CrossAccent } from '../design-system';
import { Mail, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { academyApi } from '../services/academyApi';
import { ApiClientError } from '../lib/apiClient';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await academyApi.forgotPassword(email);
      setSuccessMessage(res.message || 'If that email exists, password reset instructions have been sent.');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Unable to connect to the recovery service. Please try again.');
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
            FORGOT PASSWORD <CrossAccent color="lime" size="md" />
          </h1>
          <p className="text-xs text-white/70">
            Enter your registered email address and we will dispatch secure recovery instructions.
          </p>
        </div>

        {successMessage ? (
          <div className="space-y-6 text-center">
            <div className="p-4 rounded-2xl bg-[#D8F500]/15 border border-[#D8F500]/30 text-white flex items-start gap-3 text-left">
              <CheckCircle2 size={20} className="text-[#D8F500] shrink-0 mt-0.5" />
              <div className="text-xs font-bold leading-relaxed">{successMessage}</div>
            </div>
            <p className="text-xs text-white/60">
              Please check your inbox (and spam folder) for the password reset link. The link expires in 30 minutes.
            </p>
            <Link to="/login" className="inline-block w-full">
              <Button variant="primary" fullWidth size="lg">
                Return to Login
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
                Email Address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-3.5 text-white/40" />
                <input
                  type="email"
                  required
                  disabled={isSubmitting}
                  placeholder="your.email@athletiq.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-2xl pl-12 pr-5 py-3 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#D8F500] disabled:opacity-50"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              disabled={isSubmitting || !email.trim()}
              className="mt-2"
            >
              {isSubmitting ? 'Sending Instructions...' : 'Send Reset Link'}
            </Button>

            <div className="text-center pt-2">
              <Link to="/login" className="inline-flex items-center gap-2 text-xs font-bold text-white/70 hover:text-white transition-colors">
                <ArrowLeft size={14} /> Back to Login
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};
