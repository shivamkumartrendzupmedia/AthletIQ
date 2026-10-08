import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ArrowRight, User, LogOut, LayoutDashboard } from 'lucide-react';
import { CrossAccent, Button } from '../design-system';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Programs', path: '/programs' },
    { name: 'About Us', path: '/about' },
    { name: 'Coaches', path: '/coaches' },
    { name: 'Teams', path: '/teams' },
    { name: 'Tournaments', path: '/tournaments' },
    { name: 'Gallery', path: '/gallery' },
    { name: 'News', path: '/news' },
    { name: 'Contact', path: '/contact' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const { isAuthenticated, role, logout } = useAuth();

  const getRoleDashboard = (r: string | null) => {
    switch (r) {
      case 'Admin':
        return '/dashboard/admin';
      case 'Coach':
        return '/dashboard/coach';
      case 'Athlete':
        return '/dashboard/athlete';
      case 'Organizer':
        return '/dashboard/tournaments';
      default:
        return '/dashboard/athlete';
    }
  };
  const dashboardPath = getRoleDashboard(role);

  return (
    <header className="bg-[#F7F1E8] border-b border-[#171044]/10 transition-all duration-300 relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <img
            src="/logo.png"
            alt="ATHLETIQ"
            className="h-12 md:h-14 w-auto object-contain mix-blend-multiply transition-transform duration-200 group-hover:scale-105"
          />
        </Link>

        {/* Desktop Navigation - Clean Horizontal Links */}
        <nav className="hidden xl:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-3 py-1.5 text-sm font-display font-bold rounded-full transition-all duration-200 ${
                isActive(link.path)
                  ? 'text-[#FF5A00] font-black'
                  : 'text-[#171044]/80 hover:text-[#171044] hover:bg-[#171044]/5'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Action Buttons Right */}
        {isAuthenticated ? (
          <div className="hidden sm:flex items-center gap-3">
            <Link to={dashboardPath}>
              <button className="flex items-center gap-2 px-5 py-2 text-sm font-display font-extrabold text-[#171044] bg-[#D8F500] hover:bg-[#cbf000] rounded-full shadow-md transition-all duration-200 cursor-pointer">
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </button>
            </Link>
            <button
              onClick={() => logout()}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-display font-extrabold text-[#171044]/80 hover:text-[#FF3B30] transition-colors cursor-pointer"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-3">
            <Link to="/login">
              <button className="px-4 py-2 text-sm font-display font-extrabold text-[#171044] hover:text-[#FF5A00] transition-colors cursor-pointer">
                Login
              </button>
            </Link>
            <Link to="/register">
              <button className="px-6 py-2.5 text-sm font-display font-extrabold text-white bg-[#FF5A00] hover:bg-[#E04F00] rounded-full shadow-md shadow-[#FF5A00]/30 transition-all duration-200 hover:scale-105 cursor-pointer">
                Join Now
              </button>
            </Link>
          </div>
        )}

        {/* Mobile Menu Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="xl:hidden p-2.5 rounded-2xl bg-[#171044] text-white hover:bg-[#4B2A9B] transition-colors cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="xl:hidden bg-[#171044] text-white border-t border-white/10 overflow-hidden shadow-2xl"
          >
            <div className="px-6 py-8 space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-3 rounded-2xl font-display font-bold text-base transition-colors ${
                    isActive(link.path)
                      ? 'bg-[#D8F500] text-[#171044]'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {link.name}
                </Link>
              ))}

              <div className="pt-6 border-t border-white/10 flex flex-col gap-3">
                {isAuthenticated ? (
                  <>
                    <Link to={dashboardPath} onClick={() => setIsOpen(false)}>
                      <Button variant="lime" fullWidth iconRight={<LayoutDashboard size={18} />}>
                        Go to Dashboard
                      </Button>
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setIsOpen(false);
                      }}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl bg-[#FF3B30]/20 text-[#FF3B30] text-sm font-bold font-display cursor-pointer"
                    >
                      <LogOut size={18} /> Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" fullWidth className="text-white border-white/20 hover:bg-white/10">
                        Login to Portal
                      </Button>
                    </Link>
                    <Link to="/register" onClick={() => setIsOpen(false)}>
                      <Button variant="lime" fullWidth iconRight={<ArrowRight size={18} />}>
                        Join Academy Now
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
