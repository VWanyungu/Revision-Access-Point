import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, AlertTriangle, Loader2, Grid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './InlinePanel';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { addRecord } from '@/data/db';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Combobox } from './Combobox';
import { InstitutionSelect } from './InstitutionSelect';

export type EntityType = 'school' | 'department' | 'unit';

interface BulkCreateEntityModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    type: EntityType;
    schools?: any[];
    departments?: any[];
    /** Institution new schools are created under (children inherit theirs from their parent). */
    institutionId?: number;
    onSuccess: () => void;
}

interface EntityEntry {
    id: string;
    name: string;
    code: string;
    // Context fields
    school_id?: number;
    department_id?: number;
    year_of_study?: number;
    semester_of_study?: number;

    status: 'pending' | 'creating' | 'success' | 'error';
    error?: string;
}

export const BulkCreateEntityModal = ({
    open,
    onOpenChange,
    type,
    schools = [],
    departments = [],
    institutionId,
    onSuccess
}: BulkCreateEntityModalProps) => {
    const [entries, setEntries] = useState<EntityEntry[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [progress, setProgress] = useState(0);
    // One institution for the whole batch: schools are created under it, and the school / department lists narrow to it.
    const [institution, setInstitution] = useState(institutionId ?? 0);
    const schoolOptions = schools.filter((s) => !institution || s.institution_id === institution);
    const departmentOptions = departments.filter((d) => !institution || d.institution_id === institution);
    const pickInstitution = (id: number) => {
        setInstitution(id);
        setEntries((prev) => prev.map((e) => ({ ...e, school_id: undefined, department_id: undefined })));
    };
    const { toast } = useToast();

    const getTitle = () => {
        switch (type) {
            case 'school': return 'Bulk Create Schools';
            case 'department': return 'Bulk Create Departments';
            case 'unit': return 'Bulk Create Units';
        }
    };

    const getDescription = () => {
        switch (type) {
            case 'school': return 'Add multiple schools at once.';
            case 'department': return 'Add multiple departments. School selection is copied automatically.';
            case 'unit': return 'Add multiple units. Department and year/semester are copied automatically.';
        }
    };

    // Initialize with one empty row
    useEffect(() => {
        if (open && entries.length === 0) {
            addEntry();
        }
    }, [open]);

    const addEntry = () => {
        const lastEntry = entries[entries.length - 1];

        const newEntry: EntityEntry = {
            id: Math.random().toString(36).substr(2, 9),
            name: '',
            code: '',
            // Smart Defaults
            school_id: lastEntry?.school_id,
            department_id: lastEntry?.department_id,
            year_of_study: lastEntry?.year_of_study || 1,
            semester_of_study: lastEntry?.semester_of_study || 1,
            status: 'pending'
        };

        setEntries([...entries, newEntry]);
    };

    const removeEntry = (id: string) => {
        setEntries(entries.filter(e => e.id !== id));
    };

    const updateEntry = (id: string, field: keyof EntityEntry, value: any) => {
        setEntries(entries.map(e => {
            if (e.id !== id) return e;
            return { ...e, [field]: value };
        }));
    };

    const handleProcessCreate = async () => {
        const pendingEntries = entries.filter(e => e.status === 'pending' || e.status === 'error');
        if (pendingEntries.length === 0) return;

        if (!institution) {
            toast({ title: 'Choose an institution first', variant: 'destructive' });
            return;
        }

        // Validation
        const invalid = pendingEntries.find(e => {
            if (!e.name || !e.code) return true;
            if (type === 'department' && !e.school_id) return true;
            if (type === 'unit' && (!e.department_id || !e.year_of_study || !e.semester_of_study)) return true;
            return false;
        });

        if (invalid) {
            toast({ title: "Please fill in all required fields", variant: "destructive" });
            return;
        }

        setIsCreating(true);
        let successCount = 0;

        // Clone to avoid mutation issues
        let currentEntries = [...entries];

        for (let i = 0; i < currentEntries.length; i++) {
            let e = currentEntries[i];
            if (e.status === 'success') continue;

            // Set status to creating
            setEntries(prev => prev.map(item => item.id === e.id ? { ...item, status: 'creating' } : item));

            try {
                let payload: any = { name: e.name, code: e.code };
                let schema = '';

                if (type === 'school') {
                    schema = 'schools';
                } else if (type === 'department') {
                    schema = 'departments';
                    payload.school_id = e.school_id;
                } else if (type === 'unit') {
                    schema = 'units';
                    payload.department_id = e.department_id;
                    payload.year_of_study = e.year_of_study;
                    payload.semester_of_study = e.semester_of_study;
                }

                if (schema === 'schools') payload.institution_id = institution;
                const { status, error } = await addRecord(schema, payload);

                if (status === 'success') {
                    successCount++;
                    setEntries(prev => prev.map(item => item.id === e.id ? { ...item, status: 'success' } : item));
                } else {
                    setEntries(prev => prev.map(item => item.id === e.id ? { ...item, status: 'error', error: String(error) } : item));
                }
            } catch (err: any) {
                setEntries(prev => prev.map(item => item.id === e.id ? { ...item, status: 'error', error: err.message || String(err) } : item));
            }

            // Update progress
            const done = entries.filter(item => item.status === 'success' || item.status === 'error').length + 1;
            setProgress(Math.round((done / entries.length) * 100));
        }

        setIsCreating(false);
        if (successCount > 0) {
            onSuccess();
            toast({ title: `Successfully created ${successCount} ${type}s` });
        }
    };

    const handleClose = () => {
        onOpenChange(false);
        if (entries.every(e => e.status === 'success')) {
            setEntries([]);
            setProgress(0);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
            <DialogContent className="flex h-[80vh] flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle>{getTitle()}</DialogTitle>
                    <DialogDescription>{getDescription()}</DialogDescription>
                </DialogHeader>

                <div className="px-6 pb-4">
                    <InstitutionSelect value={institution} onChange={pickInstitution} />
                </div>

                <div className="flex-1 overflow-hidden bg-muted/10">
                    <ScrollArea className="h-full p-3 md:p-6">
                        <div className="space-y-4">
                            {entries.map((entry) => (
                                <div
                                    key={entry.id}
                                    className={cn(
                                        "bg-surface rounded-3xl ring-1 ring-line p-4 shadow-sm transition-all relative flex items-start gap-3",
                                        entry.status === 'creating' && "opacity-70 pointer-events-none border-primary/50",
                                        entry.status === 'success' && "border-green-500/50 bg-green-500/5",
                                        entry.status === 'error' && "border-destructive/50 bg-destructive/5"
                                    )}
                                >
                                    <div className="grid min-w-0 flex-1 grid-cols-2 gap-3">

                                        {/* Common Fields */}
                                        <div className="col-span-2">
                                            <Label className="text-xs">Name *</Label>
                                            <Input
                                                value={entry.name}
                                                onChange={(e) => updateEntry(entry.id, 'name', e.target.value)}
                                                placeholder={`e.g. ${type === 'school' ? 'School of X' : type === 'department' ? 'Dept of Y' : 'Unit Z'}`}
                                                className="h-9"
                                            />
                                        </div>

                                        <div className="col-span-2">
                                            <Label className="text-xs">Code *</Label>
                                            <Input
                                                value={entry.code}
                                                onChange={(e) => updateEntry(entry.id, 'code', e.target.value.toUpperCase())}
                                                placeholder="CODE"
                                                className="h-9 uppercase"
                                            />
                                        </div>

                                        {/* Department Specific */}
                                        {type === 'department' && (
                                            <div className="col-span-2">
                                                <Label className="text-xs">School *</Label>
                                                <Select
                                                    value={entry.school_id ? String(entry.school_id) : ''}
                                                    onValueChange={(val) => updateEntry(entry.id, 'school_id', Number(val))}
                                                >
                                                    <SelectTrigger className="h-9">
                                                        <SelectValue placeholder="Select School" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {schoolOptions.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        {/* Unit Specific */}
                                        {type === 'unit' && (
                                            <>
                                                <div className="col-span-2">
                                                    <Label className="text-xs">Department *</Label>
                                                    {/* <Select
                                                        value={entry.department_id ? String(entry.department_id) : ''}
                                                        onValueChange={(val) => updateEntry(entry.id, 'department_id', Number(val))}
                                                    >
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue placeholder="Select Dept" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {departments.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select> */}
                                                    <Combobox
                                                        options={departmentOptions.map((dept: any) => ({ value: String(dept.id), label: dept.name }))}
                                                        value={entry.department_id ? String(entry.department_id) : ''}
                                                        onChange={(val) => updateEntry(entry.id, 'department_id', Number(val))}
                                                        placeholder="Select Department"
                                                        searchPlaceholder="Search departments..."
                                                    />
                                                </div>
                                                <div className="col-span-1">
                                                    <Label className="text-xs">Year *</Label>
                                                    <Select
                                                        value={String(entry.year_of_study)}
                                                        onValueChange={(val) => updateEntry(entry.id, 'year_of_study', Number(val))}
                                                    >
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue placeholder="Y" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {[1, 2, 3, 4].map(y => <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="col-span-1">
                                                    <Label className="text-xs">Sem *</Label>
                                                    <Select
                                                        value={String(entry.semester_of_study)}
                                                        onValueChange={(val) => updateEntry(entry.id, 'semester_of_study', Number(val))}
                                                    >
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue placeholder="S" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {[1, 2, 3].map(s => <SelectItem key={s} value={String(s)}>Sem {s}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </>
                                        )}

                                    </div>

                                    {/* Actions / Status Icon */}
                                    {/* <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col justify-center w-full"> */}
                                    <div className="flex w-8 shrink-0 flex-col items-center pt-6">
                                        {entry.status === 'creating' ? (
                                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                        ) : entry.status === 'success' ? (
                                            <Check className="h-5 w-5 text-green-500" />
                                        ) : entry.status === 'error' ? (
                                            <div className="group relative w-full">
                                                <AlertTriangle className="h-5 w-5 text-destructive cursor-help" />
                                                <div className="absolute right-0 top-6 w-48 bg-destructive text-destructive-foreground text-xs p-2 rounded shadow-lg z-10 hidden group-hover:block">
                                                    {entry.error}
                                                </div>
                                            </div>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => removeEntry(entry.id)}
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            <Button
                                variant="outline"
                                className="w-full border-dashed py-6 text-muted-foreground hover:text-primary hover:border-primary/50"
                                onClick={addEntry}
                                disabled={isCreating}
                            >
                                <Plus className="h-4 w-4 mr-2" /> Add Another {type === 'school' ? 'School' : type === 'department' ? 'Department' : 'Unit'}
                            </Button>
                        </div>
                    </ScrollArea>
                </div>

                <div className="p-4 border-t bg-background">
                    {isCreating && (
                        <div className="mb-4 space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Creating...</span>
                                <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-1" />
                        </div>
                    )}

                    <div className="flex justify-between items-center w-full">
                        {/* <div className="text-sm text-muted-foreground">
                            {entries.length} pending
                        </div> */}
                        <div className="flex gap-2 justify-between items-center w-full">
                            <Button variant="outline" onClick={handleClose} disabled={isCreating}>
                                {entries.some(e => e.status === 'success') ? 'Close' : 'Cancel'}
                            </Button>
                            <Button
                                className="action-button"
                                onClick={handleProcessCreate}
                                disabled={isCreating || entries.length === 0}
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        {/* <Grid className="h-4 w-4 mr-2" /> */}
                                        Create
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
