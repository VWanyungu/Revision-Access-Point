import { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AdminNav } from './AdminNav';
import { supabase } from '@/data/supabase';
import { setInstitutionScope, setCourseScope, setSchoolScope } from '@/data/db';
import { canOpen } from './AdminNav';
import { PanelSlotContext } from '@/components/shared/InlinePanel';
import { useProfile } from '@/hooks/useProfile';

export const DashboardLayout = () => {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const [panelSlot, setPanelSlot] = useState<HTMLElement | null>(null);

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

  const { data: me } = useProfile();
  if (!me) return <div className="min-h-screen bg-background" />;
  // Before any page queries run: institution admins only ever see their own institution.
  setInstitutionScope(me.role !== 'super_admin' ? me.institutionId : null);
  setSchoolScope(me.role === 'school_admin' ? me.schoolIds : null);
  // Course admins are limited to their own courses.
  setCourseScope(me.role === 'course_admin' ? me.courseIds : null);
  // Hiding a nav link is not enough: a course admin typing /admins must not get in.
  if (!canOpen(me.role, pathname)) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen w-full bg-background font-geist text-ink">
      <AdminNav />
      <PanelSlotContext.Provider value={panelSlot}>
        {/* Forms open in the right-hand column; the page content makes room for it. */}
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-12 pt-10 md:px-6 md:pt-14 lg:flex-row lg:items-start [&:has(>aside>*)]:max-w-[1500px]">
          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
          <aside ref={setPanelSlot} className="empty:hidden lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:w-[28rem] lg:shrink-0 lg:overflow-y-auto" />
        </div>
      </PanelSlotContext.Provider>
    </div>
  );
};
