import { useState, useRef, useEffect } from 'react';
import { Upload, X, Loader2, Plus, Copy, Trash2, Check, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
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
    const [resources, setResources] = useState<BulkResourceEntry[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const { toast } = useToast();

    // Initialize with one empty row when opened
    useEffect(() => {
        if (open && resources.length === 0) {
            addResource();
        }
    }, [open]);

    const addResource = () => {
        const lastResource = resources[resources.length - 1];

        const newResource: BulkResourceEntry = {
            id: Math.random().toString(36).substr(2, 9),
            name: '',
            description: '',
            // Smart Default: Copy context from previous row if available
            school_id: lastResource ? lastResource.school_id : 0,
            department_id: lastResource ? lastResource.department_id : 0,
            unit_id: lastResource ? lastResource.unit_id : 0,
            resource_type_id: lastResource ? lastResource.resource_type_id : 0,
            file: null,
            status: 'pending'
        };

        setResources([...resources, newResource]);
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
            !r.name || (!r.file && !r.public_access_url) || !r.school_id || !r.department_id || !r.unit_id || !r.resource_type_id
        );

        if (invalid) {
            toast({ title: "Please fill in all required fields", description: "Name, Unit, Type, and File/Link are required for all entries.", variant: "destructive" });
            return;
        }

        setIsUploading(true);
        let successCount = 0;

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
                        throw new Error(res.error || "File upload failed");
                    }
                    finalUrl = res.public_access_url;
                }

                const { status, error } = await addRecord('resources', {
                    name: r.name,
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
                    setResources(prev => prev.map(item => item.id === r.id ? { ...item, status: 'error', error: String(error) } : item));
                }
            } catch (e: any) {
                setResources(prev => prev.map(item => item.id === r.id ? { ...item, status: 'error', error: e.message || String(e) } : item));
            }

            // Update progress roughly
            const done = resources.filter(res => res.status === 'success' || res.status === 'error').length + 1; // +1 current
            setProgress(Math.round((done / resources.length) * 100));
        }

        setIsUploading(false);
        if (successCount > 0) {
            onSuccess();
            toast({ title: `Successfully uploaded ${successCount} resources` });
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
            <DialogContent className="w-[90%] rounded md:max-w-5xl h-[85vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle>Bulk Upload Resources</DialogTitle>
                    {/* <DialogDescription>
                        Add multiple resources manually. Context (School, Dept, Unit) is copied to new rows automatically to save time.
                    </DialogDescription> */}
                </DialogHeader>

                <div className="flex-1 overflow-hidden bg-muted/10">
                    <ScrollArea className="h-full p-3 md:p-6">
                        <div className="space-y-4">
                            {resources.map((resource, index) => (
                                <div
                                    key={resource.id}
                                    className={cn(
                                        "bg-card rounded-lg border p-4 shadow-sm transition-all",
                                        resource.status === 'uploading' && "opacity-70 pointer-events-none border-primary/50",
                                        resource.status === 'success' && "border-green-500/50 bg-green-500/5",
                                        resource.status === 'error' && "border-destructive/50 bg-destructive/5"
                                    )}
                                >
                                    <div className="flex flex-col justify-start items-center gap-3 md:gap-4 md:flex-row md:items-start">
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4">

                                            {/* File Upload - Prominent */}
                                            <div className="md:col-span-3">
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
                                                            "flex flex-col items-center justify-center border-2 border-dashed rounded-md h-24 cursor-pointer hover:bg-muted/50 transition-colors",
                                                            resource.file ? "border-primary/50 bg-primary/5" : "border-muted"
                                                        )}
                                                    >
                                                        {resource.file ? (
                                                            <div className="text-center p-2">
                                                                <FileText className="h-6 w-6 mx-auto text-primary mb-1" />
                                                                <p className="text-[10px] truncate max-w-[120px]">{resource.file.name}</p>
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
                                            <div className="md:col-span-9 grid grid-cols-2 lg:grid-cols-4 gap-3">
                                                <div className="col-span-2 lg:col-span-2">
                                                    <Label className="text-xs">Name *</Label>
                                                    <Input
                                                        value={resource.name}
                                                        onChange={(e) => updateResource(resource.id, 'name', e.target.value)}
                                                        placeholder="e.g. Intro to Stats"
                                                        className="h-8"
                                                    />
                                                </div>

                                                <div className="col-span-2 lg:col-span-2">
                                                    <Label className="text-xs text-muted-foreground">School</Label>
                                                    <Select
                                                        value={resource.school_id ? String(resource.school_id) : ''}
                                                        onValueChange={(val) => updateResource(resource.id, 'school_id', Number(val))}
                                                    >
                                                        <SelectTrigger className="h-8 text-muted-foreground">
                                                            <SelectValue placeholder="Select School" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {schools.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* Context Row - Collapsed mostly but visible if needed */}
                                                <div className="col-span-2 lg:col-span-2">
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
                                                                ? departments.filter(d => d.schools.id === resource.school_id).map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)
                                                                : <SelectItem value="0" disabled>Select School First</SelectItem>
                                                            }
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="col-span-1 lg:col-span-1">
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

                                                <div className="col-span-1 lg:col-span-1">
                                                    <Label className="text-xs">Type *</Label>
                                                    <Select
                                                        value={resource.resource_type_id ? String(resource.resource_type_id) : ''}
                                                        onValueChange={(val) => updateResource(resource.id, 'resource_type_id', Number(val))}
                                                    >
                                                        <SelectTrigger className="h-8">
                                                            <SelectValue placeholder="Type" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {resourceTypes.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        {/* <div className="flex flex-col gap-2 pt-6 w-full"> */}
                                        <div className="flex flex-col gap-2 pt-3 w-full">
                                            {resource.status === 'uploading' ? (
                                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                            ) : resource.status === 'success' ? (
                                                <Check className="h-5 w-5 text-green-500" />
                                            ) : resource.status === 'error' ? (
                                                <div className="group relative w-full">
                                                    <AlertTriangle className="h-5 w-5 text-destructive cursor-help" />
                                                    <div className="absolute right-0 top-6 w-48 bg-destructive text-destructive-foreground text-xs p-2 rounded shadow-lg z-10 hidden group-hover:block">
                                                        {resource.error}
                                                    </div>
                                                </div>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => removeResource(resource.id)}
                                                    className="text-muted-foreground hover:text-destructive h-8 w-full md:w-8"
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
                                <Plus className="h-4 w-4 mr-2" /> Add Another Resource
                            </Button>
                        </div>
                    </ScrollArea>
                </div>

                <div className="p-4 border-t bg-background">
                    {isUploading && (
                        <div className="mb-4 space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Uploading...</span>
                                <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-1" />
                        </div>
                    )}

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
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-4 w-4 mr-2" />
                                        Upload All
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
