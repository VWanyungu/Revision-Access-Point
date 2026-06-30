import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Check, Lock, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/database/supabase";
import MpesaPaymentDialog from "@/components/payment/MpesaPaymentDialog";
import { useQuery } from '@tanstack/react-query';
import { getSchools, getDepartmentsBySchoolId } from "@/database/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface PricingGateProps {
  onLogout: () => void;
  onSubscribed?: () => void;
  onCancel?: () => void;
}

const semesters = [
  { id: 2, name: "Semester Pass", range: "4 months of access", price: `KSH ${import.meta.env.VITE_SEMESTER_PRICE}`, recommended: true },
];

const PricingGate = ({ onLogout, onSubscribed, onCancel }: PricingGateProps) => {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState<typeof semesters[0] | null>(null);

  const [school, setSchool] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  const [openDept, setOpenDept] = useState(false);
  const [openSchool, setOpenSchool] = useState(false);

  const years = ["1", "2", "3", "4", "5", "6"];
  const semestersList = ["1", "2", "3"];

  const { data: schools = [] } = useQuery({
    queryKey: ['schools'],
    queryFn: async () => {
      const fetchedSchools = await getSchools()
      setSchool(String(fetchedSchools[0].id))
      return fetchedSchools
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments', school],
    queryFn: async () => await getDepartmentsBySchoolId(school),
    enabled: !!school,
  });

  const handleLogout = async () => {
    localStorage.removeItem("user");
    await supabase.auth.signOut();
    onLogout();
  };

  const handleGetStarted = (sem: typeof semesters[0]) => {
    setSelectedSemester(sem);
    setPaymentOpen(true);
  };

  const handlePaymentSuccess = () => {
    setTimeout(() => {
      setPaymentOpen(false);
      onSubscribed?.();
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar - only show if standalone */}
      {!onCancel && (
        <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
          <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <BookOpen className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">Revision Access Point</span>
            </div>
            <Button variant="ghost" onClick={handleLogout}>Log Out</Button>
          </div>
        </header>
      )}

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Lock message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          {/* <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 mx-auto mb-6">
            <Lock className="h-8 w-8 text-accent" />
          </div> */}
          <h1 className="text-2xl font-bold mb-3">
            {onCancel ? "New Subscription" : "Subscription Required"}
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            {onCancel
              ? "Choose an academic plan below to get started."
              : "You need an active plan to access the app. Choose a plan below to get started."}
          </p>
        </motion.div>

        {/* Selection Form */}
        <div className="max-w-md mx-auto mb-6 space-y-4 bg-card p-6 border border-border bg-opacity-50">
          <h2 className="font-semibold mb-2 text-center text-lg">Select academic details</h2>

          <div className="space-y-2 flex flex-col">
            <label className="text-sm font-medium">School</label>
            {/* <Select value={school} onValueChange={(val) => { setSchool(val); setDepartment(""); }}>
              <SelectTrigger><SelectValue placeholder="Select your school" /></SelectTrigger>
              <SelectContent>
                {schools.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select> */}

            <Popover open={openSchool} onOpenChange={setOpenSchool}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={openSchool} className="justify-between" disabled={!school}>
                  {schools.length > 0 ? schools[0].name : "Search school..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search schools..." />
                  <CommandList>
                    <CommandEmpty>No schools found.</CommandEmpty>
                    <CommandGroup>
                      {schools.map((s: any) => (
                        <CommandItem key={s.id} value={String(s.id)} onSelect={(val) => {
                          setSchool(val); 
                          setDepartment("");
                          setOpenSchool(false);
                        }}>
                          <Check className={`mr-2 h-4 w-4 ${school === String(s.id) ? "opacity-100" : "opacity-0"}`} />
                          {s.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2 flex flex-col">
            <label className="text-sm font-medium">Department</label>
            <Popover open={openDept} onOpenChange={setOpenDept}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={openDept} className="justify-between" disabled={!school}>
                  {department && departments.length > 0 ? departments.find((d: any) => String(d.id) === department)?.name : "Search department..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search department..." />
                  <CommandList>
                    <CommandEmpty>No department found.</CommandEmpty>
                    <CommandGroup>
                      {departments.map((d: any) => (
                        <CommandItem key={d.id} value={d.name} onSelect={(val) => {
                          const selected = departments.find((dept: any) => dept.name.toLowerCase() === val.toLowerCase()) || d;
                          setDepartment(String(selected.id));
                          setOpenDept(false);
                        }}>
                          <Check className={`mr-2 h-4 w-4 ${department === String(d.id) ? "opacity-100" : "opacity-0"}`} />
                          {d.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue placeholder="Select Year" /></SelectTrigger>
                <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Semester</label>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger><SelectValue placeholder="Select Sem" /></SelectTrigger>
                <SelectContent>{semestersList.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="max-w-md mx-auto grid sm:grid-cols-1 gap-6">
          {semesters.map((sem, i) => (
            <motion.div
              key={sem.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Card
                className={`relative h-full text-center transition-all hover:shadow-lg ${sem.recommended
                  // scale-[1.03] - add this for recommended option
                  ? "border border-primary shadow-lg"
                  : "border-border/50"
                  }`}
              >
                {/* {sem.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">One time offer</Badge>
                  </div>
                )} */}
                <CardHeader className="pb-4 pt-8">
                  <CardTitle className="text-xl">{sem.name}</CardTitle>
                  <CardDescription>{sem.range}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <span className="text-4xl font-bold">{sem.price}</span>
                    {/* <span className="text-muted-foreground ml-1">/semester</span> */}
                  </div>
                  {/* <ul className="text-sm text-muted-foreground space-y-2 flex flex-col items-center">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> All past papers & notes</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> AI quiz generation</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Pomodoro timer</li>
                  </ul> */}
                  <Button
                    className="w-full"
                    variant={sem.recommended ? "default" : "outline"}
                    size="lg"
                    disabled={!department || !year || !semester}
                    onClick={() => handleGetStarted(sem)}
                  >
                    Proceed to payment
                  </Button>
                  {onCancel && (
                    <Button
                      className="w-full"
                      variant="outline"
                      size="lg"
                      onClick={onCancel}
                    >
                      Cancel
                    </Button>
                    // <div className="flex justify-center mt-6 max-w-md mx-auto">
                    //   <Button variant="outline" onClick={onCancel} className="w-full border border-red-500">Cancel</Button>
                    // </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {selectedSemester && (
        <MpesaPaymentDialog
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          semesterName={selectedSemester.name}
          price={`KSH ${import.meta.env.VITE_SEMESTER_PRICE}`}
          departmentId={department}
          year={year}
          semester={semester}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default PricingGate;
