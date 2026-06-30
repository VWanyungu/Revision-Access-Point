import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Building2, BookOpen, GraduationCap, Calendar, CheckCircle2, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { on } from "events";
import { getResources, getSchools, getDepartments, getDepartmentsBySchoolId, getUnitsByDepartmentIdYearSemester } from "@/database/utils";
import { useQuery } from '@tanstack/react-query';

interface ResourceSearchProps {
    onSearch: (selection: {
        school: string;
        department: string;
        year: string;
        semester: string;
        unit: string;
    }) => void;
}

const years = ["1", "2", "3", "4"];

const semesters = ["1", "2", "3"];

// const units: Record<string, { id: string; name: string }[]> = {
//   cs: [
//     { id: "ds", name: "Data Structures & Algorithms" },
//     { id: "db", name: "Database Systems" },
//     { id: "aj", name: "Advanced Java" },
//     { id: "os", name: "Operating Systems" },
//   ],
//   it: [
//     { id: "net", name: "Computer Networks" },
//     { id: "sec", name: "Cybersecurity" },
//   ],
//   se: [
//     { id: "agile", name: "Agile Methodologies" },
//     { id: "testing", name: "Software Testing" },
//   ],
// };

const ResourceSearchModal = ({ isOpen, onClose, onSearch }) => {
    const [school, setSchool] = useState(JSON.parse(localStorage.getItem('resourceSelection'))?.school);
    const [schoolName, setSchoolName] = useState(JSON.parse(localStorage.getItem('resourceSelection'))?.schoolName);
    const [department, setDepartment] = useState(JSON.parse(localStorage.getItem('resourceSelection'))?.department);
    const [departmentName, setDepartmentName] = useState(JSON.parse(localStorage.getItem('resourceSelection'))?.departmentName);
    const [year, setYear] = useState(String(JSON.parse(localStorage.getItem('resourceSelection'))?.year));
    const [unit, setUnit] = useState(JSON.parse(localStorage.getItem('resourceSelection'))?.unit);
    const [semester, setSemester] = useState(String(JSON.parse(localStorage.getItem('resourceSelection'))?.semester));
    const [loading, setLoading] = useState(false)

    const progress = [school, department, year, semester, unit].filter(Boolean).length * 20;

    const { data: schools = [], isLoading } = useQuery({
        queryKey: ['schools'],
        queryFn: async () => {
            return await getSchools()
        },
    });

    const { data: departments = [], isLoading: isDepartmentsLoading } = useQuery({
        queryKey: ['departments'],
        queryFn: async () => {
            return await getDepartmentsBySchoolId(school)
        },
        enabled: !!school,
    });

    const { data: units = [], isLoading: isUnitsLoading } = useQuery({
        queryKey: ['units', year, semester, department],
        queryFn: async () => {
            return await getUnitsByDepartmentIdYearSemester(department, year, semester)
        },
        enabled: !!department && !!year && !!semester,
    });

    const steps = [
        { id: "school", label: "School", icon: Building2, completed: !!school },
        { id: "department", label: "Department", icon: BookOpen, completed: !!department },
        { id: "year", label: "Year", icon: Calendar, completed: !!year },
        { id: "semester", label: "Semester", icon: Calendar, completed: !!semester },
        { id: "unit", label: "Unit", icon: GraduationCap, completed: !!unit },
    ];

    const handleSearch = async () => {
        if (school && department && year && semester && unit) {
            setLoading(true)
            localStorage.setItem("resourceSelection", JSON.stringify({ school: school, schoolName: schoolName, department: department, departmentName: departmentName, year: Number(year), semester: Number(semester), unit: unit }));
            await onSearch({ school, department, year: Number(year), semester: Number(semester), unit });
            setLoading(false)
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[calc(100%-2rem)] rounded-lg md:max-w-2xl max-h-[90vh] overflow-auto p-0">
                <AnimatePresence mode="wait">
                    {/* <div className="flex items-center justify-center pt-4">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="w-full"
                        >

                            

                        </motion.div>
                    </div> */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="w-full h-full overflow-auto"
                    >
                        <Card className="shadow-elevated w-full h-full">
                            <CardHeader className="pb-4">
                                {/* <div className="flex items-center justify-between mb-4">
                                        {steps.map((step, index) => (
                                            <motion.div
                                                key={step.id}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: index * 0.1 }}
                                                className="flex flex-col items-center gap-1"
                                            >
                                                <div
                                                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${step.completed
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-muted text-muted-foreground"
                                                        }`}
                                                >
                                                    {step.completed ? (
                                                        <CheckCircle2 className="h-5 w-5" />
                                                    ) : (
                                                        <step.icon className="h-5 w-5" />
                                                    )}
                                                </div>
                                                <span className="text-xs font-medium text-muted-foreground">{step.label}</span>
                                            </motion.div>
                                        ))}
                                    </div> */}
                                {/* <Progress value={progress} className="h-2" /> */}
                            </CardHeader>

                            <CardContent className="space-y-4">
                                {/* School */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">School</label>
                                    <Select
                                        value={school}
                                        onValueChange={(value) => {
                                            setSchool(value);
                                            setDepartment("");
                                            setSchoolName(schools.find(s => s.id === value)?.name);
                                            setUnit("");
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select your school" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {schools.map((s) => (
                                                <SelectItem key={s.id} value={s.id}>
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Department */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Department</label>
                                    <Select
                                        value={department}
                                        onValueChange={(value) => {
                                            setDepartment(value);
                                            setDepartmentName(departments.find(d => d.id === value)?.name);
                                            setUnit("");
                                        }}
                                        disabled={!school}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select your department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departments.map((d) => (
                                                <SelectItem key={d.id} value={d.id}>
                                                    {d.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Year */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Year of Study</label>
                                    <Select value={year} onValueChange={setYear} disabled={!department}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select your year" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {years.map((y) => (
                                                <SelectItem key={y} value={y}>
                                                    {y}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Semester of Study</label>
                                    <Select value={semester} onValueChange={setSemester} disabled={!department}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select your semester" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {semesters.map((y) => (
                                                <SelectItem key={y} value={y}>
                                                    {y}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Unit */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Unit</label>
                                    <Select value={unit} onValueChange={setUnit} disabled={!year}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select your unit" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {units.map((u) => (
                                                <SelectItem key={u.id} value={u.id}>
                                                    {u.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button
                                    variant="accent"
                                    size="xl"
                                    className="w-full mt-6"
                                    disabled={!school || !department || !year || !semester || !unit}
                                    onClick={handleSearch}
                                >
                                    {loading ? (
                                        <Loader className="h-5 w-5 animate-spin" />
                                    ) : (<> Search</>)}
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    );
};

export default ResourceSearchModal;
