import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  apiClient,
  setAccessToken,
  refreshAccessToken,
  setSessionExpiredHandler,
  ApiClientError,
} from '../lib/apiClient';

export type UserRole = 'Admin' | 'Coach' | 'Athlete' | 'Organizer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  assignedTeamId?: string;
  sport?: string;
}

export interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  setRole: (role: UserRole) => void;
  setUser: (user: User) => void;
}

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

const demoUsers: Record<UserRole, User> = {
  Admin: {
    id: 'user-admin',
    name: 'Director Marcus Vance',
    email: 'admin@athletiq.com',
    role: 'Admin',
  },
  Coach: {
    id: 'user-coach',
    name: 'David Vance',
    email: 'david.vance@athletiq.com',
    role: 'Coach',
    sport: 'Football',
    assignedTeamId: 'u16-strikers',
  },
  Athlete: {
    id: 'user-athlete',
    name: 'Alex Morgan',
    email: 'alex.morgan@email.com',
    role: 'Athlete',
    sport: 'Football',
    assignedTeamId: 'u16-strikers',
  },
  Organizer: {
    id: 'user-organizer',
    name: 'Sarah Jenkins',
    email: 'organizer@athletiq.com',
    role: 'Organizer',
  },
};

const AuthContext = createContext<AuthContextType>({
  user: isDemoMode ? demoUsers.Admin : null,
  role: isDemoMode ? 'Admin' : null,
  isAuthenticated: isDemoMode,
  isLoading: !isDemoMode,
  error: null,
  login: async () => {
    throw new Error('Not implemented');
  },
  register: async () => {
    throw new Error('Not implemented');
  },
  logout: async () => {},
  setRole: () => {},
  setUser: () => {},
});


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUserState] = useState<User | null>(
    isDemoMode ? demoUsers.Admin : null
  );
  const [role, setRoleState] = useState<UserRole | null>(
    isDemoMode ? 'Admin' : null
  );
  const [isLoading, setIsLoading] = useState<boolean>(!isDemoMode);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Listen for session expiry from apiClient
  useEffect(() => {
    setSessionExpiredHandler(() => {
      if (mountedRef.current && !isDemoMode) {
        setUserState(null);
        setRoleState(null);
      }
    });
  }, []);

  // Silent session restore on app startup
  useEffect(() => {
    if (isDemoMode) {
      setIsLoading(false);
      return;
    }

    // Rate limiter protection: Only attempt silent refresh if previous session flag exists in localStorage
    const hasSession = localStorage.getItem('athletiq_has_session') === '1';
    if (!hasSession) {
      setIsLoading(false);
      return;
    }

    refreshAccessToken().then((result) => {
      if (!mountedRef.current) return;
      if (result) {
        setUserState(result.user as User);
        setRoleState(result.user.role as UserRole);
      } else {
        setUserState(null);
        setRoleState(null);
      }
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await apiClient<{ user: User; accessToken: string }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }
      );

      if (!res.data?.user || !res.data?.accessToken) {
        throw new Error('Invalid login response from server');
      }

      setAccessToken(res.data.accessToken);
      localStorage.setItem('athletiq_has_session', '1');
      setUserState(res.data.user);
      setRoleState(res.data.user.role);
      setIsLoading(false);
      return res.data.user;
    } catch (err) {
      setIsLoading(false);
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Unable to connect to server. Please try again.';
      setError(message);
      throw err;
    }
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<User> => {
      setError(null);
      setIsLoading(true);
      try {
        const res = await apiClient<{ user: User; accessToken: string }>(
          '/auth/register',
          {
            method: 'POST',
            body: JSON.stringify({ name, email, password }),
          }
        );

        if (!res.data?.user || !res.data?.accessToken) {
          throw new Error('Invalid registration response from server');
        }

        setAccessToken(res.data.accessToken);
        localStorage.setItem('athletiq_has_session', '1');
        setUserState(res.data.user);
        setRoleState(res.data.user.role);
        setIsLoading(false);
        return res.data.user;
      } catch (err) {
        setIsLoading(false);
        const message =
          err instanceof ApiClientError
            ? err.message
            : 'Registration failed. Please try again.';
        setError(message);
        throw err;
      }
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiClient('/auth/logout', { method: 'POST', skipAuthRefresh: true });
    } catch {
      // Ignore network errors on logout
    } finally {
      setAccessToken(null);
      localStorage.removeItem('athletiq_has_session');
      setUserState(isDemoMode ? demoUsers.Admin : null);
      setRoleState(isDemoMode ? 'Admin' : null);
    }
  }, []);

  const setRole = useCallback((newRole: UserRole) => {
    if (isDemoMode) {
      setRoleState(newRole);
      setUserState(demoUsers[newRole]);
    }
  }, []);

  const setUser = useCallback((newUser: User) => {
    if (isDemoMode) {
      setUserState(newUser);
      setRoleState(newUser.role);
    }
  }, []);

  const isAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        isLoading,
        error,
        login,
        register,
        logout,
        setRole,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => useContext(AuthContext);

/**
 * Hook for pages inside ProtectedRoute. Guarantees non-null user in TypeScript.
 */
export const useAuthenticatedUser = (): User => {
  const { user } = useAuth();
  if (!user) {
    throw new Error(
      'useAuthenticatedUser must be used within an authenticated ProtectedRoute context.'
    );
  }
  return user;
};
