import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, School, Filter, Search, Building2, Grid } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { FormModal } from '@/components/shared/FormModal';
import { BulkCreateEntityModal } from '@/components/shared/BulkCreateEntityModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { schools as initialSchools, School as SchoolType } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
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
  const [formData, setFormData] = useState({ id: 0, name: '', code: '' });
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: schoolsData, isLoading } = useQuery({
    queryKey: ['schools', page, debouncedSearch],
    queryFn: async () => {
      return await getRecords('schools', { page, pageSize: 10, search: debouncedSearch })
    },
    placeholderData: (previousData) => previousData,
  });

  const schools = schoolsData?.data || [];
  const meta = schoolsData?.meta;

  const handleOpenCreate = () => {
    setEditingSchool(null);
    setFormData({ id: 0, name: '', code: '' });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (school: SchoolType) => {
    setEditingSchool(school);
    setFormData({ id: school.id, name: school.name, code: school.code });
    setIsFormOpen(true);
  };

  const handleOpenDelete = (school: SchoolType) => {
    setDeletingSchool(school);
    setFormData({ id: school.id, name: school.name, code: school.code });
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
      const { status, error, data } = await addRecord('schools', { name: formData.name, code: formData.code });
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

  const columns: Column<SchoolType>[] = [
    {
      key: 'name',
      header: 'School Name',
      render: (school) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">{school.name}</p>
            <p className="text-xs text-muted-foreground">{school.code}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (school) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenEdit(school)}
          >
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
      <div className="flex justify-between items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search schools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
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
