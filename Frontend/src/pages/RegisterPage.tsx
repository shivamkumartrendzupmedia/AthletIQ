import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, CrossAccent } from '../design-system';
import { User, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth, type UserRole } from '../context/AuthContext';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { setRole: setAuthRole } = useAuth();
  const [role, setRole] = useState<UserRole>('Athlete');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sport, setSport] = useState('Football');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email && password) {
      setAuthRole(role);
      if (role === 'Coach') navigate('/dashboard/coach');
      else if (role === 'Athlete') navigate('/dashboard/athlete');
      else if (role === 'Organizer') navigate('/dashboard/tournaments');
      else navigate('/dashboard/admin');
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
          <p className="text-xs text-white/70">Create your account to join training programs, track stats, or manage tournaments.</p>
        </div>

        {/* Balanced 4-Role Selector */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-white/10 rounded-2xl">
          {(['Athlete', 'Coach', 'Organizer', 'Admin'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`w-full py-2.5 rounded-xl text-xs font-display text-center transition-all ${
                role === r ? 'bg-[#D8F500] text-[#171044] font-black shadow-md' : 'text-white/80 hover:text-white font-bold'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">Full Name</label>
            <div className="relative">
              <User size={18} className="absolute left-4 top-3.5 text-white/40" />
              <input
                type="text"
                required
                placeholder={role === 'Coach' ? 'Coach David Vance' : role === 'Organizer' ? 'Tournament Director Sarah' : role === 'Admin' ? 'Director Marcus' : 'Alex Morgan'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-2xl pl-12 pr-5 py-3 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#D8F500]"
              />
            </div>
          </div>

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

          {(role === 'Athlete' || role === 'Coach') && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
                {role === 'Coach' ? 'Primary Coaching Specialty' : 'Primary Sport Interest'}
              </label>
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="w-full bg-[#171044] border border-white/20 rounded-2xl px-5 py-3 text-white text-sm focus:outline-none focus:border-[#D8F500]"
              >
                <option value="Football">Soccer / Football</option>
                <option value="Basketball">Basketball</option>
                <option value="Tennis">Tennis</option>
                <option value="Swimming">Swimming</option>
                <option value="Athletics">Athletics / Track</option>
                <option value="Volleyball">Volleyball</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">Password</label>
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

          <Button variant="lime" fullWidth size="lg" iconRight={<ArrowRight size={18} />}>
            Create {role} Account
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
