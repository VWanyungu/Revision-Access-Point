import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, BookOpen, Filter, Grid, Search } from 'lucide-react';
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
import { InstitutionFilter } from '@/components/shared/InstitutionFilter';
import { InstitutionSelect } from '@/components/shared/InstitutionSelect';
import { getRecords, addRecord, updateRecord, deleteRecord } from '@/data/db';

const Departments = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null);
  const [filterSchool, setFilterSchool] = useState<string>('all');
  const [formData, setFormData] = useState({ id: '', name: '', code: '', school_id: '' });
  const [formInstitution, setFormInstitution] = useState(0);
  const { toast } = useToast();

  const [institutionId, setInstitutionId] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: departmentsData, isLoading: departmentsLoading } = useQuery({
    queryKey: ['departments', page, debouncedSearch, institutionId],
    queryFn: async () => {
      return await getRecords('departments', { page, pageSize: 10, search: debouncedSearch, institution_id: institutionId })
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

  const filteredDepartments = departments.filter((c: any) => {
    return filterSchool === 'all' || String(c.schools.id) === filterSchool;
  });

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
      header: 'Department Name',
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
      render: (department) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenEdit(department)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => handleOpenDelete(department)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
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
              Bulk Create
            </Button>
            <Button onClick={handleOpenCreate} className="action-button">
              {/* <Plus className="h-4 w-4 mr-2" /> */}
              Add
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Search */}
        <div className="relative w-full max-w-sm sm:col-span-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Filter */}
        <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-center">
          <InstitutionFilter value={institutionId} onChange={(id) => { setInstitutionId(id); setPage(1); }} />
          <Combobox
            options={[
              { value: "all", label: "All Schools" },
              ...schools.map((s: any) => ({ value: String(s.id), label: s.name }))
            ]}
            value={filterSchool}
            onChange={setFilterSchool}
            placeholder="Filter by school"
            searchPlaceholder="Search schools..."
            className=""
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredDepartments}
        keyExtractor={(department) => department.id}
        emptyMessage="No departments found. Create your first department to get started."
        meta={meta}
        onPageChange={setPage}
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
