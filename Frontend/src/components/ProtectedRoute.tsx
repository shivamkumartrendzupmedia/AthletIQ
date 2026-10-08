import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, type UserRole } from '../context/AuthContext';
import { StateContainer } from './StateContainer';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}

const getRoleDashboard = (role: UserRole): string => {
  switch (role) {
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

/**
 * Route protection wrapper for all /dashboard/* endpoints.
 *
 * IMPORTANT: This client-side guard is designed for user interface convenience and navigation flow.
 * Authoritative security and resource permission enforcement is strictly enforced server-side (Step 4).
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  children,
}) => {
  const { user, role, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F1E8] flex items-center justify-center p-6">
        <StateContainer loading={true}>
          <div />
        </StateContainer>
      </div>
    );
  }

  // Unauthenticated visitors are redirected to /login preserving the requested destination
  if (!isAuthenticated || !user || !role) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If role is not permitted on this route, redirect to the user's role-appropriate dashboard
  if (allowedRoles && !allowedRoles.includes(role)) {
    const roleDashboard = getRoleDashboard(role);
    return <Navigate to={roleDashboard} replace />;
  }

  return <>{children}</>;
};
