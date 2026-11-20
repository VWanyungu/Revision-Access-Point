import { useMemo, useState } from 'react';
import { Shield, Users } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { FormModal } from '@/components/shared/FormModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ListToolbar } from '@/components/shared/ListToolbar';
import { RowActions } from '@/components/shared/RowActions';
import type { Sort } from '@/hooks/useListParams';
import { InstitutionSelect } from '@/components/shared/InstitutionSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/data/supabase';
import { getRecords } from '@/data/db';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import type { AdminRole } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

// Admin accounts live in Supabase auth (app_metadata). The list and the changes go through the functions in
// Documentation/database/admins.sql, which scope everything by the caller's own role.
interface AdminRow {
  id: string;
  email: string;
  full_name: string;
  role: AdminRole;
  institution_id: number | null;
  school_ids: number[];
  course_ids: number[];
  created_at: string;
  last_sign_in_at: string | null;
}

const roleConfig: Record<AdminRole, { label: string; color: string }> = {
  super_admin: { label: 'Super Admin', color: 'bg-action/10 text-action border-action/20' },
  institution_admin: { label: 'Institution Admin', color: 'bg-field text-ink border-line' },
  school_admin: { label: 'School Admin', color: 'bg-brand/10 text-brand border-brand/20' },
  course_admin: { label: 'Course Admin', color: 'bg-info/10 text-info border-info/20' },
};

const emptyForm = { email: '', role: 'course_admin' as AdminRole, institutionId: 0, schoolIds: [] as number[], courseIds: [] as number[] };

