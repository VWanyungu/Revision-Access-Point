import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getRecords } from '@/data/db';

interface Props {
  value: number;
  onChange: (id: number) => void;
  label?: string;
}

/**
 * Institution picker for forms. The list is already limited to the admin's own institution (db scope), so scoped admins
 * see one option and it is chosen for them.
 */
export const InstitutionSelect = ({ value, onChange, label = 'Institution *' }: Props) => {
  const { data } = useQuery({ queryKey: ['institutions', 'all'], queryFn: () => getRecords('institutions', { pageSize: 100 }) });
  const institutions: any[] = data?.data ?? [];

  useEffect(() => {
    if (!value && institutions.length === 1) onChange(Number(institutions[0].id));
  }, [value, institutions, onChange]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value ? String(value) : ''} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger><SelectValue placeholder="Select institution" /></SelectTrigger>
        <SelectContent>
          {institutions.map((i) => <SelectItem key={i.id} value={String(i.id)}>{i.short_name ? `${i.short_name} · ${i.name}` : i.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
};
