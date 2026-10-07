import React, { createContext, useContext, useState } from 'react';

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

interface AuthContextType {
  user: User;
  role: UserRole;
  setRole: (role: UserRole) => void;
  setUser: (user: User) => void;
}

const defaultUser: User = {
  id: 'user-admin',
  name: 'Director Marcus Vance',
  email: 'admin@athletiq.com',
  role: 'Admin',
  avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=400&auto=format&fit=crop',
};

const AuthContext = createContext<AuthContextType>({
  user: defaultUser,
  role: 'Admin',
  setRole: () => {},
  setUser: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>('Admin');
  const [user, setUser] = useState<User>(defaultUser);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    if (newRole === 'Admin') {
      setUser({
        id: 'user-admin',
        name: 'Director Marcus Vance',
        email: 'admin@athletiq.com',
        role: 'Admin',
        avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=400&auto=format&fit=crop',
      });
    } else if (newRole === 'Coach') {
      setUser({
        id: 'user-coach',
        name: 'David Vance',
        email: 'david.vance@athletiq.com',
        role: 'Coach',
        sport: 'Football',
        assignedTeamId: 'u16-strikers',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
      });
    } else if (newRole === 'Athlete') {
      setUser({
        id: 'user-athlete',
        name: 'Alex Morgan',
        email: 'alex.morgan@email.com',
        role: 'Athlete',
        sport: 'Football',
        assignedTeamId: 'u16-strikers',
        avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=400&auto=format&fit=crop',
      });
    } else if (newRole === 'Organizer') {
      setUser({
        id: 'user-organizer',
        name: 'Sarah Jenkins',
        email: 'organizer@athletiq.com',
        role: 'Organizer',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400&auto=format&fit=crop',
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, setRole, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
