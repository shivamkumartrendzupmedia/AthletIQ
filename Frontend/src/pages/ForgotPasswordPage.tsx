import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CrossAccent } from '../design-system';
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSent(true);
    }
  };

  return (
    <div className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-md mx-auto">
      <Card variant="dark" className="p-8 md:p-10 shadow-2xl relative overflow-hidden space-y-6">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-block bg-white px-4 py-2 rounded-2xl shadow-md mb-2 group transition-transform duration-200 hover:scale-105">
            <img src="/logo.png" alt="ATHLETIQ" className="h-10 w-auto object-contain mx-auto" />
          </Link>
          <h1 className="text-3xl font-black font-display text-white">
            RESET PASSWORD <CrossAccent color="lime" size="md" />
          </h1>
          <p className="text-xs text-white/70">Enter your email and we'll send you a password reset link.</p>
        </div>

        {sent ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#D8F500] text-[#171044] mx-auto flex items-center justify-center font-bold">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-xl font-bold font-display text-white">CHECK YOUR INBOX</h3>
            <p className="text-xs text-white/80">
              We have sent a password reset link to <span className="text-[#D8F500] font-bold">{email}</span>.
            </p>
            <Link to="/login" className="block pt-2">
              <Button variant="lime" fullWidth size="md">
                Back to Login
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-3.5 text-white/40" />
                <input
                  type="email"
                  required
                  placeholder="athlete@athletiq.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-2xl pl-12 pr-5 py-3 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#D8F500]"
                />
              </div>
            </div>

            <Button variant="primary" fullWidth size="lg" iconRight={<ArrowRight size={18} />}>
              Send Reset Link
            </Button>
          </form>
        )}

        <div className="text-center text-xs text-white/70 pt-2 border-t border-white/10">
          Remembered your password?{' '}
          <Link to="/login" className="text-[#D8F500] font-bold hover:underline">
            Back to Login
          </Link>
        </div>
      </Card>
    </div>
  );
};
