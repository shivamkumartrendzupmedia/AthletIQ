import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useAuthenticatedUser, type UserRole } from '../context/AuthContext';
import { CrossAccent, AthleticBadge } from '../design-system';
import { academyApi } from '../services/academyApi';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Shield,
  Activity,
  Calendar,
  FileText,
  Bell,
  LogOut,
  Menu,
  Trophy,
  Award,
  User,
  MapPin,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';
import { SafeImage, getInitials, isValidImageUrl } from './SafeImage';
import { ChatbotPanel } from './chatbot/ChatbotPanel';

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const user = useAuthenticatedUser();
  const { role, logout, setRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await academyApi.getUnreadNotificationCount();
      if (typeof res.unreadCount === 'number') {
        setUnreadCount(res.unreadCount);
      }
    } catch {
      // safe fallback on error or offline
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCount();
      }
    }, 60000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCount();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchUnreadCount, location.pathname]);

  const getNavItems = () => {
    switch (role) {
      case 'Admin':
        return [
          { name: 'Admin Overview', path: '/dashboard/admin', icon: LayoutDashboard },
          { name: 'My Profile', path: '/dashboard/profile', icon: User },
          { name: 'Analytics', path: '/dashboard/analytics', icon: TrendingUp },
          { name: 'Notifications', path: '/dashboard/notifications', icon: Bell },
          { name: 'User Accounts', path: '/dashboard/users', icon: User },
          { name: 'Contact Messages', path: '/dashboard/messages', icon: MessageSquare },
          { name: 'Tournament Engine', path: '/dashboard/tournaments', icon: Trophy },
          { name: 'Venues', path: '/dashboard/venues', icon: MapPin },
          { name: 'Officials', path: '/dashboard/officials', icon: UserCheck },
          { name: 'Athlete Management', path: '/dashboard/athletes', icon: Users },
          { name: 'Coach Management', path: '/dashboard/coaches', icon: UserCheck },
          { name: 'Team Management', path: '/dashboard/teams', icon: Shield },
          { name: 'Sports & Age Groups', path: '/dashboard/sports', icon: Activity },
          { name: 'Roster & Assignments', path: '/dashboard/rosters', icon: Award },
          { name: 'Live Console', path: '/dashboard/live', icon: Activity },
          { name: 'Training Calendar', path: '/dashboard/training', icon: Calendar },
          { name: 'Documents & Waivers', path: '/dashboard/documents', icon: FileText },
          { name: 'Announcements', path: '/dashboard/announcements', icon: Bell },
          { name: 'Achievements', path: '/dashboard/achievements', icon: Award },
        ];
      case 'Coach':
        return [
          { name: 'Coach Dashboard', path: '/dashboard/coach', icon: LayoutDashboard },
          { name: 'My Profile', path: '/dashboard/profile', icon: User },
          { name: 'Analytics', path: '/dashboard/analytics', icon: TrendingUp },
          { name: 'Notifications', path: '/dashboard/notifications', icon: Bell },
          { name: 'Tournament Engine', path: '/dashboard/tournaments', icon: Trophy },
          { name: 'Assigned Teams', path: '/dashboard/teams', icon: Shield },
          { name: 'Roster & Athletes', path: '/dashboard/athletes', icon: Users },
          { name: 'Training Sessions', path: '/dashboard/training', icon: Calendar },
          { name: 'Documents', path: '/dashboard/documents', icon: FileText },
          { name: 'Announcements', path: '/dashboard/announcements', icon: Bell },
        ];
      case 'Athlete':
        return [
          { name: 'Athlete Hub', path: '/dashboard/athlete', icon: LayoutDashboard },
          { name: 'My Profile', path: '/dashboard/profile', icon: User },
          { name: 'Analytics', path: '/dashboard/analytics', icon: TrendingUp },
          { name: 'Notifications', path: '/dashboard/notifications', icon: Bell },
          { name: 'My Profile & Development', path: '/athlete/me', icon: User },
          { name: 'Tournaments', path: '/dashboard/tournaments', icon: Trophy },
          { name: 'My Training Schedule', path: '/dashboard/training', icon: Calendar },
          { name: 'My Documents', path: '/dashboard/documents', icon: FileText },
          { name: 'Announcements', path: '/dashboard/announcements', icon: Bell },
        ];
      case 'Organizer':
        return [
          { name: 'Organizer Hub', path: '/dashboard/organizer', icon: LayoutDashboard },
          { name: 'My Profile', path: '/dashboard/profile', icon: User },
          { name: 'Notifications', path: '/dashboard/notifications', icon: Bell },
          { name: 'Live Console', path: '/dashboard/live', icon: Activity },
          { name: 'Tournament Engine', path: '/dashboard/tournaments', icon: Trophy },
          { name: 'Venues', path: '/dashboard/venues', icon: MapPin },
          { name: 'Officials', path: '/dashboard/officials', icon: UserCheck },
          { name: 'Teams & Brackets', path: '/dashboard/teams', icon: Shield },
          { name: 'Match Calendar', path: '/dashboard/training', icon: Calendar },
          { name: 'Documents', path: '/dashboard/documents', icon: FileText },
          { name: 'Announcements', path: '/dashboard/announcements', icon: Bell },
        ];
      default:
        return [
          { name: 'Athlete Hub', path: '/dashboard/athlete', icon: LayoutDashboard },
          { name: 'My Profile', path: '/dashboard/profile', icon: User },
          { name: 'Notifications', path: '/dashboard/notifications', icon: Bell },
        ];
    }
  };

  const navItems = getNavItems();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F7F1E8] text-[#111111] font-sans antialiased flex flex-col lg:flex-row">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-[#171044] text-white p-6 border-r border-white/10 shrink-0 min-h-screen sticky top-0 justify-between">
        <div className="space-y-8">
          {/* Brand */}
          <Link to="/" className="inline-flex items-center gap-2 group">
            <img
              src="/logo-white.png"
              alt="ATHLETIQ"
              className="h-8 md:h-9 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
            />
            <CrossAccent color="orange" size="md" />
          </Link>

          {/* Active Role Card */}
          <div className="bg-white/10 p-3.5 rounded-2xl border border-white/10 space-y-2">
            <div className="text-[10px] uppercase font-bold text-white/60 tracking-wider">
              Active Role Context
            </div>
            <div className="flex items-center justify-between">
              <AthleticBadge
                variant={
                  role === 'Admin'
                    ? 'orange'
                    : role === 'Coach'
                    ? 'lime'
                    : 'purple'
                }
              >
                {role} PORTAL
              </AthleticBadge>

              {/* Role Switcher only available when demo mode is explicitly enabled */}
              {isDemoMode && (
                <select
                  value={role || 'Athlete'}
                  onChange={(e) => {
                    const newRole = e.target.value as UserRole;
                    setRole(newRole);
                    if (newRole === 'Coach') navigate('/dashboard/coach');
                    else if (newRole === 'Athlete') navigate('/dashboard/athlete');
                    else if (newRole === 'Organizer')
                      navigate('/dashboard/organizer');
                    else navigate('/dashboard/admin');
                  }}
                  className="bg-[#171044] text-white text-xs font-bold px-2 py-1 rounded-lg border border-white/20 outline-none cursor-pointer"
                >
                  <option value="Admin">Admin</option>
                  <option value="Coach">Coach</option>
                  <option value="Athlete">Athlete</option>
                  <option value="Organizer">Organizer</option>
                </select>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 pt-2">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl font-display font-extrabold text-sm transition-all duration-200 ${
                    active
                      ? 'bg-[#FF5A00] text-white shadow-lg shadow-[#FF5A00]/30'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={18} />
                    <span>{item.name}</span>
                  </div>
                  {item.name === 'Notifications' && unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#D8F500] text-[#171044] text-[10px] font-black">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card, Public Shortcut & Logout */}
        <div className="pt-6 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-[#FF5A00] flex items-center justify-center text-white font-bold text-xs shrink-0 border-2 border-[#D8F500]">
              {user.avatar && isValidImageUrl(user.avatar) ? (
                <SafeImage
                  src={user.avatar}
                  alt={user.name}
                  fallbackKind="person"
                  name={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{getInitials(user.name, 'U')}</span>
              )}
            </div>
            <div className="overflow-hidden">
              <div className="font-display font-bold text-xs text-white truncate">
                {user.name}
              </div>
              <div className="text-[10px] text-white/60 truncate">
                {user.email}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#FF3B30]/20 text-[#FF3B30] hover:bg-[#FF3B30]/30 text-xs font-bold font-display transition-colors cursor-pointer"
          >
            <LogOut size={14} />
            <span>Logout Session</span>
          </button>

          <Link
            to="/"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 text-xs font-bold font-display transition-colors"
          >
            ← Return to Public Website
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Bar */}
        <header className="bg-[#F7F1E8]/90 backdrop-blur-md border-b border-[#171044]/10 h-20 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="lg:hidden p-2 rounded-xl bg-[#171044] text-white cursor-pointer shrink-0"
              aria-label="Toggle navigation menu"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-sm sm:text-lg md:text-2xl font-black font-display text-[#171044] uppercase tracking-tight truncate">
              ATHLETIQ ACADEMY {role} MANAGEMENT
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {isDemoMode && (
              <div className="hidden sm:flex items-center gap-2 bg-[#171044] text-white px-3 py-1.5 rounded-full text-xs font-bold">
                <span className="text-white/60">Role:</span>
                <select
                  value={role || 'Athlete'}
                  onChange={(e) => {
                    const newRole = e.target.value as UserRole;
                    setRole(newRole);
                    if (newRole === 'Coach') navigate('/dashboard/coach');
                    else if (newRole === 'Athlete')
                      navigate('/dashboard/athlete');
                    else if (newRole === 'Organizer')
                      navigate('/dashboard/organizer');
                    else navigate('/dashboard/admin');
                  }}
                  className="bg-transparent text-[#D8F500] font-extrabold outline-none cursor-pointer"
                >
                  <option value="Admin" className="bg-[#171044] text-white">
                    Admin
                  </option>
                  <option value="Coach" className="bg-[#171044] text-white">
                    Coach
                  </option>
                  <option value="Athlete" className="bg-[#171044] text-white">
                    Athlete
                  </option>
                  <option value="Organizer" className="bg-[#171044] text-white">
                    Organizer
                  </option>
                </select>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#171044]/10 text-xs font-bold text-[#171044] hover:bg-[#FF3B30] hover:text-white transition-colors cursor-pointer"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </button>

            <Link
              to="/dashboard/notifications"
              aria-label="View notifications"
              className="w-10 h-10 rounded-full bg-white border border-[#171044]/10 flex items-center justify-center text-[#171044] hover:bg-[#171044] hover:text-white transition-colors relative"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF5A00] text-white text-[10px] font-black flex items-center justify-center shadow-sm">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* Dashboard Body Page Content */}
        <main className="p-6 md:p-10 flex-1 space-y-8 max-w-7xl mx-auto w-full">
          {children}
        </main>

        {/* Floating Chatbot Assistant */}
        <ChatbotPanel userRole={role || 'Athlete'} />
      </div>
    </div>
  );
};
