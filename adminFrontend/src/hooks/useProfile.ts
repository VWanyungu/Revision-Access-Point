import { useQuery } from '@tanstack/react-query';
import type { AdminRole } from '@/contexts/AuthContext';
import { supabase } from '@/data/supabase';

/** The signed-in admin, with the profile fields kept in auth user_metadata (no extra table). */
export const useProfile = () =>
  useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw error ?? new Error('Not signed in');
      const m = data.user.user_metadata ?? {};
      const name: string = m.full_name || data.user.email?.split('@')[0] || 'Admin';
      // Set server-side (app_metadata); anything without a role keeps the existing super-admin behaviour.
      const a = data.user.app_metadata ?? {};
      return {
        role: (a.role ?? 'super_admin') as AdminRole,
        institutionId: (a.institution_id as number | undefined) ?? null,
        // Department ids a course admin owns (set server-side in app_metadata.course_ids).
        schoolIds: ((a.school_ids as number[] | undefined) ?? []).map(Number),
        courseIds: ((a.course_ids as number[] | undefined) ?? []).map(Number),
        email: data.user.email ?? '',
        name,
        avatarUrl: (m.avatar_url as string | undefined) ?? null,
        bannerUrl: (m.banner_url as string | undefined) ?? null,
        createdAt: data.user.created_at,
        initials: name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join(''),
      };
    },
  });
