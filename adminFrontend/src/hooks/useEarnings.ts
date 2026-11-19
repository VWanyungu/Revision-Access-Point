import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/data/supabase';

export interface EarningRow {
  subscription_id: number;
  created_at: string;
  department_id: number;
  department_name: string;
  institution_id: number;
  institution_name: string;
  year_of_study: number;
  semester_of_study: number;
  amount: number;
  app_share: number;
  admin_share: number;
}

/**
 * Paid semester passes the signed-in admin may see. Scoping is done by the database from the caller's role
 * (course admins get only their own courses), so nothing here widens it.
 */
export const useEarnings = () =>
  useQuery({
    queryKey: ['earnings'],
    queryFn: async (): Promise<EarningRow[]> => {
      const { data, error } = await supabase.rpc('earnings_rows');
      if (error) throw error;
      return (data ?? []).map((r: EarningRow) => ({ ...r, amount: Number(r.amount), app_share: Number(r.app_share), admin_share: Number(r.admin_share) }));
    },
  });

export const ksh = (n: number) => `KSH ${n.toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;
