import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Building2, BookOpen, GraduationCap, Calendar, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
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

const ResourceSearch = ({ onSearch }) => {
    const [school, setSchool] = useState("");
    const [schoolName, setSchoolName] = useState("");
    const [department, setDepartment] = useState("");
    const [departmentName, setDepartmentName] = useState("");
    const [year, setYear] = useState("");
    const [unit, setUnit] = useState("");
    const [semester, setSemester] = useState("");

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

    const handleSearch = () => {
        if (school && department && year && semester && unit) {
            localStorage.setItem("resourceSelection", JSON.stringify({school: school, schoolName: schoolName, department: department, departmentName: departmentName, year: Number(year), semester: Number(semester), unit: unit}));
            onSearch({ school, department, year: Number(year), semester: Number(semester), unit });
        }
    };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Find Your Study Resources</h1>
          <p className="text-muted-foreground">
            Select your academic path to access notes, CATs, exams, and tutorials
          </p>
        </div>

        <Card className="shadow-elevated">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                      step.completed
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
            </div>
            <Progress value={progress} className="h-2" />
          </CardHeader>

          <CardContent className="space-y-4">
            {/* School */}
            <div className="space-y-2">
              <label className="text-sm font-medium">School / University</label>
              <Select
                value={school}
                onValueChange={(value) => {
                  setSchool(value);
                  setDepartment("");
                  setUnit("");
                  setSchoolName(schools.find(s => s.id === value)?.name);
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
                  setUnit("");
                  setDepartmentName(departments.find(d => d.id === value)?.name);
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
              <Select value={unit} onValueChange={setUnit} disabled={!year || !semester}>
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
              <Search className="h-5 w-5" />
              Search Resources
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Your selection will be saved for quick access next time
        </p>
      </motion.div>
    </div>
  );
};

export default ResourceSearch;
