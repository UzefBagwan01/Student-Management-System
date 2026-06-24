import React, { createContext, useContext, useEffect, useState } from 'react';
import { Role } from '../types';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: any | null;
  role: Role | null;
  loading: boolean;
  logout: () => Promise<void>;
  setAuthData: (user: any, role: Role) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  logout: async () => {},
  setAuthData: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for hardcoded admin first
    const localAdmin = localStorage.getItem('admin_auth');
    if (localAdmin) {
      try {
        const { user, role } = JSON.parse(localAdmin);
        setUser(user);
        setRole(role);
        setLoading(false);
        return; // Skip supabase auth if local admin
      } catch (e) {
        // ignore
      }
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserRole(session.user.id);
      } else {
        setUser(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
        
      if (data && data.role) {
        setRole(data.role as Role);
      } else {
        // Fallback for mock users or if profile doesn't exist
        setRole('student');
      }
    } catch (err) {
      console.error("Error fetching user role:", err);
      setRole('student');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (localStorage.getItem('admin_auth')) {
      localStorage.removeItem('admin_auth');
      setUser(null);
      setRole(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  const setAuthData = (u: any, r: Role) => {
    setUser(u);
    setRole(r);
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, logout, setAuthData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
