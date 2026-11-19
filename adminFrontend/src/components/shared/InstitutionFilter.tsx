import { useQuery } from '@tanstack/react-query';
import { Combobox } from '@/components/shared/Combobox';
import { getRecords } from '@/data/db';
import { useProfile } from '@/hooks/useProfile';

interface Props {
  /** Selected institution id; 0 means all. */
  value: number;
  onChange: (id: number) => void;
}

/** Institution filter for list pages. Only super admins see it: every other role is already limited to their own institution. */
export const InstitutionFilter = ({ value, onChange }: Props) => {
  const { data: me } = useProfile();
  const { data } = useQuery({ queryKey: ['institutions', 'all'], queryFn: () => getRecords('institutions', { pageSize: 100 }) });
  if (me?.role !== 'super_admin') return null;

  return (
    <Combobox
      options={[
        { value: 'all', label: 'All institutions' },
        ...(data?.data ?? []).map((i: any) => ({ value: String(i.id), label: i.short_name ?? i.name })),
      ]}
      value={value > 0 ? String(value) : 'all'}
      onChange={(v) => onChange(v === 'all' ? 0 : Number(v))}
      placeholder="Filter by institution"
      searchPlaceholder="Search institutions..."
    />
  );
};
