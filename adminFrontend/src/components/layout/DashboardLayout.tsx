import { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AdminNav } from './AdminNav';
import { supabase } from '@/data/supabase';
import { setInstitutionScope, setCourseScope, setSchoolScope } from '@/data/db';
import { canOpen } from './AdminNav';
import { PanelSlotContext } from '@/components/shared/InlinePanel';
import { useProfile } from '@/hooks/useProfile';

export const DashboardLayout = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [panelSlot, setPanelSlot] = useState<HTMLElement | null>(null);

  // No session (never signed in, expired, or signed out in another tab): back to sign in.
  useEffect(() => {
    const toLogin = () => navigate('/login', { replace: true });
    supabase.auth.getSession().then(({ data }) => { if (!data.session) toLogin(); }, toLogin);
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => { if (!session) toLogin(); });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const { data: me } = useProfile();
  if (!me) {
    return (
      <div role="status" aria-label="Loading" className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-5 animate-spin text-ink-muted motion-reduce:animate-none" />
      </div>
    );
  }
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
