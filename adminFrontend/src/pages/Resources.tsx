import { useState, useRef, useEffect } from 'react';
import { Plus, Pencil, Trash2, FileText, Upload, Filter, BookOpen, ClipboardList, GraduationCap, Lightbulb, Grid, Search, Loader2 } from 'lucide-react';
import { Combobox } from '@/components/shared/Combobox';
import { InlineText } from '@/components/shared/InlineText';
import { INSTITUTION_COLUMN } from '@/components/shared/institutionColumn';
import { useFieldSaver } from '@/hooks/useFieldSaver';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { FormModal } from '@/components/shared/FormModal';
import { BulkUploadModal } from '@/components/shared/BulkUploadModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Resource } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { InstitutionFilter } from '@/components/shared/InstitutionFilter';
import { InstitutionSelect } from '@/components/shared/InstitutionSelect';
import { getRecords, addRecord, updateRecord, deleteRecord, uploadFile, uploadImage, getTopics } from '@/data/db';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';

let resourceTypeConfig = {
  notes: { icon: BookOpen, label: 'Notes', color: 'bg-info/10 text-info', id: 0 },
  cats: { icon: ClipboardList, label: 'CATs', color: 'bg-warning/10 text-warning', id: 0 },
  exams: { icon: GraduationCap, label: 'Exams', color: 'bg-brand/10 text-brand', id: 0 },
  tutorials: { icon: Lightbulb, label: 'Tutorials', color: 'bg-success/10 text-success', id: 0 },
};