const Admins = () => {
  const { data: me } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [institutionFilter, setInstitutionFilter] = useState(0);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminRow | null>(null);
  const [removing, setRemoving] = useState<AdminRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const isSuper = me?.role === 'super_admin';
  const institutionId = isSuper ? form.institutionId : me?.institutionId ?? 0;

  const { data: admins = [], isLoading, error } = useQuery({
    queryKey: ['admins'],
    queryFn: async (): Promise<AdminRow[]> => {
      const { data, error } = await supabase.rpc('list_admins');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: instData } = useQuery({ queryKey: ['institutions', 'all'], queryFn: () => getRecords('institutions', { pageSize: 100 }) });
  const { data: schoolData } = useQuery({ queryKey: ['schools', 'all'], queryFn: () => getRecords('schools', { pageSize: 100 }) });
  const { data: deptData } = useQuery({ queryKey: ['departments', 'all'], queryFn: () => getRecords('departments', { pageSize: 100 }) });
  const institutions: any[] = instData?.data ?? [];
  const schools: any[] = schoolData?.data ?? [];
  const departments: any[] = deptData?.data ?? [];

  const scopeLabel = (a: AdminRow) => {
    if (a.role === 'super_admin') return 'Platform';
    const inst = institutions.find((i) => i.id === a.institution_id)?.short_name ?? '';
    if (a.role === 'institution_admin') return inst || 'Institution';
    const names = a.role === 'school_admin'
      ? a.school_ids.map((id) => schools.find((s) => s.id === id)?.name).filter(Boolean)
      : a.course_ids.map((id) => departments.find((d) => d.id === id)?.name).filter(Boolean);
    const shownNames = names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ');
    return [inst, shownNames || (a.role === 'school_admin' ? 'No schools yet' : 'No courses yet')].filter(Boolean).join(' · ');
  };

  // The list comes whole from one database call, so search and sort happen here.
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = admins.filter((a) => (!institutionFilter || a.institution_id === institutionFilter) && (!q || `${a.full_name} ${a.email}`.toLowerCase().includes(q)));
    if (!sort) return rows;
    const get = (a: AdminRow) => String((a as any)[sort.key] ?? '');
    return [...rows].sort((a, b) => get(a).localeCompare(get(b)) * (sort.dir === 'asc' ? 1 : -1));
  }, [admins, institutionFilter, search, sort]);
  const resetFilters = () => { setSearch(''); setInstitutionFilter(0); setSort(null); };
  const count = (r: AdminRole) => admins.filter((a) => a.role === r).length;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admins'] });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, institutionId: isSuper ? 0 : me?.institutionId ?? 0 });
    setIsFormOpen(true);
  };

  const openEdit = (a: AdminRow) => {
    setEditing(a);
    setForm({ email: a.email, role: a.role, institutionId: a.institution_id ?? 0, schoolIds: a.school_ids, courseIds: a.course_ids });
    setIsFormOpen(true);
  };

  const toggle = (key: 'schoolIds' | 'courseIds', id: number) =>
    setForm((f) => ({ ...f, [key]: f[key].includes(id) ? f[key].filter((x) => x !== id) : [...f[key], id] }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.role !== 'super_admin' && !institutionId) return toast({ title: 'Choose an institution', variant: 'destructive' });
    // Do not let a super admin demote themselves, or the last super admin, out of the role.
    if (editing && editing.role === 'super_admin' && form.role !== 'super_admin' && (isMe(editing) || lastSuper(editing))) {
      return toast({ title: 'Keep at least one super admin', description: 'Make someone else a super admin first.', variant: 'destructive' });
    }
    setSaving(true);
    const { error } = await supabase.rpc('grant_admin', {
      p_email: form.email.trim(),
      p_role: form.role,
      p_institution_id: form.role === 'super_admin' ? null : institutionId,
      p_school_ids: form.role === 'school_admin' ? form.schoolIds : [],
      p_course_ids: form.role === 'course_admin' ? form.courseIds : [],
    });
    setSaving(false);
    if (error) {
      return toast({ title: editing ? 'Could not update admin' : 'Could not add admin', description: error.message, variant: 'destructive' });
    }
    toast({ title: editing ? 'Admin updated' : 'Admin added' });
    setIsFormOpen(false);
    refresh();
  };

  // You cannot remove yourself, and the platform must always keep one super admin.
  const lastSuper = (a: AdminRow) => a.role === 'super_admin' && count('super_admin') <= 1;
  const isMe = (a: AdminRow) => a.email === me?.email;
  const whyLocked = (a: AdminRow) => isMe(a) ? 'You cannot remove your own access' : lastSuper(a) ? 'The last super admin cannot be removed' : '';

  const remove = async () => {
    if (!removing) return;
    if (whyLocked(removing)) { toast({ title: whyLocked(removing), variant: 'destructive' }); setRemoving(null); return; }
    const { error } = await supabase.rpc('revoke_admin', { p_user: removing.id });
    toast(error ? { title: 'Could not remove admin', description: error.message, variant: 'destructive' } : { title: 'Admin access removed' });
    setRemoving(null);
    refresh();
  };

  const roleOptions: AdminRole[] = isSuper ? ['super_admin', 'institution_admin', 'school_admin', 'course_admin'] : ['school_admin', 'course_admin'];
  const scopeSchools = schools.filter((s) => !institutionId || s.institution_id === institutionId);
  const scopeDepartments = departments.filter((d) => !institutionId || d.institution_id === institutionId);

  const columns: Column<AdminRow>[] = [
    {
      key: 'name',
      header: 'Admin',
      sortKey: 'full_name',
      render: (a) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <span className="text-sm font-medium text-brand">{a.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}</span>
          </div>
          <div>
            <p className="font-medium">{a.full_name}</p>
            <p className="text-xs text-muted-foreground">{a.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortKey: 'role',
      render: (a) => <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs font-medium', roleConfig[a.role].color)}>{roleConfig[a.role].label}</span>,
    },
    { key: 'scope', header: 'Scope', render: (a) => <span className="context-badge">{scopeLabel(a)}</span> },
    {
      key: 'lastActive',
      header: 'Last active',
      sortKey: 'last_sign_in_at',
      render: (a) => (
        <span className="text-muted-foreground">
          {a.last_sign_in_at ? new Date(a.last_sign_in_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (a) => <RowActions name={a.full_name || a.email} onEdit={() => openEdit(a)} onDelete={isSuper ? () => setRemoving(a) : undefined} deleteBlockedReason={whyLocked(a) || undefined} />,
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Admins & Permissions"
        description="Who can manage what. Admins are existing accounts that have been given a role."
        actions={<Button onClick={openCreate} className="action-button">Add admin</Button>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Super Admins', n: count('super_admin'), Icon: Shield, tint: 'bg-brand/10 text-brand' },
          { label: 'Institution Admins', n: count('institution_admin'), Icon: Shield, tint: 'bg-action/10 text-action' },
          { label: 'School Admins', n: count('school_admin'), Icon: Users, tint: 'bg-field text-brand' },
          { label: 'Course Admins', n: count('course_admin'), Icon: Users, tint: 'bg-info/10 text-info' },
        ].map(({ label, n, Icon, tint }) => (
          <div key={label} className="flex items-center gap-4 rounded-3xl bg-surface p-4 ring-1 ring-line">
            <div className={cn('rounded-full p-3', tint)}><Icon className="h-5 w-5" /></div>
            <div>
              <p className="text-2xl font-semibold">{isLoading ? '…' : n}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <ListToolbar search={search} onSearch={setSearch} placeholder="Search admins" resultCount={shown.length}
        institutionId={institutionFilter} onInstitution={setInstitutionFilter}
        active={!!search || !!institutionFilter || !!sort} onReset={resetFilters} />

      {error && <p className="mb-4 rounded-2xl bg-surface p-4 text-sm text-danger ring-1 ring-line">Admins could not be loaded. Refresh the page to try again. If it keeps failing, ask the person who manages the database.</p>}

      <DataTable columns={columns} data={shown} isLoading={isLoading} keyExtractor={(a) => a.id} emptyMessage="No admins yet." emptyAction={{ label: 'Add admin', onClick: openCreate }} filtered={!!search || !!institutionFilter} onResetFilters={resetFilters} noun="admins" sort={sort} onSortChange={setSort} />

      <FormModal open={isFormOpen} onOpenChange={setIsFormOpen} title={editing ? 'Edit admin' : 'Add admin'} description="The person must already have an account. Enter the email they signed up with.">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required disabled={!!editing} placeholder="name@university.edu" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AdminRole, schoolIds: [], courseIds: [] })}>
              <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent>
                {roleOptions.map((r) => <SelectItem key={r} value={r}>{roleConfig[r].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {form.role !== 'super_admin' && isSuper && (
            <InstitutionSelect value={form.institutionId} onChange={(id) => setForm({ ...form, institutionId: id, schoolIds: [], courseIds: [] })} />
          )}

          {form.role === 'school_admin' && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Schools</legend>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-2xl bg-field p-2">
                {scopeSchools.length === 0 && <p className="p-2 text-sm text-muted-foreground">Choose an institution first.</p>}
                {scopeSchools.map((s) => (
                  <label key={s.id} className="flex cursor-pointer items-center gap-3 rounded-inner px-3 py-2 text-sm hover:bg-surface">
                    <input type="checkbox" className="size-4 accent-primary" checked={form.schoolIds.includes(Number(s.id))} onChange={() => toggle('schoolIds', Number(s.id))} />
                    {s.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {form.role === 'course_admin' && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Courses</legend>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-2xl bg-field p-2">
                {scopeDepartments.length === 0 && <p className="p-2 text-sm text-muted-foreground">Choose an institution first.</p>}
                {scopeDepartments.map((d) => (
                  <label key={d.id} className="flex cursor-pointer items-center gap-3 rounded-inner px-3 py-2 text-sm hover:bg-surface">
                    <input type="checkbox" className="size-4 accent-primary" checked={form.courseIds.includes(Number(d.id))} onChange={() => toggle('courseIds', Number(d.id))} />
                    {d.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button type="submit" className="action-button" disabled={saving}>{saving ? 'Saving…' : editing ? 'Update' : 'Add admin'}</Button>
          </div>
        </form>
      </FormModal>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Remove admin access"
        description={`Remove admin access for ${removing?.email}? Their account stays, but they can no longer sign in to the admin app.`}
        confirmText="Remove"
        variant="destructive"
        onConfirm={remove}
      />
    </div>
  );
};

export default Admins;
