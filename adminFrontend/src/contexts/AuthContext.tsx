import { supabase } from '@/data/supabase';
import { set } from 'date-fns';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type AdminRole = 'super_admin' | 'institution_admin' | 'school_admin' | 'course_admin';

export interface User {
  id?: string;
  email: string;
  name?: string;
  role?: AdminRole;
  schoolId?: string;
  courseId?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: AdminRole) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  
  const login = async (email: string, password: string, role: AdminRole) => {
    setIsAuthenticated(true);
    const { data, error } = await supabase.auth.signInWithPassword({email,password,})

    if (error || !data.user) {
      console.error('Login error:', error);
      setIsAuthenticated(false);
    }
    
    const User: User = {
      email: data.user?.email || '',
      id: '',
      name: '',
      role: role,
      schoolId: '',
      courseId: '',
    };
    
    setUser(User);
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.clear();
    supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
