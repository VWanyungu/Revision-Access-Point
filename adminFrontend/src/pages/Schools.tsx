import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, School, Filter, Search, Building2, Grid } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { FormModal } from '@/components/shared/FormModal';
import { BulkCreateEntityModal } from '@/components/shared/BulkCreateEntityModal';
import { InlineText } from '@/components/shared/InlineText';
import { INSTITUTION_COLUMN } from '@/components/shared/institutionColumn';
import { useProfile } from '@/hooks/useProfile';
import { Combobox } from '@/components/shared/Combobox';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { schools as initialSchools, School as SchoolType } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { InstitutionFilter } from '@/components/shared/InstitutionFilter';
import { getRecords, addRecord, updateRecord, deleteRecord } from '@/data/db';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const Schools = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const [editingSchool, setEditingSchool] = useState<SchoolType | null>(null);
  const [deletingSchool, setDeletingSchool] = useState<SchoolType | null>(null);
  const [formData, setFormData] = useState({ id: 0, name: '', code: '', institution_id: 0 });
  const { data: me } = useProfile();
  const { data: instData } = useQuery({ queryKey: ['institutions', 'all'], queryFn: () => getRecords('institutions', { pageSize: 100 }) });
  const institutions = instData?.data ?? [];
  const { toast } = useToast();

  const [institutionId, setInstitutionId] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: schoolsData, isLoading } = useQuery({
    queryKey: ['schools', page, debouncedSearch, institutionId],
    queryFn: async () => {
      return await getRecords('schools', { page, pageSize: 10, search: debouncedSearch, institution_id: institutionId })
    },
    placeholderData: (previousData) => previousData,
  });

  const schools = schoolsData?.data || [];
  const meta = schoolsData?.meta;

  const handleOpenCreate = () => {
    setEditingSchool(null);
    setFormData({ id: 0, name: '', code: '', institution_id: institutions[0]?.id ?? 0 });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (school: SchoolType) => {
    setEditingSchool(school);
    setFormData({ id: school.id, name: school.name, code: school.code, institution_id: school.institutions?.id ?? 0 });
    setIsFormOpen(true);
  };

  const handleOpenDelete = (school: SchoolType) => {
    setDeletingSchool(school);
    setFormData({ id: school.id, name: school.name, code: school.code, institution_id: school.institutions?.id ?? 0 });
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingSchool) {
      const { status, error, data } = await updateRecord('schools', formData.id!, { name: formData.name, code: formData.code });
      if (status === 'success'){
        toast({ title: 'School updated successfully' });
        queryClient.invalidateQueries({ queryKey: ['departments'] });
      }
      else
        toast({ title: 'Error updating school', variant: 'destructive' });
    } else {
      const { status, error, data } = await addRecord('schools', { name: formData.name, code: formData.code, ...(formData.institution_id ? { institution_id: formData.institution_id } : {}) });
      if (status === 'success'){
        toast({ title: 'School created successfully' });
        queryClient.invalidateQueries({ queryKey: ['departments'] });
      }
      else
        toast({ title: 'Error creating school', variant: 'destructive' });
    }

    setIsFormOpen(false);
  };

  const handleDelete = async () => {
    if (deletingSchool) {
      const { status, error, data } = await deleteRecord('schools', deletingSchool.id);
      if (status === 'success'){
        toast({ title: 'School deleted successfully', variant: 'destructive' });
        queryClient.invalidateQueries({ queryKey: ['departments'] });
      }
      else
        toast({ title: 'Error deleting school', variant: 'destructive' });
    }
    setIsDeleteOpen(false);
    setDeletingSchool(null);
  };

  const saveField = async (id: number, fields: Record<string, string>) => {
    const res = await updateRecord('schools', id, fields);
    if (res.status === 'error') { toast({ title: 'Could not save', variant: 'destructive' }); throw res.error; }
    queryClient.invalidateQueries({ queryKey: ['schools'] });
    queryClient.invalidateQueries({ queryKey: ['departments'] });
  };

  const columns: Column<SchoolType>[] = [
    {
      key: 'name',
      header: 'School Name',
      render: (school) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-field">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <InlineText value={school.name} onSave={(v) => saveField(school.id, { name: v })} className="font-medium" />
            <InlineText value={school.code} onSave={(v) => saveField(school.id, { code: v.toUpperCase() })} className="block text-xs text-ink-muted" />
          </div>
        </div>
      ),
    },
    INSTITUTION_COLUMN,
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (school) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => handleOpenEdit(school)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => handleOpenDelete(school)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Schools"
        description=""
        actions={
          <div className="flex w-full justify-end gap-2">
            <Button variant="outline" onClick={() => setIsBulkOpen(true)} className="action-button-secondary">
              {/* <Grid className="h-4 w-4 mr-2" /> */}
              Bulk Create
            </Button>
            <Button onClick={handleOpenCreate} className="action-button">
              {/* <Plus className="h-4 w-4 mr-2" /> */}
              Add
            </Button>
          </div>
        }
      />

      {/* Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search schools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="w-full sm:w-64"><InstitutionFilter value={institutionId} onChange={(id) => { setInstitutionId(id); setPage(1); }} /></div>
      </div>

      <DataTable
        columns={columns}
        data={schools}
        keyExtractor={(school) => `${school.id}`}
        emptyMessage="No schools found. Create your first school to get started."
        meta={meta}
        onPageChange={setPage}
      />

      {/* Form Modal */}
      <FormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        title={editingSchool ? 'Edit School' : 'Add School'}
        description={editingSchool ? 'Update school information' : 'Create a new school'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">School Name</Label>
            <Input
              id="name"
              placeholder="e.g., School of Engineering"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          {me?.role === 'super_admin' && (
            <div className="space-y-2">
              <Label>Institution</Label>
              <Combobox
                options={institutions.map((i: any) => ({ value: String(i.id), label: `${i.short_name} - ${i.name}` }))}
                value={String(formData.institution_id)}
                onChange={(v) => setFormData({ ...formData, institution_id: Number(v) })}
                placeholder="Select institution"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="code">School Code</Label>
            <Input
              id="code"
              placeholder="e.g., ENG"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              required
              maxLength={5}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="action-button">
              {editingSchool ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </FormModal>

      <BulkCreateEntityModal
        open={isBulkOpen}
        onOpenChange={setIsBulkOpen}
        type="school"
        institutionId={formData.institution_id || institutions[0]?.id}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['schools'] });
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Delete School"
        description={`Are you sure you want to delete "${deletingSchool?.name}"? This action cannot be undone and will remove all associated courses, units, and resources.`}
        confirmText="Delete"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div >
  );
};

export default Schools;
