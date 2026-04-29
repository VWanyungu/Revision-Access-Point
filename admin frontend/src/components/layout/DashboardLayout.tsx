import { useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { TopNavigation } from './TopNavigation';
import { supabase } from '@/data/supabase';

export const DashboardLayout = () => {
  const { isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      const {data, error} = await supabase.auth.getSession()
      const {access_token} = JSON.parse(localStorage.getItem('sb-ptktlornnngqvzbbisaq-auth-token'))

      if (error || !data.session?.user || data.session?.access_token !== access_token) {
        console.error('Error fetching session:', error.message);
        return <Navigate to="/login" replace />;
      }
    }
    fetchSession();
  }, []);

  console.log('DashboardLayout rendered. isAuthenticated:', isAuthenticated);

  return (
    <div className="min-h-screen flex w-full bg-background">
      <Sidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavigation onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-auto">
          <div className="container py-6 px-4 lg:px-6 max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
