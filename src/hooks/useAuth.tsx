import React, { createContext, useContext, useEffect, useState } from 'react';
import { Role } from '../types';

interface AuthContextType {
  user: any | null;
  role: Role | null;
  loading: boolean;
  login: (email: string, role: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedRole = localStorage.getItem('role');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      setUser(u);
      setRole(savedRole as Role || (u.email === 'admin@college.com' ? 'admin' : 'student'));
    }
    setLoading(false);
  }, []);

  const login = (email: string, role: Role) => {
    const u = { email, uid: email };
    setUser(u);
    setRole(role);
    localStorage.setItem('user', JSON.stringify(u));
    localStorage.setItem('role', role);
  };

  const logout = () => {
    setUser(null);
    setRole(null);
    localStorage.removeItem('user');
    localStorage.removeItem('role');
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
