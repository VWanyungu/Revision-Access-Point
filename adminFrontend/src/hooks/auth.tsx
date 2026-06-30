import { supabase } from '@/data/supabase';
import { stat } from 'fs';
import { useState, useEffect } from 'react';

export type AdminRole = 'super_admin' | 'school_admin' | 'course_admin';

export interface User {
  id?: string;
  email: string;
  name?: string;
  role?: AdminRole;
  schoolId?: string;
  courseId?: string;
}

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

    useEffect(() => {
        const fetchSession = async () => {
            const {data, error} = await supabase.auth.getSession()

            if (error) {
                console.error('Error fetching session:', error.message);
                return;
            }

            if (data.session?.user) {
                setUser({
                email: data.session.user.email || "",
                id: '',
                name: '',
                role: 'super_admin',
                schoolId: '',
                courseId: '',
                });
                setIsAuthenticated(true);
            }
        };

        fetchSession();
    }, []);

    const login = async (email: string, password: string, role: AdminRole) => {
        const { data, error } = await supabase.auth.signInWithPassword({email,password,})

        if (error || !data.user) {
            return {
                status: 'error',
                error: error
            }
        }

        localStorage.setItem('token', data.session?.access_token || '');
        setIsAuthenticated(true);
        
        const User: User = {
        email: data.user?.email || '',
        id: '',
        name: '',
        role: role,
        schoolId: '',
        courseId: '',
        };
        
        setUser(User);

        return {
            status: 'success',
            error: null,
        }
    };

    const logout = () => {
        localStorage.clear();
        setUser(null);
        setIsAuthenticated(false);
    };

    return {loggedInUser: user, isAuthenticated, login, logout,}
};
