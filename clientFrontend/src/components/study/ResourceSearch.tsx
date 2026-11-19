import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Landmark, Building2, BookOpen, GraduationCap, Calendar, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { Progress } from "@/components/ui/progress";
import { getInstitutions, getSchools, getDepartmentsBySchoolId, getUnitsByDepartmentIdYearSemester } from "@/database/utils";
import { useQuery } from '@tanstack/react-query';

const years = ["1", "2", "3", "4"];

const semesters = ["1", "2", "3"];

interface ResourceSearchProps {
  onSearch: (selection: { institution: string; school: string; department: string; year: number; semester: number; unit: string }) => void;
  /** Render only the fields and button, for use inside a popover on the unit page. Without it, this is the full first-run page. */
  inline?: boolean;
}

const ResourceSearch = ({ onSearch, inline = false }: ResourceSearchProps) => {
    const [institution, setInstitution] = useState("");
    const [institutionName, setInstitutionName] = useState("");
    const [school, setSchool] = useState("");
    const [schoolName, setSchoolName] = useState("");
    const [department, setDepartment] = useState("");
    const [departmentName, setDepartmentName] = useState("");
    const [year, setYear] = useState("");
    const [unit, setUnit] = useState("");
    const [semester, setSemester] = useState("");

    const progress = [institution, school, department, year, semester, unit].filter(Boolean).length * (100 / 6);

    const { data: institutions = [] } = useQuery({
        queryKey: ['institutions'],
        queryFn: async () => await getInstitutions(),
    });

    // Choosing an institution comes first; the school list is only that institution's schools.
    const { data: schools = [] } = useQuery({
        queryKey: ['schools', institution],
        queryFn: async () => await getSchools(institution),
        enabled: !!institution,
    });

    // The school is part of the key, otherwise choosing another school would show the first school's departments.
    const { data: departments = [] } = useQuery({
        queryKey: ['departments', school],
        queryFn: async () => {
            return await getDepartmentsBySchoolId(school)
        },
        enabled: !!school,
    });

    const { data: units = [] } = useQuery({
        queryKey: ['units', year, semester, department],
        queryFn: async () => {
            return await getUnitsByDepartmentIdYearSemester(department, year, semester)
        },
        enabled: !!department && !!year && !!semester,
    });

    const steps = [
        { id: "institution", label: "Institution", icon: Landmark, completed: !!institution },
        { id: "school", label: "School", icon: Building2, completed: !!school },
        { id: "department", label: "Department", icon: BookOpen, completed: !!department },
        { id: "year", label: "Year", icon: Calendar, completed: !!year },
        { id: "semester", label: "Semester", icon: Calendar, completed: !!semester },
        { id: "unit", label: "Unit", icon: GraduationCap, completed: !!unit },
    ];

    const handleSearch = () => {
        if (institution && school && department && year && semester && unit) {
            localStorage.setItem("resourceSelection", JSON.stringify({institution: institution, institutionName: institutionName, school: school, schoolName: schoolName, department: department, departmentName: departmentName, year: Number(year), semester: Number(semester), unit: unit}));
            onSearch({ institution, school, department, year: Number(year), semester: Number(semester), unit });
        }
    };

  const fields = (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Institution</label>
        <Dropdown
          fullWidth
          label="Institution"
          placeholder="Select your institution"
          items={institutions}
          selectedId={institution}
          onSelect={(value) => {
            setInstitution(value);
            setSchool("");
            setDepartment("");
            setUnit("");
            setInstitutionName(institutions.find(i => i.id === value)?.name);
          }}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">School</label>
        <Dropdown
          fullWidth
          label="School"
          placeholder="Select your school"
          items={schools}
          selectedId={school}
          disabled={!institution}
          onSelect={(value) => {
            setSchool(value);
            setDepartment("");
            setUnit("");
            setSchoolName(schools.find(s => s.id === value)?.name);
          }}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Department</label>
        <Dropdown
          fullWidth
          label="Department"
          placeholder="Select your department"
          items={departments}
          selectedId={department}
          disabled={!school}
          onSelect={(value) => {
            setDepartment(value);
            setUnit("");
            setDepartmentName(departments.find(d => d.id === value)?.name);
          }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Year of Study</label>
          <Dropdown fullWidth label="Year of Study" placeholder="Select your year" items={years.map((y) => ({ id: y, name: y }))} selectedId={year} onSelect={setYear} disabled={!department} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Semester of Study</label>
          <Dropdown fullWidth label="Semester of Study" placeholder="Select your semester" items={semesters.map((s) => ({ id: s, name: s }))} selectedId={semester} onSelect={setSemester} disabled={!department} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Unit</label>
        <Dropdown fullWidth label="Unit" placeholder="Select your unit" items={units} selectedId={unit} onSelect={setUnit} disabled={!year || !semester} />
      </div>

      <Button
        variant="accent"
        size={inline ? "lg" : "xl"}
        className="mt-2 w-full"
        disabled={!institution || !school || !department || !year || !semester || !unit}
        onClick={handleSearch}
      >
        <Search className="h-5 w-5" />
        Search Resources
      </Button>
    </div>
  );

  if (inline) return fields;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Find Your Study Resources</h1>
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

          <CardContent>{fields}</CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Your selection will be saved for quick access next time
        </p>
      </motion.div>
    </div>
  );
};

export default ResourceSearch;
