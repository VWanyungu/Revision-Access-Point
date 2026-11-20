import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { Combobox } from '@/components/shared/Combobox';
import { InlineText } from '@/components/shared/InlineText';
import { INSTITUTION_COLUMN } from '@/components/shared/institutionColumn';
import { useFieldSaver } from '@/hooks/useFieldSaver';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { FormModal } from '@/components/shared/FormModal';
import { BulkCreateEntityModal } from '@/components/shared/BulkCreateEntityModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Department } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ListToolbar } from '@/components/shared/ListToolbar';
import { RowActions } from '@/components/shared/RowActions';
import { useListParams } from '@/hooks/useListParams';
import { InstitutionSelect } from '@/components/shared/InstitutionSelect';
import { getRecords, addRecord, updateRecord, deleteRecord } from '@/data/db';

const Departments = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const list = useListParams();
  const queryClient = useQueryClient();
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null);
  const [filterSchool, setFilterSchool] = useState(0);
  const [formData, setFormData] = useState({ id: '', name: '', code: '', school_id: '' });
  const [formInstitution, setFormInstitution] = useState(0);
  const { toast } = useToast();

  const { data: departmentsData, isLoading } = useQuery({
    queryKey: ['departments', list.page, list.debounced, list.institutionId, filterSchool, list.sort],
    queryFn: async () => {
      // The school filter runs in the database, so totals and pages stay correct.
      return await getRecords('departments', { page: list.page, pageSize: 10, search: list.debounced, institution_id: list.institutionId, school_id: filterSchool, sort: list.sort ?? undefined })
    },
    placeholderData: (previousData) => previousData,
  });

  const departments = departmentsData?.data || [];
  const meta = departmentsData?.meta;

  const { data: schoolsData, isLoading: schoolsLoading } = useQuery({
    queryKey: ['schools', 'all'],
    queryFn: async () => {
      return await getRecords('schools', { pageSize: 100 })
    },
  });

  const schools = schoolsData?.data || [];

  const handleOpenCreate = () => {
    setEditingDepartment(null);
    setFormData({ id: '', name: '', code: '', school_id: '' });
    setFormInstitution(0);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (department: Department) => {
    setEditingDepartment(department);
    setFormInstitution(Number((department as any).institutions?.id ?? 0));
    setFormData({ id: department.id, name: department.name, code: department.code, school_id: String(department.schools.id) });
    setIsFormOpen(true);
  };

  const handleOpenDelete = (department: Department) => {
    setDeletingDepartment(department);
    setFormData({ id: department.id, name: department.name, code: department.code, school_id: String(department.schools.id) });
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingDepartment) {
      const { status, error, data } = await updateRecord('departments', Number(formData.id), { name: formData.name, code: formData.code, school_id: Number(formData.school_id) });
      if (status === 'success'){
        toast({ title: 'Department updated successfully' });
        queryClient.invalidateQueries({ queryKey: ['departments'] });
      }
      else
        { toast({ title: 'Could not update the department', description: (error as any)?.message ?? 'Your entries are kept. Try again.', variant: 'destructive' }); return; }
    } else {
      const { status, error, data } = await addRecord('departments', { name: formData.name, code: formData.code, school_id: Number(formData.school_id) });
      if (status === 'success'){
        toast({ title: 'Department created successfully' });
        queryClient.invalidateQueries({ queryKey: ['departments'] });
      }
      else
        { toast({ title: 'Could not create the department', description: (error as any)?.message ?? 'Your entries are kept. Try again.', variant: 'destructive' }); return; }
    }

    setIsFormOpen(false);
  };

  const [submit, saving] = useSubmitLock(handleSubmit);


  const handleDelete = async () => {
    if (deletingDepartment) {
      const { status, error, data } = await deleteRecord('departments', Number(deletingDepartment.id));
      if (status === 'success'){
        toast({ title: 'Department deleted' });
        queryClient.invalidateQueries({ queryKey: ['departments'] });
      }
      else
        toast({ title: 'Error deleting department', variant: 'destructive' });
    }
    
    setIsDeleteOpen(false);
    setDeletingDepartment(null);
  };

  const saveField = useFieldSaver('departments');

  const columns: Column<Department>[] = [
    {
      key: 'name',
      header: 'Department name',
      sortKey: 'name',
      render: (department) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-field">
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <div>
            <InlineText value={department.name} onSave={(v) => saveField(department.id, { name: v })} className="font-medium" />
            <p className="text-xs text-muted-foreground">{department.code}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'schoolName',
      header: 'School',
      className: 'hidden md:table-cell',
      render: (department) => (
        <span className="context-badge">{department.schools.name}</span>
      ),
    },
    INSTITUTION_COLUMN,
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (department) => <RowActions name={department.name} onEdit={() => handleOpenEdit(department)} onDelete={() => handleOpenDelete(department)} />,
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Departments"
        description=""
        actions={
          <div className="flex w-full justify-end gap-2">
            <Button variant="outline" onClick={() => setIsBulkOpen(true)} className="action-button-secondary">
              {/* <Grid className="h-4 w-4 mr-2" /> */}
              Bulk add
            </Button>
            <Button onClick={handleOpenCreate} className="action-button">
              {/* <Plus className="h-4 w-4 mr-2" /> */}
              Add
            </Button>
          </div>
        }
      />

      <ListToolbar search={list.search} onSearch={list.setSearch} placeholder="Search departments" resultCount={meta?.total}
        institutionId={list.institutionId} onInstitution={(id) => { list.setInstitutionId(id); setFilterSchool(0); }}
        active={!!list.debounced || !!list.institutionId || !!filterSchool || !!list.sort} onReset={() => { list.reset(); setFilterSchool(0); }}>
        <div className="w-full sm:w-56">
          <Combobox
            options={[
              { value: 'all', label: 'All schools' },
              ...schools.filter((s: any) => !list.institutionId || s.institution_id === list.institutionId).map((s: any) => ({ value: String(s.id), label: s.name })),
            ]}
            value={filterSchool > 0 ? String(filterSchool) : 'all'}
            onChange={(v) => { setFilterSchool(v === 'all' ? 0 : Number(v)); list.setPage(1); }}
            placeholder="Filter by school"
            searchPlaceholder="Search schools..."
          />
        </div>
      </ListToolbar>

      <DataTable
        columns={columns}
        data={departments}
        isLoading={isLoading}
        keyExtractor={(department) => department.id}
        emptyMessage="No departments yet."
        emptyAction={{ label: 'Add department', onClick: handleOpenCreate }}
        filtered={!!list.debounced || !!list.institutionId || !!filterSchool}
        onResetFilters={() => { list.reset(); setFilterSchool(0); }}
        noun="departments"
        sort={list.sort}
        onSortChange={list.setSort}
        meta={meta}
        onPageChange={list.setPage}
      />

      {/* Form Modal */}
      <FormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        title={editingDepartment ? 'Edit Department' : 'Add Department'}
        description={editingDepartment ? 'Update department information' : 'Create a new department'}
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Department Name</Label>
            <Input
              id="name"
              placeholder="e.g., Computer Science"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Department Code</Label>
            <Input
              id="code"
              placeholder="e.g., CS"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              required
              maxLength={5}
            />
          </div>
          <InstitutionSelect value={formInstitution} onChange={(id) => { setFormInstitution(id); setFormData((f) => ({ ...f, school_id: '' })); }} />
          <div className="space-y-2">
            <Label htmlFor="school">School</Label>
            <Combobox
              options={schools.filter((s: any) => !formInstitution || s.institution_id === formInstitution).map((s: any) => ({ value: String(s.id), label: s.name }))}
              value={formData.school_id}
              onChange={(value) => setFormData({ ...formData, school_id: value })}
              placeholder="Select School"
              searchPlaceholder="Search schools..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="action-button" disabled={saving} aria-busy={saving}>
              {saving ? 'Saving…' : editingDepartment ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </FormModal>

      <BulkCreateEntityModal
        open={isBulkOpen}
        onOpenChange={setIsBulkOpen}
        type="department"
        schools={schools}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['departments'] });
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Delete Department"
        description={`Are you sure you want to delete "${deletingDepartment?.name}"? This action cannot be undone and will remove all associated units and resources.`}
        confirmText="Delete"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div >
  );
};

export default Departments;
