import { useState, useRef } from 'react';
import { FileText, Upload, BookOpen, ClipboardList, GraduationCap, Lightbulb, Loader2 } from 'lucide-react';
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
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';
import { ListToolbar } from '@/components/shared/ListToolbar';
import { RowActions } from '@/components/shared/RowActions';
import { useListParams } from '@/hooks/useListParams';
import { InstitutionSelect } from '@/components/shared/InstitutionSelect';
import { TYPE_OPTIONS, academicYears, defaultPaperName, isPaperType, optionFor } from '@/lib/paperKinds';
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
  const list = useListParams();
  const queryClient = useQueryClient();

  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [deletingResource, setDeletingResource] = useState<Resource | null>(null);
  const [activeTab, setActiveTab] = useState<string>('0');
  const [saving, setSaving] = useState(false);
  const [formInstitution, setFormInstitution] = useState(0);
  const [formData, setFormData] = useState({ id: 0, resource_type_id: 0, unit_id: 0, department_id: 0, school_id: 0, name: '', description: '', public_access_url: '', topic_id: 0, uploaded_by: '', cover_url: '', paper_kind: '', academic_year: '' });
  const [uploadType, setUploadType] = useState<string>('link');
  const { toast } = useToast();
  const { data: me } = useProfile();
  const myEmail = me?.email ?? '';
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [filter, setFilter] = useState<{ unit_id: number, resource_type_id: number }>({ unit_id: 0, resource_type_id: 0 });

  const { data: resourcesData, isLoading } = useQuery({
    queryKey: ['resources', list.page, list.debounced, list.institutionId, filter, list.sort],
    queryFn: async () => {
      return await getRecords('resources', { page: list.page, pageSize: 10, search: list.debounced, institution_id: list.institutionId, ...filter, sort: list.sort ?? undefined })
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
    queryKey: ['departments', list.institutionId],
    queryFn: async () => {
      return await getRecords('departments', { pageSize: 100, institution_id: list.institutionId })
    },
  });

  const departments = departmentsData?.data || [];

  const { data: unitsData, isLoading: unitsLoading } = useQuery({
    queryKey: ['units', list.institutionId],
    queryFn: async () => {
      return await getRecords('units', { pageSize: 100, institution_id: list.institutionId })
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
  // Papers save their kind and academic year (and a default title when none was typed). Only touched when relevant, so
  // saving still works on a database that has not run paper_kinds.sql yet.
  const paper = isPaperType(formData.resource_type_id);
  const wasPaper = !!(editingResource as any)?.paper_kind;
  const paperFields = paper
    ? { paper_kind: formData.paper_kind || null, academic_year: formData.academic_year || null }
    : wasPaper ? { paper_kind: null, academic_year: null } : {};
  const savedName = paper && !formData.name.trim() && formData.paper_kind && formData.academic_year
    ? defaultPaperName(formData.paper_kind, formData.academic_year)
    : formData.name;
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
    setFormData({ id: 0, resource_type_id: 0, unit_id: 0, department_id: 0, school_id: 0, name: '', description: '', public_access_url: '', topic_id: 0, uploaded_by: myEmail, cover_url: '', paper_kind: '', academic_year: '' })
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
      paper_kind: (resource as any).paper_kind ?? '',
      academic_year: (resource as any).academic_year ?? '',
      uploaded_by: myEmail
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
      paper_kind: '',
      academic_year: '',
      uploaded_by: myEmail
    });
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paper && (!formData.paper_kind || !formData.academic_year)) {
      toast({ title: 'Choose the paper type and its academic year', variant: 'destructive' });
      return;
    }

    if (uploadType === 'file' && file) {
      const res = await uploadFile(file);

      if (res.error || res.public_access_url === null) {
        toast({ title: 'Could not upload the file', description: 'Your entries are kept. Check your connection and try again.', variant: 'destructive' });
        return
      }

      formData.public_access_url = res.public_access_url;
    }

    if (editingResource) {
      const { status, error, data } = await updateRecord('resources', formData.id, { name: savedName, description: formData.description, resource_type_id: formData.resource_type_id, unit_id: formData.unit_id, department_id: formData.department_id, school_id: formData.school_id, public_access_url: formData.public_access_url, topic_id: formData.topic_id || null, uploaded_by: formData.uploaded_by, ...coverField, ...paperFields });

      if (status === 'success') {
        toast({ title: 'Resource updated successfully' });
        queryClient.invalidateQueries({ queryKey: ['resources'] })
      } else {
        // Keep the form open so nothing typed is lost.
        toast({ title: 'Could not update the resource', description: (error as any)?.message ?? 'Your entries are kept. Try again.', variant: 'destructive' });
        return;
      }

    } else {
      const { status, error, data } = await addRecord('resources', { name: savedName, description: formData.description, resource_type_id: formData.resource_type_id, unit_id: formData.unit_id, department_id: formData.department_id, school_id: formData.school_id, public_access_url: formData.public_access_url, topic_id: formData.topic_id || null, uploaded_by: formData.uploaded_by, ...coverField, ...paperFields });

      if (status === 'success'){
        toast({ title: 'Resource uploaded successfully' });
        queryClient.invalidateQueries({ queryKey: ['resources'] })
      }
      else {
        toast({ title: 'Could not upload the resource', description: (error as any)?.message ?? 'Your entries are kept. Try again.', variant: 'destructive' });
        return;
      }
    }

    setIsFormOpen(false);
  };

  // One in-flight save at a time, so a slow upload cannot be sent twice.
  const submit = async (e: React.FormEvent) => {
    if (saving) { e.preventDefault(); return; }
    setSaving(true);
    try { await handleSubmit(e); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (deletingResource) {
      const { status, error, data } = await deleteRecord('resources', Number(deletingResource.id));
      if (status === 'success'){
        toast({ title: 'Resource deleted' });
        queryClient.invalidateQueries({ queryKey: ['resources'] })
      }
      else
        toast({ title: 'Error deleting resource', variant: 'destructive' });
    }
    setIsDeleteOpen(false);
    setDeletingResource(null);
  };

  const handleFile = (selectedFile: File) => {
    if (selectedFile.type !== "application/pdf") {
      toast({ title: 'Only PDF files are allowed', variant: 'destructive' })
      return
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      toast({ title: 'File must be 50MB or less', variant: 'destructive' })
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
  const resetAll = () => { list.reset(); setFilter((f) => ({ ...f, unit_id: 0 })); };

  const columns: Column<Resource>[] = [
    {
      key: 'name',
      header: 'Resource',
      sortKey: 'name',
      render: (resource) => {
        const config = resourceTypeConfig[resource.resource_types.name]
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-tile", config.color)}>
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
      header: 'Type',
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
      sortKey: 'created_at',
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
      render: (resource) => <RowActions name={resource.name} onEdit={() => handleOpenEdit(resource)} onDelete={() => handleOpenDelete(resource)} />,
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
              Bulk upload
            </Button>
            <Button onClick={handleOpenCreate} className="action-button">
              {/* <Upload className="h-4 w-4 mr-2" /> */}
              Upload
            </Button>
          </div>
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => { setActiveTab(v); setFilter((f) => ({ ...f, resource_type_id: Number(v) })); list.setPage(1); }}
        className="mb-6"
      >
        <TabsList className="mb-6">
          <TabsTrigger value="0" className="flex-1">All</TabsTrigger>
          {resourceTypes.map((type) => (
            <TabsTrigger key={type.id} value={String(type.id)} className="flex-1">
              {resourceTypeConfig[type.name as keyof typeof resourceTypeConfig]?.label ?? type.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <ListToolbar search={list.search} onSearch={list.setSearch} placeholder="Search resources" resultCount={meta?.total}
          institutionId={list.institutionId} onInstitution={(id) => { list.setInstitutionId(id); setFilter((f) => ({ ...f, unit_id: 0 })); }}
          active={!!list.debounced || !!list.institutionId || !!filter.unit_id || !!list.sort} onReset={resetAll}>
          <div className="w-full sm:w-56">
            <Combobox
              options={[
                { value: 'all', label: 'All units' },
                ...units.map((u: any) => ({ value: String(u.id), label: u.name })),
              ]}
              value={filter.unit_id > 0 ? String(filter.unit_id) : 'all'}
              onChange={(v) => { setFilter({ ...filter, unit_id: v === 'all' ? 0 : Number(v) }); list.setPage(1); }}
              placeholder="Filter by unit"
              searchPlaceholder="Search units..."
            />
          </div>
        </ListToolbar>

        <TabsContent value={activeTab} className="mt-6">
          <DataTable
            columns={columns}
            data={resources}
            isLoading={isLoading}
            keyExtractor={(resource) => resource.id}
            emptyMessage="No resources yet."
            emptyAction={{ label: 'Upload resource', onClick: handleOpenCreate }}
            emptyIcon={<FileText className="mb-4 size-10 text-ink-subtle" />}
            filtered={!!list.debounced || !!list.institutionId || !!filter.unit_id}
            onResetFilters={resetAll}
            noun="resources"
            sort={list.sort}
            onSortChange={list.setSort}
            meta={meta}
            onPageChange={list.setPage}
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
          <form onSubmit={submit} className="space-y-4">
            {formData.public_access_url && (
              <div className="space-y-2">
                <a href={formData.public_access_url} target="_blank" rel="noopener noreferrer" className='text-sm text-brand'>Public View Link</a>
              </div>
            )}

            <InstitutionSelect value={formInstitution} onChange={(id) => { setFormInstitution(id); setFormData((f) => ({ ...f, school_id: 0, department_id: 0, unit_id: 0, topic_id: 0 })); }} />

            <div className="space-y-2">
              <Label htmlFor="name">{paper ? <>Title <span className="font-normal text-muted-foreground">(optional)</span></> : 'Name'}</Label>
              <Input
                id="name"
                placeholder={paper ? 'Leave blank to use the type and year' : 'e.g., Introduction to Data Structures'}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required={!paper}
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
              <Label htmlFor="cover">Cover photo <span className="font-normal text-muted-foreground">(optional, e.g. a book cover)</span></Label>
              <input
                type="file"
                accept="image/*"
                ref={coverInputRef}
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleCover(e.target.files[0]); e.target.value = ''; }}
              />
              <div className="flex items-center gap-3">
                <button
                  id="cover"
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="flex h-24 w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed text-muted-foreground transition-colors hover:border-primary/50"
                  aria-label="Choose cover photo"
                >
                  {formData.cover_url ? <img src={formData.cover_url} alt="" className="size-full object-cover" /> : coverUploading ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
                </button>
                <div className="flex flex-col items-start gap-1 text-sm">
                  <button type="button" className="text-brand" onClick={() => coverInputRef.current?.click()}>{formData.cover_url ? 'Replace photo' : 'Upload photo'}</button>
                  {formData.cover_url && <button type="button" className="text-muted-foreground hover:text-danger" onClick={() => setFormData({ ...formData, cover_url: '' })}>Remove</button>}
                  <span className="text-xs text-muted-foreground">JPG or PNG</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resource_type_id">Type</Label>
              <Select
                value={optionFor(formData.resource_type_id, formData.paper_kind)?.value ?? ''}
                onValueChange={(value) => {
                  const o = TYPE_OPTIONS.find((t) => t.value === value)!;
                  setFormData({ ...formData, resource_type_id: o.typeId, paper_kind: o.kind ?? '', academic_year: o.kind ? formData.academic_year : '' });
                }}
              >
                <SelectTrigger id="resource_type_id">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {paper && (
              <div className="space-y-2">
                <Label htmlFor="academic_year">Academic year</Label>
                <Select value={formData.academic_year} onValueChange={(value) => setFormData({ ...formData, academic_year: value })}>
                  <SelectTrigger id="academic_year"><SelectValue placeholder="Select the academic year" /></SelectTrigger>
                  <SelectContent>
                    {academicYears().map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

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
                <SelectTrigger id="school">
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
                <SelectTrigger id="department">
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
              <Label htmlFor="unit">Unit</Label>
              <Combobox
                id="unit"
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
              <Label htmlFor="topic">Topic (syllabus)</Label>
              <Select
                value={String(formData.topic_id)}
                onValueChange={(value) => setFormData({ ...formData, topic_id: Number(value) })}
                disabled={!formData.unit_id}
              >
                <SelectTrigger id="topic">
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
              <Label id="upload-label">Resource Upload</Label>
              <Tabs value={uploadType} onValueChange={setUploadType} className="mb-6">
                <TabsList className='flex' aria-labelledby="upload-label">
                  <TabsTrigger value="link" className='flex-1'>Link</TabsTrigger>
                  <TabsTrigger value="file" className='flex-1'>Upload file</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {uploadType === 'link' && <div className="space-y-2">
              {/* <Label htmlFor="uploadLink">Link</Label> */}
              <Input
                id="uploadLink"
                aria-label="Link"
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
              <Button type="button" variant="outline" disabled={saving} onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="action-button" disabled={saving} aria-busy={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />}
                {saving ? (editingResource ? 'Saving…' : 'Uploading…') : editingResource ? 'Update' : 'Upload'}
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
