import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, CrossAccent } from '../design-system';
import { Lock, Mail, ArrowRight, Shield, Trophy, UserCheck, Activity } from 'lucide-react';
import { useAuth, type UserRole } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setRole: setAuthRole } = useAuth();
  const [role, setRole] = useState<UserRole>('Athlete');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const navigateToDashboard = (targetRole: UserRole) => {
    if (targetRole === 'Coach') navigate('/dashboard/coach');
    else if (targetRole === 'Athlete') navigate('/dashboard/athlete');
    else if (targetRole === 'Organizer') navigate('/dashboard/tournaments');
    else navigate('/dashboard/admin');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      setAuthRole(role);
      navigateToDashboard(role);
    }
  };

  const handleDemoLogin = (demoRole: UserRole) => {
    setRole(demoRole);
    setAuthRole(demoRole);
    navigateToDashboard(demoRole);
  };

  const demoAccounts: { role: UserRole; name: string; email: string; icon: React.ReactNode }[] = [
    { role: 'Admin', name: 'Director Marcus', email: 'admin@athletiq.com', icon: <Shield size={16} /> },
    { role: 'Organizer', name: 'Tournament Director', email: 'organizer@athletiq.com', icon: <Trophy size={16} /> },
    { role: 'Coach', name: 'Coach David', email: 'david.vance@athletiq.com', icon: <UserCheck size={16} /> },
    { role: 'Athlete', name: 'Alex Morgan', email: 'athlete@athletiq.com', icon: <Activity size={16} /> },
  ];

  return (
    <div className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-md mx-auto">
      <Card variant="dark" className="p-8 md:p-10 shadow-2xl relative overflow-hidden space-y-6">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-block mb-2 group transition-transform duration-200 hover:scale-105">
            <img src="/logo-white.png" alt="ATHLETIQ" className="h-10 md:h-12 w-auto object-contain mx-auto" />
          </Link>
          <h1 className="text-3xl font-black font-display text-white">
            PORTAL LOGIN <CrossAccent color="lime" size="md" />
          </h1>
          <p className="text-xs text-white/70">Select your role and enter your credentials to access your portal.</p>
        </div>

        {/* Balanced 4-Role Selector */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-white/10 rounded-2xl">
          {(['Athlete', 'Coach', 'Organizer', 'Admin'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setRole(r);
                setEmail(`${r.toLowerCase()}@athletiq.com`);
              }}
              className={`w-full py-2.5 rounded-xl text-xs font-display text-center transition-all ${
                role === r ? 'bg-[#D8F500] text-[#171044] font-black shadow-md' : 'text-white/80 hover:text-white font-bold'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">Email Address</label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-3.5 text-white/40" />
              <input
                type="email"
                required
                placeholder={`${role.toLowerCase()}@athletiq.com`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-2xl pl-12 pr-5 py-3 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#D8F500]"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-white/80">Password</label>
              <Link to="/forgot-password" className="text-xs text-[#D8F500] hover:underline font-bold">
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-3.5 text-white/40" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-2xl pl-12 pr-5 py-3 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#D8F500]"
              />
            </div>
          </div>

          <Button variant="primary" fullWidth size="lg" iconRight={<ArrowRight size={18} className="mt-0.5" />}>
            Login to {role} Portal
          </Button>
        </form>

        {/* Quick Demo Access Buttons */}
        <div className="pt-4 border-t border-white/10 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-white/60">
            <span>Demo Accounts</span>
            <span className="text-[#D8F500]">1-Click Login</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map((demo) => (
              <button
                key={demo.role}
                type="button"
                onClick={() => handleDemoLogin(demo.role)}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 transition-all text-left group hover:scale-[1.02]"
              >
                <div className="w-8 h-8 rounded-lg bg-[#D8F500] text-[#171044] flex items-center justify-center font-black text-xs shrink-0 group-hover:bg-[#FF5A00] group-hover:text-white transition-colors">
                  {demo.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black text-white truncate">{demo.role}</div>
                  <div className="text-[10px] text-white/60 truncate">{demo.name}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center text-xs text-white/70 pt-2 border-t border-white/10">
          Don't have an account yet?{' '}
          <Link to="/register" className="text-[#D8F500] font-bold hover:underline">
            Register Here
          </Link>
        </div>
      </Card>
    </div>
  );
};