const Resources = () => {
  // const [resources, setResources] = useState<Resource[]>(initialResources);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [deletingResource, setDeletingResource] = useState<Resource | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [formInstitution, setFormInstitution] = useState(0);
  const [formData, setFormData] = useState({ id: 0, resource_type_id: 0, unit_id: 0, department_id: 0, school_id: 0, name: '', description: '', public_access_url: '', topic_id: 0, uploaded_by: '', cover_url: '' });
  const [uploadType, setUploadType] = useState<string>('link');
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [filter, setFilter] = useState<{ unit_id: number, resource_type_id: number, institution_id: number }>({ unit_id: 0, resource_type_id: 0, institution_id: 0 });
  const [filterUnit, setFilterUnit] = useState<number>(0);
  const [filterResourceType, setFilterResourceType] = useState<number>(0);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: resourcesData, isLoading } = useQuery({
    queryKey: ['resources', page, debouncedSearch, filter],
    queryFn: async () => {
      return await getRecords('resources', { page, pageSize: 10, search: debouncedSearch, ...filter })
    },
    placeholderData: (previousData) => previousData,
  });

  const resources = resourcesData?.data || [];
  const meta = resourcesData?.meta;

  const { data: schoolsData, isLoading: schoolsLoading } = useQuery({
    queryKey: ['schools'],
    queryFn: async () => {
      // Fetch more for dropdowns or implement async search later if needed
      return await getRecords('schools', { pageSize: 100 })
    },
  });

  const schools = schoolsData?.data || [];

  const { data: departmentsData, isLoading: departmentsLoading } = useQuery({
    queryKey: ['departments', filter.institution_id],
    queryFn: async () => {
      return await getRecords('departments', { pageSize: 100, institution_id: filter.institution_id })
    },
  });

  const departments = departmentsData?.data || [];

  const { data: unitsData, isLoading: unitsLoading } = useQuery({
    queryKey: ['units', filter.institution_id],
    queryFn: async () => {
      return await getRecords('units', { pageSize: 100, institution_id: filter.institution_id })
    },
  });

  const units = unitsData?.data || [];

  const { data: topics = [] } = useQuery({
    queryKey: ['topics', formData.unit_id],
    enabled: formData.unit_id > 0,
    queryFn: () => getTopics(formData.unit_id),
  });

  const { data: resourceTypes = [], isLoading: typesLoading } = useQuery({
    queryKey: ['resource_types'],
    queryFn: async () => {
      const res = await getRecords('resource_types')
      const data = res.data || [];
      resourceTypeConfig = {
        notes: { icon: BookOpen, label: 'Notes', color: 'bg-info/10 text-info', id: data.find((r: any) => r.name === 'notes')?.id },
        cats: { icon: ClipboardList, label: 'CATs', color: 'bg-warning/10 text-warning', id: data.find((r: any) => r.name === 'cats')?.id },
        exams: { icon: GraduationCap, label: 'Exams', color: 'bg-brand/10 text-brand', id: data.find((r: any) => r.name === 'exams')?.id },
        tutorials: { icon: Lightbulb, label: 'Tutorials', color: 'bg-success/10 text-success', id: data.find((r: any) => r.name === 'tutorials')?.id },
      };
      return data;
    },
  });

  // Only touch cover_url when there is one to set or clear, so saving works before the column exists.
  const coverField = formData.cover_url || (editingResource as any)?.cover_url ? { cover_url: formData.cover_url || null } : {};
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const handleCover = async (file: File) => {
    setCoverUploading(true);
    try {
      const url = await uploadImage(file);
      setFormData((f) => ({ ...f, cover_url: url }));
    } catch {
      toast({ title: 'Cover photo upload failed', variant: 'destructive' });
    } finally {
      setCoverUploading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingResource(null);
    setFormInstitution(0);
    setFormData({ id: 0, resource_type_id: 0, unit_id: 0, department_id: 0, school_id: 0, name: '', description: '', public_access_url: '', topic_id: 0, uploaded_by: JSON.parse(localStorage.getItem('sb-ptktlornnngqvzbbisaq-auth-token')).user.email, cover_url: '' })
    setIsFormOpen(true);
  };

  const handleOpenEdit = (resource: Resource) => {
    setEditingResource(resource);
    setFormInstitution(Number((resource as any).institutions?.id ?? 0));
    setFormData({
      id: Number(resource.id),
      resource_type_id: resource.resource_type_id,
      unit_id: Number(resource.unit_id),
      department_id: Number(resource.department_id),
      school_id: Number(resource.school_id),
      name: resource.name,
      description: resource.description,
      public_access_url: resource.public_access_url,
      topic_id: Number(resource.topic_id) || 0,
      cover_url: (resource as any).cover_url ?? '',
      uploaded_by: JSON.parse(localStorage.getItem('sb-ptktlornnngqvzbbisaq-auth-token')).user.email
    });
    setIsFormOpen(true);
  };

  const handleOpenDelete = (resource: Resource) => {
    setDeletingResource(resource);
    setFormData({
      id: Number(resource.id),
      resource_type_id: 0,
      unit_id: 0,
      department_id: 0,
      school_id: 0, name: '',
      description: '',
      public_access_url: '',
      topic_id: 0,
      cover_url: '',
      uploaded_by: JSON.parse(localStorage.getItem('sb-ptktlornnngqvzbbisaq-auth-token')).user.email
    });
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (uploadType === 'file' && file) {
      console.log('Attempting file upload:');

      const res = await uploadFile(file);

      console.log('Upload response:', res);

      if (res.error || res.public_access_url === null) {
        console.log(res.error)
        toast({ title: 'Error uploading file', variant: 'destructive' });
        return
      }

      formData.public_access_url = res.public_access_url;

      console.log('Uploaded file URL:', res.public_access_url);
    }

    if (editingResource) {
      const { status, error, data } = await updateRecord('resources', formData.id, { name: formData.name, description: formData.description, resource_type_id: formData.resource_type_id, unit_id: formData.unit_id, department_id: formData.department_id, school_id: formData.school_id, public_access_url: formData.public_access_url, topic_id: formData.topic_id || null, uploaded_by: formData.uploaded_by, ...coverField });

      if (status === 'success') {
        toast({ title: 'Resource updated successfully' });
        queryClient.invalidateQueries({ queryKey: ['resources', page, debouncedSearch, filter] })
      } else {
        if (error) console.log(error)
        toast({ title: 'Error updating resource', variant: 'destructive' });
      }

    } else {
      const { status, error, data } = await addRecord('resources', { name: formData.name, description: formData.description, resource_type_id: formData.resource_type_id, unit_id: formData.unit_id, department_id: formData.department_id, school_id: formData.school_id, public_access_url: formData.public_access_url, topic_id: formData.topic_id || null, uploaded_by: formData.uploaded_by, ...coverField });

      if (status === 'success'){
        toast({ title: 'Resource uploaded successfully' });
        queryClient.invalidateQueries({ queryKey: ['resources', page, debouncedSearch, filter] })
      }
      else {
        if (error) console.log(error)
        toast({ title: 'Error uploading resource', variant: 'destructive' });
      }
    }

    setIsFormOpen(false);
  };

  const handleDelete = async () => {
    if (deletingResource) {
      const { status, error, data } = await deleteRecord('resources', formData.id);
      if (status === 'success'){
        toast({ title: 'Resource deleted successfully', variant: 'destructive' });
        queryClient.invalidateQueries({ queryKey: ['resources', page, debouncedSearch, filter] })
      }
      else
        toast({ title: 'Error deleting resource', variant: 'destructive' });
    }
    setIsDeleteOpen(false);
    setDeletingResource(null);
  };

  const handleFile = (selectedFile: File) => {
    if (selectedFile.type !== "application/pdf") {
      alert("Only PDF files are allowed")
      return
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      alert("File must be 50MB or less")
      return
    }

    setFile(selectedFile)
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) handleFile(droppedFile)
  }

  const saveField = useFieldSaver('resources');

  const columns: Column<Resource>[] = [
    {
      key: 'name',
      header: 'Resource',
      render: (resource) => {
        const config = resourceTypeConfig[resource.resource_types.name]
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", config.color)}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <InlineText value={resource.name} onSave={(v) => saveField(resource.id, { name: v })} className="font-medium" />
              <p className="text-xs text-muted-foreground">{resource.units.name}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'type',
      header: 'Status',
      className: 'hidden md:table-cell',
      render: (resource) => (
        <Badge variant="outline" className="capitalize">
          {resource.resource_types.name}
        </Badge>
      ),
    },
    {
      key: 'unitName',
      header: 'Unit',
      className: 'hidden md:table-cell',
      render: (resource) => (
        <span className="context-badge">{resource.units.name}</span>
      ),
    },
    {
      key: 'uploadedAt',
      header: 'Uploaded',
      className: 'hidden md:table-cell',
      render: (resource) => (
        <div>
          <p className="text-sm">
            {new Date(resource.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          <p className="text-xs text-muted-foreground">{resource.uploaded_by}</p>
        </div>
      ),
    },
    INSTITUTION_COLUMN,
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (resource) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenEdit(resource)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => handleOpenDelete(resource)}
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
        title="Resources"
        description=""
        actions={
          <div className="flex w-full justify-end gap-2">
            <Button variant="outline" onClick={() => setIsBulkOpen(true)} className="action-button-secondary">
              {/* <Grid className="h-4 w-4 mr-2" /> */}
              Bulk Upload
            </Button>
            <Button onClick={handleOpenCreate} className="action-button">
              {/* <Upload className="h-4 w-4 mr-2" /> */}
              Upload
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      {/* <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6"> */}
      <Tabs value={activeTab} className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="grid grid-cols-3 gap-4">
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
              <InstitutionFilter value={filter.institution_id} onChange={(id) => { setFilter({ ...filter, unit_id: 0, institution_id: id }); setPage(1); }} />
              <Combobox
                options={[
                  { value: "all", label: "All Units" },
                  ...units.map((u: any) => ({ value: String(u.id), label: u.name }))
                ]}
                value={filter.unit_id > 0 ? String(filter.unit_id) : "all"}
                onChange={(value) => setFilter({ ...filter, unit_id: value === "all" ? 0 : Number(value) })}
                placeholder="Filter by unit"
                searchPlaceholder="Search units..."
                className=""
              />
            </div>
          </div>
          <TabsList>
             <TabsTrigger value="0" onClick={() => {setFilter({ ...filter, resource_type_id: 0 }); setActiveTab("0")}} className='flex-1'>
                all
              </TabsTrigger>
            {resourceTypes.map((type) => (
              <TabsTrigger key={type.id} value={String(type.id)} onClick={() => {setFilter({ ...filter, resource_type_id: type.id }); setActiveTab(String(type.id))}} className='flex-1'>
                {type.name}
              </TabsTrigger>
            ))}
            {/* <TabsTrigger value="0">All</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="cats">CATs</TabsTrigger>
            <TabsTrigger value="exams">Exams</TabsTrigger>
            <TabsTrigger value="tutorials">Tutorials</TabsTrigger> */}
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="mt-6">
          <DataTable
            columns={columns}
            data={resources}
            keyExtractor={(resource) => resource.id}
            emptyMessage="No resources found. Upload your first resource to get started."
            emptyIcon={<FileText className="h-12 w-12 text-muted-foreground/50" />}
            meta={meta}
            onPageChange={setPage}
          />
        </TabsContent>
      </Tabs>

      {/* Form Modal */}
      <FormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        title={editingResource ? 'Edit Resource' : 'Upload Resource'}
        // description={editingResource ? 'Update resource information' : 'Add a new learning resource'}
      >
          <form onSubmit={handleSubmit} className="space-y-4 overflow-scroll">
            <div className="space-y-2">
              <a href={formData.public_access_url} target="_blank" rel="noopener noreferrer" className='text-sm text-primary'>Public View Link</a>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., Introduction to Data Structures"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description <span className="font-normal text-muted-foreground">(optional, shown to students)</span></Label>
              <Textarea
                id="description"
                rows={3}
                placeholder="What this resource covers"
                value={formData.description ?? ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Cover photo <span className="font-normal text-muted-foreground">(optional, e.g. a book cover)</span></Label>
              <input
                type="file"
                accept="image/*"
                ref={coverInputRef}
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleCover(e.target.files[0]); e.target.value = ''; }}
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="flex h-24 w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed text-muted-foreground transition-colors hover:border-primary/50"
                  aria-label="Choose cover photo"
                >
                  {formData.cover_url ? <img src={formData.cover_url} alt="" className="size-full object-cover" /> : coverUploading ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
                </button>
                <div className="flex flex-col items-start gap-1 text-sm">
                  <button type="button" className="text-primary" onClick={() => coverInputRef.current?.click()}>{formData.cover_url ? 'Replace photo' : 'Upload photo'}</button>
                  {formData.cover_url && <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => setFormData({ ...formData, cover_url: '' })}>Remove</button>}
                  <span className="text-xs text-muted-foreground">JPG or PNG</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resource_type_id">Resource Type</Label>
              <Select
                value={String(formData.resource_type_id)}
                onValueChange={(value) => setFormData({ ...formData, resource_type_id: Number(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select resource_type_id" />
                </SelectTrigger>
                <SelectContent>
                  {resourceTypes.map((resourceType) => (
                    <SelectItem key={resourceType.id} value={String(resourceType.id)}>
                      {resourceType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <InstitutionSelect value={formInstitution} onChange={(id) => { setFormInstitution(id); setFormData((f) => ({ ...f, school_id: 0, department_id: 0, unit_id: 0, topic_id: 0 })); }} />

            <div className="space-y-2">
              <Label htmlFor="school">School</Label>
              {/* <Combobox
                options={schools.map((school) => ({
                  value: String(school.id),
                  label: `${school.code} - ${school.name}`
                }))}
                value={String(formData.school_id)}
                onChange={(value) => setFormData({ ...formData, school_id: Number(value) })}
                placeholder="Select a school"
                searchPlaceholder="Search schools..."
              /> */}
              <Select
                value={String(formData.school_id)}
                onValueChange={(value) => setFormData({ ...formData, school_id: Number(value) })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a school" />
                </SelectTrigger>
                <SelectContent>
                  {schools.filter((s) => !formInstitution || s.institution_id === formInstitution).map((school) => (
                    <SelectItem key={school.id} value={String(school.id)}>
                      {school.code} - {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={String(formData.department_id)}
                onValueChange={(value) => setFormData({ ...formData, department_id: Number(value) })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.filter(dep => dep.schools.id == formData.school_id).map((department) => (
                    <SelectItem key={department.id} value={String(department.id)}>
                      {department.code} - {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 flex flex-col w-full">
              <Label>Unit</Label>
              <Combobox
                options={units.filter(uni => Number(uni.departments.id) == formData.department_id).map((unit) => ({
                  value: String(unit.id),
                  label: `${unit.code} - ${unit.name}`
                }))}
                value={String(formData.unit_id)}
                onChange={(value) => setFormData({ ...formData, unit_id: Number(value), topic_id: 0 })}
                placeholder="Select a unit"
                searchPlaceholder="Search units..."
                className=''
              />
            </div>

            <div className="space-y-2">
              <Label>Topic (syllabus)</Label>
              <Select
                value={String(formData.topic_id)}
                onValueChange={(value) => setFormData({ ...formData, topic_id: Number(value) })}
                disabled={!formData.unit_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.unit_id ? 'No topic' : 'Select a unit first'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No topic</SelectItem>
                  {topics.map((t: any) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.position}. {t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resourceUpload">Resource Upload</Label>
              <Tabs value={uploadType} onValueChange={setUploadType} className="mb-6">
                <TabsList className='flex'>
                  <TabsTrigger value="link" className='flex-1'>Link</TabsTrigger>
                  <TabsTrigger value="file" className='flex-1'>Upload file</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {uploadType === 'link' && <div className="space-y-2">
              {/* <Label htmlFor="uploadLink">Link</Label> */}
              <Input
                id="uploadLink"
                placeholder="https://example.com/resource.pdf"
                value={formData.public_access_url}
                onChange={(e) => setFormData({ ...formData, public_access_url: e.target.value })}
                required
              />
            </div>}

            {uploadType === 'file' && <div className="space-y-2">
              {/* <Label htmlFor="file">File</Label> */}
              <input
                type="file"
                accept="application/pdf"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFile(e.target.files[0])
                  }
                }}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className="border-2 border-dashed rounded-3xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
              >
                {file ? (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {String(file.name).replaceAll(/[_-]/g, " ")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF . {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF 50MB
                    </p>
                  </>
                )}
              </div>
            </div>}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="action-button">
                {editingResource ? 'Update' : 'Upload'}
              </Button>
            </div>
          </form>
      </FormModal>

      <BulkUploadModal
        open={isBulkOpen}
        onOpenChange={setIsBulkOpen}
        schools={schools}
        departments={departments}
        units={units}
        resourceTypes={resourceTypes}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['resources'] });
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Delete Resource"
        description={`Are you sure you want to delete "${deletingResource?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
};

export default Resources;
