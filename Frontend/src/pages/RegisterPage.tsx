import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, CrossAccent } from '../design-system';
import { User, Mail, Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiClientError } from '../lib/apiClient';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sport, setSport] = useState('Football'); // Visual only for UI continuity; not submitted to backend auth API

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    if (!hasMinLength || !hasUpper || !hasLower || !hasNumber) {
      setGeneralError('Please ensure your password meets all complexity requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setFieldErrors((prev) => ({
        ...prev,
        confirmPassword: 'Passwords do not match.',
      }));
      return;
    }

    setIsSubmitting(true);
    try {
      await register(name, email, password);
      // Public registrations are locked to role 'Athlete'
      navigate('/dashboard/athlete', { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setGeneralError(err.message);
        if (err.fieldErrors) {
          const mapped: Record<string, string> = {};
          for (const item of err.fieldErrors) {
            mapped[item.field] = item.message;
          }
          setFieldErrors(mapped);
        }
      } else {
        setGeneralError('Registration failed. Please check your network connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-lg mx-auto">
      <Card variant="dark" className="p-8 md:p-10 shadow-2xl relative overflow-hidden space-y-6">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-block mb-2 group transition-transform duration-200 hover:scale-105">
            <img src="/logo-white.png" alt="ATHLETIQ" className="h-10 md:h-12 w-auto object-contain mx-auto" />
          </Link>
          <h1 className="text-3xl font-black font-display text-white">
            JOIN ATHLETIQ <CrossAccent color="lime" size="md" />
          </h1>
          <p className="text-xs text-white/70">Create your athlete account to join training programs, track stats, and compete.</p>
        </div>

        {generalError && (
          <div className="p-3.5 rounded-2xl bg-[#FF3B30]/15 border border-[#FF3B30]/30 text-white flex items-start gap-3">
            <AlertCircle size={18} className="text-[#FF3B30] shrink-0 mt-0.5" />
            <div className="text-xs font-bold leading-relaxed">{generalError}</div>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">Full Name</label>
            <div className="relative">
              <User size={18} className="absolute left-4 top-3.5 text-white/40" />
              <input
                type="text"
                required
                disabled={isSubmitting}
                placeholder="Marcus Rashford"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-2xl pl-12 pr-5 py-3 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#D8F500] disabled:opacity-50"
              />
            </div>
            {fieldErrors.name && (
              <p className="text-[11px] font-bold text-[#FF3B30] mt-1.5">{fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">Email Address</label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-3.5 text-white/40" />
              <input
                type="email"
                required
                disabled={isSubmitting}
                placeholder="marcus@athlete.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-2xl pl-12 pr-5 py-3 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#D8F500] disabled:opacity-50"
              />
            </div>
            {fieldErrors.email && (
              <p className="text-[11px] font-bold text-[#FF3B30] mt-1.5">{fieldErrors.email}</p>
            )}
          </div>

          {/* Visual discipline selector for UI continuity */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
              Primary Sport Discipline
            </label>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-[#171044] border border-white/20 rounded-2xl px-5 py-3 text-white text-sm focus:outline-none focus:border-[#D8F500] disabled:opacity-50"
            >
              <option value="Football">Soccer / Football</option>
              <option value="Basketball">Basketball</option>
              <option value="Tennis">Tennis</option>
              <option value="Swimming">Swimming</option>
              <option value="Athletics">Athletics / Track</option>
              <option value="Volleyball">Volleyball</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-3.5 text-white/40" />
              <input
                type="password"
                required
                disabled={isSubmitting}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-2xl pl-12 pr-5 py-3 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#D8F500] disabled:opacity-50"
              />
            </div>
            {fieldErrors.password && (
              <p className="text-[11px] font-bold text-[#FF3B30] mt-1.5">{fieldErrors.password}</p>
            )}

            {/* Password Policy Checklist */}
            <div className="mt-2.5 p-3 rounded-xl bg-white/5 border border-white/10 grid grid-cols-2 gap-2 text-[11px]">
              <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-[#D8F500]' : 'text-white/50'}`}>
                <CheckCircle2 size={13} className={hasMinLength ? 'text-[#D8F500]' : 'text-white/30'} />
                <span>Min 8 characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-[#D8F500]' : 'text-white/50'}`}>
                <CheckCircle2 size={13} className={hasUpper ? 'text-[#D8F500]' : 'text-white/30'} />
                <span>1 Uppercase letter</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasLower ? 'text-[#D8F500]' : 'text-white/50'}`}>
                <CheckCircle2 size={13} className={hasLower ? 'text-[#D8F500]' : 'text-white/30'} />
                <span>1 Lowercase letter</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-[#D8F500]' : 'text-white/50'}`}>
                <CheckCircle2 size={13} className={hasNumber ? 'text-[#D8F500]' : 'text-white/30'} />
                <span>1 Number digit</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">Confirm Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-3.5 text-white/40" />
              <input
                type="password"
                required
                disabled={isSubmitting}
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full bg-white/10 border rounded-2xl pl-12 pr-5 py-3 text-white placeholder-white/40 text-sm focus:outline-none disabled:opacity-50 ${
                  confirmPassword.length > 0
                    ? passwordsMatch
                      ? 'border-[#D8F500]'
                      : 'border-[#FF3B30]'
                    : 'border border-white/20'
                }`}
              />
            </div>
            {fieldErrors.confirmPassword && (
              <p className="text-[11px] font-bold text-[#FF3B30] mt-1.5">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <Button variant="lime" fullWidth size="lg" disabled={isSubmitting} iconRight={<ArrowRight size={18} />}>
            {isSubmitting ? 'Creating Athlete Account...' : 'Create Athlete Account'}
          </Button>
        </form>

        <div className="text-center text-xs text-white/70 pt-2 border-t border-white/10">
          Already have an account?{' '}
          <Link to="/login" className="text-[#D8F500] font-bold hover:underline">
            Login Here
          </Link>
        </div>
      </Card>
    </div>
  );
};
