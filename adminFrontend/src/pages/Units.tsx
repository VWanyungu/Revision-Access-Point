import { useState, useRef, useEffect } from 'react';
import { Plus, Pencil, Trash2, FileText, LayoutGrid, Filter, Search, Layers, Grid } from 'lucide-react';
import { Combobox } from '@/components/shared/Combobox';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { FormModal } from '@/components/shared/FormModal';
import { BulkCreateEntityModal } from '@/components/shared/BulkCreateEntityModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Unit } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { getRecords, addRecord, updateRecord, deleteRecord } from '@/data/db';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const Units = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);
  const [filter, setFilter] = useState({ department_id: 0 });
  const [formData, setFormData] = useState({ id: 0, name: '', code: '', department_id: 0, year_of_study: '1', semester_of_study: '1' });
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: unitsData, isLoading } = useQuery({
    queryKey: ['units', page, debouncedSearch, filter],
    queryFn: async () => {
      return await getRecords('units', { page, pageSize: 10, search: debouncedSearch, ...filter})
    },
    placeholderData: (previousData) => previousData,
  });

  const units = unitsData?.data || [];
  const meta = unitsData?.meta;

  const { data: departmentsData, isLoading: departmentsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      return await getRecords('departments', { pageSize: 100 })
    },
  });

  const departments = departmentsData?.data || [];

  const handleOpenCreate = () => {
    setEditingUnit(null);
    setFormData({ id: 0, name: '', code: '', department_id: 0, year_of_study: '1', semester_of_study: '1' });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setFormData({
      id: Number(unit.id),
      name: unit.name,
      code: unit.code,
      department_id: Number(unit.departments.id),
      year_of_study: unit.year_of_study.toString(),
      semester_of_study: unit.semester_of_study.toString(),
    });
    setIsFormOpen(true);
  };

  const handleOpenDelete = (unit: Unit) => {
    setDeletingUnit(unit);
    setFormData({
      id: Number(unit.id),
      name: unit.name,
      code: unit.code,
      department_id: Number(unit.departments.id),
      year_of_study: unit.year_of_study.toString(),
      semester_of_study: unit.semester_of_study.toString(),
    });
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const course = departments.find(c => Number(c.id) === formData.department_id);

    if (editingUnit) {
      const { status, error, data } = await updateRecord('units', formData.id, { name: formData.name, code: formData.code, department_id: formData.department_id, year_of_study: Number(formData.year_of_study), semester_of_study: Number(formData.semester_of_study) });
      if (status === 'success'){
        toast({ title: 'Unit updated successfully' });
        queryClient.invalidateQueries({ queryKey: ['units', page, debouncedSearch, filter] })
      }   
      else
        toast({ title: 'Error updating unit', variant: 'destructive' });
    } else {
      const { status, error, data } = await addRecord('units', { name: formData.name, code: formData.code, department_id: formData.department_id, year_of_study: Number(formData.year_of_study), semester_of_study: Number(formData.semester_of_study) });
      if (status === 'success'){
        toast({ title: 'Unit created successfully' })
        queryClient.invalidateQueries({ queryKey: ['units', page, debouncedSearch, filter] })
      }
      else
        toast({ title: 'Error creating unit', variant: 'destructive' });
    }

    setIsFormOpen(false);
  };

  const handleDelete = async () => {
    if (deletingUnit) {
      const { status, error, data } = await deleteRecord('units', formData.id);
      if (status === 'success'){
        toast({ title: 'Unit deleted successfully', variant: 'destructive' });
        queryClient.invalidateQueries({ queryKey: ['units', page, debouncedSearch, filter] })
      }
      else
        toast({ title: 'Error deleting unit', variant: 'destructive' });
    }
    setIsDeleteOpen(false);
    setDeletingUnit(null);
  };

  const columns: Column<Unit>[] = [
    {
      key: 'name',
      header: 'Unit Name',
      render: (unit) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">{unit.name}</p>
            <p className="text-xs text-muted-foreground">{unit.code}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'department_id',
      header: 'Department',
      className: 'hidden md:table-cell',
      render: (unit) => (
        <span className="context-badge">{unit.departments.name}</span>
      ),
    },
    {
      key: 'year_of_study',
      header: 'Year',
      className: 'hidden md:table-cell',
      render: (unit) => (
        <Badge variant="outline">Year {unit.year_of_study}</Badge>
      ),
    },
    {
      key: 'semester_of_study',
      header: 'Semester',
      className: 'hidden md:table-cell',
      render: (unit) => (
        <Badge variant="outline">Semester {unit.semester_of_study}</Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (unit) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenEdit(unit)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => handleOpenDelete(unit)}
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
        title="Units"
        description=""
        actions={
          <div className="flex justify-end gap-2 w-full">
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

      <div className="grid grid-cols-3 gap-3 mb-6">
        {/* Search */}
        <div className="relative max-w-sm col-span-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 col-span-2">
          {/* <Filter className="h-4 w-4 text-muted-foreground" /> */}
          <Combobox
            options={[
              { value: "all", label: "All departments" },
              ...departments.map((d: any) => ({ value: String(d.id), label: d.name }))
            ]}
            value={filter.department_id > 0 ? String(filter.department_id) : "all"}
            onChange={(value) => setFilter({ ...filter, department_id: value === "all" ? 0 : Number(value) })}
            placeholder="Filter by department"
            searchPlaceholder="Search departments..."
            className=""
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={units}
        keyExtractor={(unit) => unit.id}
        emptyMessage="No units found. Create your first unit to get started."
        meta={meta}
        onPageChange={setPage}
      />

      {/* Form Modal */}
      <FormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        title={editingUnit ? 'Edit Unit' : 'Add Unit'}
        description={editingUnit ? 'Update unit information' : 'Create a new unit'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Unit Name</Label>
            <Input
              id="name"
              placeholder="e.g., Data Structures & Algorithms"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Unit Code</Label>
            <Input
              id="code"
              placeholder="e.g., CS201"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              required
              maxLength={10}
            />
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Combobox
              options={departments.map((dept: any) => ({ value: String(dept.id), label: dept.name }))}
              value={String(formData.department_id)}
              onChange={(value) => setFormData({ ...formData, department_id: Number(value) })}
              placeholder="Select Department"
              searchPlaceholder="Search departments..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="year">Year of Study</Label>
            <Select
              value={String(formData.year_of_study)}
              onValueChange={(value) => setFormData({ ...formData, year_of_study: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="semester">Semester of Study</Label>
            <Select
              value={String(formData.semester_of_study)}
              onValueChange={(value) => setFormData({ ...formData, semester_of_study: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-between w-full gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="action-button">
              {editingUnit ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </FormModal>

      <BulkCreateEntityModal
        open={isBulkOpen}
        onOpenChange={setIsBulkOpen}
        type="unit"
        departments={departments}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['units'] });
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Delete Unit"
        description={`Are you sure you want to delete "${deletingUnit?.name}"? \n This action cannot be undone and will remove all associated resources.`}
        confirmText="Delete"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div >
  );
};

export default Units;
