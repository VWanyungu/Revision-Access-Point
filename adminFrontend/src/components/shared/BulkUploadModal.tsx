import { useState, useRef, useEffect } from 'react';
import { Upload, X, Loader2, Plus, Copy, Trash2, Check, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './InlinePanel';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InstitutionSelect } from './InstitutionSelect';
import { TYPE_OPTIONS, academicYears, defaultPaperName, isPaperType, optionFor } from '@/lib/paperKinds';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BulkSummary } from './BulkSummary';
import { addRecord, uploadFile } from '@/data/db';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface BulkUploadModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    schools: any[];
    departments: any[];
    units: any[];
    resourceTypes: any[];
    onSuccess: () => void;
}

interface BulkResourceEntry {
    id: string; // Unique ID for React keys
    name: string;
    description: string;
    school_id: number;
    department_id: number;
    unit_id: number;
    resource_type_id: number;
    paper_kind: string;
    academic_year: string;
    file: File | null;
    public_access_url?: string;
    status: 'pending' | 'uploading' | 'success' | 'error';
    error?: string;
}

export const BulkUploadModal = ({
    open,
    onOpenChange,
    schools,
    departments,
    units,
    resourceTypes,
    onSuccess
}: BulkUploadModalProps) => {
    // One institution for the batch: the school / department / unit lists narrow to it.
    const [institution, setInstitution] = useState(0);
    const [resources, setResources] = useState<BulkResourceEntry[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const { toast } = useToast();
    const multiRef = useRef<HTMLInputElement>(null);

    // Initialize with one empty row when opened
    useEffect(() => {
        if (open && resources.length === 0) {
            addResource();
        }
    }, [open]);

    const blank = (last?: BulkResourceEntry): BulkResourceEntry => ({
        id: Math.random().toString(36).slice(2, 11),
        name: '',
        description: '',
        // Smart default: copy context from the previous row if available
        school_id: last ? last.school_id : 0,
        department_id: last ? last.department_id : 0,
        unit_id: last ? last.unit_id : 0,
        resource_type_id: last ? last.resource_type_id : 0,
        paper_kind: last ? last.paper_kind : '',
        academic_year: last ? last.academic_year : '',
        file: null,
        status: 'pending'
    });

    const addResource = () => setResources([...resources, blank(resources[resources.length - 1])]);

    // One row per PDF, named from the file name; context is copied from the last row.
    const addFiles = (files: File[]) => {
        const pdfs = files.filter(f => f.type === 'application/pdf' && f.size <= 50 * 1024 * 1024);
        if (pdfs.length < files.length) toast({ title: 'Some files were skipped', description: 'Only PDFs of 50MB or less can be uploaded.', variant: 'destructive' });
        if (!pdfs.length) return;
        // An untouched blank row is replaced rather than left empty.
        const kept = resources.filter(r => r.file || r.name || r.status !== 'pending');
        let last = kept[kept.length - 1] ?? resources[resources.length - 1];
        const rows = pdfs.map(f => {
            const row = { ...blank(last), file: f, name: f.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim() };
            last = row;
            return row;
        });
        setResources([...kept, ...rows]);
    };

    const removeResource = (id: string) => {
        if (resources.length <= 1) {
            // Don't remove the last one, just clear it? Or just allow it and show empty state?
            // Let's allow removing all but 1 for better UX, or just recreate one if empty.
            // Actually, if they remove the last one, let's keep it empty or re-init.
            // But for now, let's just delete. If list empty, show "Add Resource" button prominently.
        }
        setResources(resources.filter(r => r.id !== id));
    };

    const updateResource = (id: string, field: keyof BulkResourceEntry, value: any) => {
        setResources(resources.map(r => {
            if (r.id !== id) return r;

            // If updating school, clear department and unit (cascade reset)
            if (field === 'school_id' && value !== r.school_id) {
                return { ...r, [field]: value, department_id: 0, unit_id: 0 };
            }
            // If updating department, clear unit
            if (field === 'department_id' && value !== r.department_id) {
                return { ...r, [field]: value, unit_id: 0 };
            }

            return { ...r, [field]: value };
        }));
    };

    const handleProcessUpload = async () => {
        const pendingResources = resources.filter(r => r.status === 'pending' || r.status === 'error');
        if (pendingResources.length === 0) return;

        // Validation
        const invalid = pendingResources.find(r =>
            (!r.name && !isPaperType(r.resource_type_id)) || (!r.file && !r.public_access_url) || !r.school_id || !r.department_id || !r.unit_id || !r.resource_type_id
            || (isPaperType(r.resource_type_id) && (!r.paper_kind || !r.academic_year))
        );

        if (invalid) {
            toast({ title: 'Some rows are incomplete', description: 'Each row needs a file, school, department, unit and type. Papers also need an academic year, and other types a name.', variant: 'destructive' });
            return;
        }

        setIsUploading(true);
        let successCount = 0;
        let done = 0; // a counter, not state: state read inside this loop is stale
        const total = resources.filter(x => x.status !== 'success').length;
        setProgress(0);

        // Get user email
        let currentUserEmail = '';
        try {
            const token = localStorage.getItem('sb-ptktlornnngqvzbbisaq-auth-token');
            if (token) {
                currentUserEmail = JSON.parse(token).user.email;
            }
        } catch (e) {
            console.error("Could not get user email", e);
        }

        // Clone resources to avoid mutation issues during weird react states
        const currentResources = [...resources];

        for (let i = 0; i < currentResources.length; i++) {
            let r = currentResources[i];
            if (r.status === 'success') continue; // Skip already done

            // Set status to uploading
            setResources(prev => prev.map(item => item.id === r.id ? { ...item, status: 'uploading' } : item));

            try {
                let finalUrl = r.public_access_url || '';

                // Upload file if present
                if (r.file) {
                    const res = await uploadFile(r.file);
                    if (res.status === 'error' || !res.public_access_url) {
                        throw new Error((res.error as any)?.message || 'The file could not be uploaded.');
                    }
                    finalUrl = res.public_access_url;
                }

                const { status, error } = await addRecord('resources', {
                    name: r.name.trim() || (isPaperType(r.resource_type_id) ? defaultPaperName(r.paper_kind, r.academic_year) : r.name),
                    ...(isPaperType(r.resource_type_id) ? { paper_kind: r.paper_kind, academic_year: r.academic_year } : {}),
                    description: r.description,
                    resource_type_id: r.resource_type_id,
                    unit_id: r.unit_id,
                    department_id: r.department_id,
                    school_id: r.school_id,
                    public_access_url: finalUrl,
                    uploaded_by: currentUserEmail
                });

                if (status === 'success') {
                    successCount++;
                    setResources(prev => prev.map(item => item.id === r.id ? { ...item, status: 'success' } : item));
                } else {
                    setResources(prev => prev.map(item => item.id === r.id ? { ...item, status: 'error', error: (error as any)?.message ?? 'Could not save this row.' } : item));
                }
            } catch (e: any) {
                setResources(prev => prev.map(item => item.id === r.id ? { ...item, status: 'error', error: e.message || String(e) } : item));
            }

            // Update progress roughly
            done++;
            setProgress(Math.round((done / total) * 100));
        }

        setIsUploading(false);
        if (successCount > 0) {
            onSuccess();
        }
    };

    const handleClose = () => {
        onOpenChange(false);
        // Reset after a delay or keep state? Let's keep state if they close accidentally, but maybe not if successful
        // For now, simple close. 
        // If all success, reset?
        if (resources.every(r => r.status === 'success')) {
            setResources([]);
            setProgress(0);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
            <DialogContent className="flex h-[85vh] flex-col p-0">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle>Bulk upload resources</DialogTitle>
                    {/* <DialogDescription>
                        Add multiple resources manually. Context (School, Dept, Unit) is copied to new rows automatically to save time.
                    </DialogDescription> */}
                </DialogHeader>

                <div className="space-y-3 px-6 py-4">
                    <input type="file" multiple accept="application/pdf" ref={multiRef} className="hidden" aria-label="Choose PDFs"
                        onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
                    <Button type="button" variant="outline" onClick={() => multiRef.current?.click()} disabled={isUploading}>
                        <Upload /> Choose several PDFs
                    </Button>
                    <InstitutionSelect value={institution} onChange={(id) => { setInstitution(id); setResources((prev) => prev.map((r) => ({ ...r, school_id: 0, department_id: 0, unit_id: 0 }))); }} />
                </div>

                <div className="flex-1 overflow-hidden bg-muted/10">
                    <ScrollArea className="h-full p-3 md:p-6">
                        <div className="space-y-4">
                            {resources.map((resource, index) => (
                                <div
                                    key={resource.id}
                                    className={cn(
                                        "bg-surface rounded-3xl ring-1 ring-line p-4 shadow-sm transition-all",
                                        resource.status === 'uploading' && "opacity-70 pointer-events-none border-primary/50",
                                        resource.status === 'success' && "border-green-500/50 bg-green-500/5",
                                        resource.status === 'error' && "border-destructive/50 bg-destructive/5"
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="min-w-0 flex-1 space-y-3">

                                            {/* File Upload - Prominent */}
                                            <div>
                                                <Label className="text-xs text-muted-foreground mb-1 block">File (PDF)</Label>
                                                <div className="relative">
                                                    <Input
                                                        type="file"
                                                        accept="application/pdf"
                                                        className="hidden"
                                                        id={`file-${resource.id}`}
                                                        onChange={(e) => updateResource(resource.id, 'file', e.target.files?.[0] || null)}
                                                    />
                                                    <label
                                                        htmlFor={`file-${resource.id}`}
                                                        className={cn(
                                                            "flex flex-col items-center justify-center border-2 border-dashed rounded-md h-20 cursor-pointer hover:bg-muted/50 transition-colors",
                                                            resource.file ? "border-primary/50 bg-primary/5" : "border-muted"
                                                        )}
                                                    >
                                                        {resource.file ? (
                                                            <div className="text-center p-2">
                                                                <FileText className="h-6 w-6 mx-auto text-primary mb-1" />
                                                                <p className="text-[10px] truncate max-w-[16rem]">{resource.file.name}</p>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <Upload className="h-6 w-6 text-muted-foreground/50 mb-1" />
                                                                <span className="text-xs text-muted-foreground">Select PDF</span>
                                                            </>
                                                        )}
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Details */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="col-span-2">
                                                    <Label className="text-xs">Name *</Label>
                                                    <Input
                                                        value={resource.name}
                                                        onChange={(e) => updateResource(resource.id, 'name', e.target.value)}
                                                        placeholder="e.g. Intro to Stats"
                                                        className="h-8"
                                                    />
                                                </div>

                                                <div className="col-span-2">
                                                    <Label className="text-xs text-muted-foreground">School</Label>
                                                    <Select
                                                        value={resource.school_id ? String(resource.school_id) : ''}
                                                        onValueChange={(val) => updateResource(resource.id, 'school_id', Number(val))}
                                                    >
                                                        <SelectTrigger className="h-8 text-muted-foreground">
                                                            <SelectValue placeholder="Select School" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {schools.filter(s => !institution || s.institution_id === institution).map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* Context Row - Collapsed mostly but visible if needed */}
                                                <div className="col-span-2">
                                                    <Label className="text-xs text-muted-foreground">Department</Label>
                                                    <Select
                                                        value={resource.department_id ? String(resource.department_id) : ''}
                                                        onValueChange={(val) => updateResource(resource.id, 'department_id', Number(val))}
                                                    >
                                                        <SelectTrigger className="h-8 text-muted-foreground">
                                                            <SelectValue placeholder={resource.school_id ? "Select Department" : "Select School First"} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {resource.school_id
                                                                ? departments.filter(d => d.schools.id === resource.school_id && (!institution || d.institution_id === institution)).map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)
                                                                : <SelectItem value="0" disabled>Select School First</SelectItem>
                                                            }
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="col-span-1">
                                                    <Label className="text-xs">Unit *</Label>
                                                    <Select
                                                        value={resource.unit_id ? String(resource.unit_id) : ''}
                                                        onValueChange={(val) => updateResource(resource.id, 'unit_id', Number(val))}
                                                    >
                                                        <SelectTrigger className="h-8">
                                                            <SelectValue placeholder={resource.department_id ? "Select Unit" : "Select Dept First"} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {resource.department_id
                                                                ? units.filter(u => u.departments.id === resource.department_id).map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)
                                                                : <SelectItem value="0" disabled>Select Dept First</SelectItem>
                                                            }
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="col-span-1">
                                                    <Label className="text-xs">Type *</Label>
                                                    <Select
                                                        value={optionFor(resource.resource_type_id, resource.paper_kind)?.value ?? ''}
                                                        onValueChange={(val) => {
                                                            const o = TYPE_OPTIONS.find((t) => t.value === val)!;
                                                            setResources((prev) => prev.map((r) => r.id === resource.id ? { ...r, resource_type_id: o.typeId, paper_kind: o.kind ?? '', academic_year: o.kind ? r.academic_year : '' } : r));
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-8">
                                                            <SelectValue placeholder="Type" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {isPaperType(resource.resource_type_id) && (
                                                    <div className="col-span-1">
                                                        <Label className="text-xs">Year *</Label>
                                                        <Select value={resource.academic_year} onValueChange={(val) => updateResource(resource.id, 'academic_year', val)}>
                                                            <SelectTrigger className="h-8"><SelectValue placeholder="Year" /></SelectTrigger>
                                                            <SelectContent>
                                                                {academicYears().map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                )}
                                            </div>
                                            {resource.status === 'error' && resource.error && <p role="alert" className="text-sm text-danger">{resource.error}</p>}
                                        </div>

                                        {/* Actions */}
                                        {/* <div className="flex flex-col gap-2 pt-6 w-full"> */}
                                        <div className="flex w-8 shrink-0 flex-col gap-2 pt-6">
                                            {resource.status === 'uploading' ? (
                                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                            ) : resource.status === 'success' ? (
                                                <Check className="h-5 w-5 text-green-500" />
                                            ) : resource.status === 'error' ? (
                                                <AlertTriangle className="h-5 w-5 text-danger" aria-label="Failed" />
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => removeResource(resource.id)}
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <Button
                                variant="outline"
                                className="w-full border-dashed py-6 text-muted-foreground hover:text-primary hover:border-primary/50"
                                onClick={addResource}
                                disabled={isUploading}
                            >
                                <Plus className="h-4 w-4 mr-2" /> Add another resource
                            </Button>
                        </div>
                    </ScrollArea>
                </div>

                <div className="p-4 border-t bg-background">
                    <BulkSummary running={isUploading} verb="Uploading" doneVerb="uploaded" progress={progress}
                        succeeded={resources.filter(x => x.status === 'success').length} failed={resources.filter(x => x.status === 'error').length} onRetry={handleProcessUpload} />

                    <div className="flex justify-between items-center">
                        {/* <div className="text-sm text-muted-foreground">
                            {resources.length} resource{resources.length !== 1 && 's'} pending
                        </div> */}
                        <div className="flex gap-2 justify-between w-full">
                            <Button variant="outline" onClick={handleClose} disabled={isUploading}>
                                {resources.some(r => r.status === 'success') ? 'Close' : 'Cancel'}
                            </Button>
                            <Button
                                className="action-button"
                                onClick={handleProcessUpload}
                                disabled={isUploading || resources.length === 0}
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Uploading…
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-4 w-4 mr-2" />
                                        Upload all
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
