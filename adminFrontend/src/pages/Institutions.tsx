import { useState } from 'react';
import { Landmark, Pencil, Trash2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { FormModal } from '@/components/shared/FormModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { InlineText } from '@/components/shared/InlineText';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getRecords, addRecord, updateRecord, deleteRecord } from '@/data/db';

interface Institution { id: number; name: string; short_name: string }

const Institutions = () => {
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState({ name: '', short_name: '' });
  const [editing, setEditing] = useState<Institution | null>(null);
  const [deleting, setDeleting] = useState<Institution | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['institutions', page],
    queryFn: () => getRecords('institutions', { page, pageSize: 10 }),
    placeholderData: (prev) => prev,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['institutions'] });

  const rename = (row: Institution, field: 'name' | 'short_name') => async (value: string) => {
    const res = await updateRecord('institutions', row.id, { [field]: field === 'short_name' ? value.toUpperCase() : value });
    if (res.status === 'error') { toast({ title: 'Could not save', variant: 'destructive' }); throw res.error; }
    refresh();
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const fields = { name: form.name.trim(), short_name: form.short_name.trim().toUpperCase() };
    const res = editing ? await updateRecord('institutions', editing.id, fields) : await addRecord('institutions', fields);
    if (res.status === 'error') return toast({ title: editing ? 'Could not save institution' : 'Could not create institution', variant: 'destructive' });
    toast({ title: editing ? 'Institution updated' : 'Institution created' });
    setIsFormOpen(false);
    setEditing(null);
    setForm({ name: '', short_name: '' });
    refresh();
  };

  const remove = async () => {
    if (!deleting) return;
    const res = await deleteRecord('institutions', deleting.id);
    toast(res.status === 'success' ? { title: 'Institution deleted' } : { title: 'Cannot delete: it still has schools, units or resources', variant: 'destructive' });
    setDeleting(null);
    refresh();
  };

  const columns: Column<Institution>[] = [
    {
      key: 'name',
      header: 'Institution',
      render: (i) => (
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-field p-2"><Landmark className="h-4 w-4 text-brand" /></div>
          <InlineText value={i.name} onSave={rename(i, 'name')} className="font-medium" />
        </div>
      ),
    },
    { key: 'short_name', header: 'Short name', render: (i) => <InlineText value={i.short_name} onSave={rename(i, 'short_name')} /> },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (i) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => { setEditing(i); setForm({ name: i.name, short_name: i.short_name }); setIsFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" aria-label="Delete" className="text-danger" onClick={() => setDeleting(i)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Institutions" description="Each institution owns its schools, units, resources and students."
        actions={<Button onClick={() => { setEditing(null); setForm({ name: '', short_name: '' }); setIsFormOpen(true); }}>Add</Button>} />

      <FormModal open={isFormOpen} onOpenChange={(o) => { setIsFormOpen(o); if (!o) setEditing(null); }} title={editing ? 'Edit institution' : 'Add institution'}>
        <form onSubmit={create} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="inst-name">Name</Label><Input id="inst-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="inst-short">Short name</Label><Input id="inst-short" required maxLength={12} value={form.short_name} onChange={(e) => setForm({ ...form, short_name: e.target.value })} /></div>
          <div className="flex justify-end"><Button type="submit">{editing ? 'Save' : 'Create'}</Button></div>
        </form>
      </FormModal>

      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title="Delete institution"
        description={`Delete "${deleting?.name}"? This only works when it has no schools, units or resources.`}
        confirmText="Delete" variant="destructive" onConfirm={remove} />

      <DataTable columns={columns} data={data?.data ?? []} isLoading={isLoading} keyExtractor={(i) => String(i.id)}
        meta={data?.meta} onPageChange={setPage} emptyMessage="No institutions yet." />
    </div>
  );
};

export default Institutions;
