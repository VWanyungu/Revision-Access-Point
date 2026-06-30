import { motion } from "framer-motion";
import { Timer, TrendingUp, Brain, BookOpen, ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import ResourceTabs, { DisplayResourceDiv, DisplayResourceTabs } from "./ResourceTabs";
import { ResourceDiv } from "./ResourceTabs";
import PomodoroTimerCondensed from "./PomodoroTimerCondensed";
import { useState, useRef, useEffect } from "react";
import { getResources } from "@/database/utils";
import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, CreditCard, LogOut, ChevronDown, Lock, Eye, EyeOff, GraduationCap, PersonStanding, User, User2, Loader } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ResourceFilter } from "@/database/utils";

interface StudyDashboardProps {
  unitName?: string;
  unitId: number;
  onNavigate: (page: string) => void;
  onGenerateQuiz: (resourceUrl: string, resourceTitle: string) => void;
  onGenerateAnswers: (resourceUrl: string, resourceTitle: string) => void;
  onViewResource: (url: string) => void;
  showResourceSelector?: () => void;
}

export const StudyDashboard = ({ unitId, onNavigate, onGenerateQuiz, onGenerateAnswers, onViewResource, showResourceSelector }: StudyDashboardProps) => {
  const [showPomodoro, setShowPomodoro] = useState(localStorage.getItem("showPomodoro") || "false");
  const [showSearch, setShowSearch] = useState(localStorage.getItem("showSearch") || "false");
  const unitsXtics = JSON.parse(localStorage.getItem("resourceSelection"));
  const [search, setSearch] = useState<ResourceFilter>({ searchTerm: "", type: "all" });
  const [searchInput, setSearchInput] = useState(localStorage.getItem("searchTerm") ? localStorage.getItem("searchTerm") : "");

  const queryClient = useQueryClient()

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['resources', unitId, search],
    queryFn: async () => {
      return await getResources(unitId, search)
    },
    enabled: !!unitId,
  });

  useEffect(() => {
    const delay = setTimeout(() => {
      setSearch(prev => ({ ...prev, searchTerm: searchInput.trim() }));
      localStorage.setItem("searchTerm", searchInput.trim());
    }, 400);

    return () => clearTimeout(delay);
  }, [searchInput]);

  return (
    <div className="space-y-6 w-[100%] md:px-6 lg:px-72 py-6">
      {/* Unit Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 md:px-0"
      >
        <Card className="gradient-primary text-primary-foreground overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-primary-foreground/70 text-sm mb-1">Currently Studying</p>
                <h1 className="text-2xl font-bold">{resources[0]?.units.name}</h1>
                <p className="text-primary-foreground/80 mt-2 text-sm">
                  {resources.length} resources available
                </p>
              </div>

              <div className="flex flex-row-reverse items-center gap-3">
                <Button
                  variant="secondary"
                  className="bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-0"
                  // onClick={() => onNavigate("timer")}
                  onClick={() => { setShowPomodoro(showPomodoro == "true" ? "false" : "true"); localStorage.setItem("showPomodoro", JSON.stringify(showPomodoro == "true" ? false : true)) }}
                >
                  <Timer className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  className="bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-0"
                  // onClick={() => onNavigate("timer")}
                  onClick={() => { setShowSearch(showSearch == "true" ? "false" : "true"); setSearch({ searchTerm: "", type: "all" }); localStorage.setItem("showSearch", JSON.stringify(showSearch == "true" ? false : true)) }}
                >
                  <Search className="h-4 w-4" />
                  Search
                </Button>
                <Button
                  variant="secondary"
                  className="bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-0"
                  // onClick={() => onNavigate("progress")}
                  onClick={showResourceSelector}
                >
                  <BookOpen className="h-4 w-4" />
                  Resources
                </Button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="hidden md:grid grid-cols-1 gap-4 mt-6 pt-6 px-6 md:px-0 border-t border-primary-foreground/20">
              {/* <div>
                <p className="text-3xl font-bold">78%</p>
                <p className="text-sm text-primary-foreground/70">Average Score</p>
              </div>
              <div>
                <p className="text-3xl font-bold">5.2h</p>
                <p className="text-sm text-primary-foreground/70">Study Time</p>
              </div>
              <div>
                <p className="text-3xl font-bold">24</p>
                <p className="text-sm text-primary-foreground/70">Flashcards</p>
              </div> */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="default" className="font-light border border-primary-foreground/20">
                  {resources[0]?.schools?.name || unitsXtics?.schoolName || "Loading..."}
                </Badge>
                .
                <Badge variant="default" className="font-light border border-primary-foreground/20">
                  {resources[0]?.departments?.name || unitsXtics?.departmentName || "Loading..."}
                </Badge>
                .
                <Badge variant="default" className="font-light border border-primary-foreground/20">
                  Year {unitsXtics?.year} . Semester {unitsXtics?.semester}
                </Badge>
                .
                <Badge variant="default" className="font-light border border-primary-foreground/20">
                  {resources[0]?.units?.name || "Loading..."}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pomodoro */}
      {showPomodoro == "true" && <div className="px-6 md:px-0">
        <PomodoroTimerCondensed />
      </div>}

      {showSearch == "true" && <form className="px-6 md:px-0 grid grid-cols-5 md:grid-cols-11 *:items-center gap-2">
        <div className="col-span-3 md:col-span-10 h-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="searchTerm"
              type="text"
              placeholder="Search resources..."
              className="pl-10"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="col-span-2 md:col-span-1 border border-primary/20 h-full flex items-center justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 w-full">
                <Label>Type:</Label>
                <span className="inline">{search.type}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="">
              <DropdownMenuItem className="gap-2 px-4 py-2 rounded-none cursor-pointer border-b border-border" onClick={() => setSearch(prev => ({ ...prev, type: "all" }))}>
                All
              </DropdownMenuItem>

              <DropdownMenuItem className="gap-2 px-4 py-2 rounded-none cursor-pointer border-b border-border" onClick={() => setSearch(prev => ({ ...prev, type: "notes" }))}>
                Notes
              </DropdownMenuItem>

              <DropdownMenuItem className="gap-2 px-4 py-2 rounded-none cursor-pointer border-b border-border" onClick={() => setSearch(prev => ({ ...prev, type: "cats" }))}>
                Cats
              </DropdownMenuItem>

              <DropdownMenuItem className="gap-2 px-4 py-2 rounded-none cursor-pointer border-b border-border" onClick={() => setSearch(prev => ({ ...prev, type: "exams" }))}>
                Exams
              </DropdownMenuItem>

              <DropdownMenuItem className="gap-2 px-4 py-2 rounded-none cursor-pointer border-b border-border" onClick={() => setSearch(prev => ({ ...prev, type: "tutorials" }))}>
                Tutorials
              </DropdownMenuItem>

              {/* <DropdownMenuSeparator /> */}

            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* <Button type="submit" className="col-span-1" size="default" disabled={isLoading}>
            {isLoading ? (
              <Loader className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Search className="h-4 w-4" />
              </>
            )}
          </Button> */}
      </form>}

      {/* Resources */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {showSearch == "true" ? (<ResourceDiv onGenerateQuiz={onGenerateQuiz} onGenerateAnswers={onGenerateAnswers} onViewResource={onViewResource} resources={resources} />)
          : (<ResourceTabs onGenerateQuiz={onGenerateQuiz} onGenerateAnswers={onGenerateAnswers} onViewResource={onViewResource} resources={resources} />)}
      </motion.div>
    </div>
  );
};


const sampleResources = [
  {
    "id": 16,
    "created_at": "2026-01-20T09:35:01.719414+00:00",
    "name": "Introduction to project management",
    "description": "",
    "unit_id": 4,
    "updated_at": "2026-01-20T09:35:01.719414+00:00",
    "public_access_url": "https://ptktlornnngqvzbbisaq.supabase.co/storage/v1/object/public/notes2/1768901698874_rgskt3s_01_Introduction_to_Project_Management.pdf",
    "uploaded_by": "admin@gmail.com",
    "resource_type_id": 1,
    "department_id": 1,
    "school_id": 1,
    "resource_types": {
      "name": "notes"
    },
    "units": {
      "name": "Software Project Management "
    },
    "departments": {
      "name": "Computer Science"
    },
    "schools": {
      "name": "School of Computing and Informatics"
    }
  },
  // {
  //     "id": 17,
  //     "created_at": "2026-01-21T04:34:23.927391+00:00",
  //     "name": "The Project Management and Information Technology Context",
  //     "description": "",
  //     "unit_id": 4,
  //     "updated_at": "2026-01-21T04:34:23.927391+00:00",
  //     "public_access_url": "https://ptktlornnngqvzbbisaq.supabase.co/storage/v1/object/public/notes2/1768970060573_99lr3ub_02_The_Project_Management_and_Information_Technology_Context.pdf",
  //     "uploaded_by": "admin@gmail.com",
  //     "resource_type_id": 1,
  //     "department_id": 1,
  //     "school_id": 1,
  //     "resource_types": {
  //         "name": "notes"
  //     },
  //     "units": {
  //         "name": "Software Project Management "
  //     },
  //     "departments": {
  //         "name": "Computer Science"
  //     },
  //     "schools": {
  //         "name": "School of Computing and Informatics"
  //     }
  // },
  // {
  //     "id": 18,
  //     "created_at": "2026-01-21T04:34:25.905545+00:00",
  //     "name": "The Project Management Process Groups",
  //     "description": "",
  //     "unit_id": 4,
  //     "updated_at": "2026-01-21T04:34:25.905545+00:00",
  //     "public_access_url": "https://ptktlornnngqvzbbisaq.supabase.co/storage/v1/object/public/notes2/1768970064088_edgd0ms_03_The_Project_Management_Process_Groups.pdf",
  //     "uploaded_by": "admin@gmail.com",
  //     "resource_type_id": 1,
  //     "department_id": 1,
  //     "school_id": 1,
  //     "resource_types": {
  //         "name": "notes"
  //     },
  //     "units": {
  //         "name": "Software Project Management "
  //     },
  //     "departments": {
  //         "name": "Computer Science"
  //     },
  //     "schools": {
  //         "name": "School of Computing and Informatics"
  //     }
  // },
  // {
  //     "id": 34,
  //     "created_at": "2026-01-21T21:04:19.855008+00:00",
  //     "name": "What is project management",
  //     "description": "",
  //     "unit_id": 4,
  //     "updated_at": "2026-01-21T21:04:19.855008+00:00",
  //     "public_access_url": "<iframe width=\"1861\" height=\"835\" src=\"https://www.youtube.com/embed/bw-NvGvLHtM\" title=\"What is Project Management? | Explained in 10 Minutes\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen></iframe>",
  //     "uploaded_by": "admin@gmail.com",
  //     "resource_type_id": 4,
  //     "department_id": 1,
  //     "school_id": 1,
  //     "resource_types": {
  //         "name": "tutorials"
  //     },
  //     "units": {
  //         "name": "Software Project Management "
  //     },
  //     "departments": {
  //         "name": "Computer Science"
  //     },
  //     "schools": {
  //         "name": "School of Computing and Informatics"
  //     }
  // },
  {
    "id": 35,
    "created_at": "2026-01-21T21:06:22.779059+00:00",
    "name": "CAT I 2025-2026",
    "description": "",
    "unit_id": 4,
    "updated_at": "2026-01-21T21:06:22.779059+00:00",
    "public_access_url": "https://ptktlornnngqvzbbisaq.supabase.co/storage/v1/object/public/notes2/1769029580389_y8fv6ek_project_management_cat.pdf",
    "uploaded_by": "admin@gmail.com",
    "resource_type_id": 3,
    "department_id": 1,
    "school_id": 1,
    "resource_types": {
      "name": "cats"
    },
    "units": {
      "name": "Software Project Management "
    },
    "departments": {
      "name": "Computer Science"
    },
    "schools": {
      "name": "School of Computing and Informatics"
    }
  },
  // {
  //     "id": 36,
  //     "created_at": "2026-01-21T21:06:24.294723+00:00",
  //     "name": "CAT II 2025-2026",
  //     "description": "",
  //     "unit_id": 4,
  //     "updated_at": "2026-01-21T21:06:24.294723+00:00",
  //     "public_access_url": "https://ptktlornnngqvzbbisaq.supabase.co/storage/v1/object/public/notes2/1769029583067_gro2d0s_BCS_412_CAT_II.pdf",
  //     "uploaded_by": "admin@gmail.com",
  //     "resource_type_id": 3,
  //     "department_id": 1,
  //     "school_id": 1,
  //     "resource_types": {
  //         "name": "cats"
  //     },
  //     "units": {
  //         "name": "Software Project Management "
  //     },
  //     "departments": {
  //         "name": "Computer Science"
  //     },
  //     "schools": {
  //         "name": "School of Computing and Informatics"
  //     }
  // },
  {
    "id": 62,
    "created_at": "2026-01-30T00:07:54.488143+00:00",
    "name": "2022/2023",
    "description": "",
    "unit_id": 4,
    "updated_at": "2026-01-30T00:07:54.488143+00:00",
    "public_access_url": "https://ptktlornnngqvzbbisaq.supabase.co/storage/v1/object/public/notes2/1769731667348_wk3lpms_BCS_412__1_.pdf",
    "uploaded_by": "admin@gmail.com",
    "resource_type_id": 2,
    "department_id": 1,
    "school_id": 1,
    "resource_types": {
      "name": "exams"
    },
    "units": {
      "name": "Software Project Management "
    },
    "departments": {
      "name": "Computer Science"
    },
    "schools": {
      "name": "School of Computing and Informatics"
    }
  }
]

export const DisplayStudyDashboard = () => {
  const [showPomodoro, setShowPomodoro] = useState(localStorage.getItem("showPomodoro") || "false");
  const [showSearch, setShowSearch] = useState(localStorage.getItem("showSearch") || "false");
  const unitsXtics = JSON.parse(localStorage.getItem("resourceSelection"));
  const [search, setSearch] = useState<ResourceFilter>({ searchTerm: "", type: "all" });
  const [searchInput, setSearchInput] = useState(localStorage.getItem("searchTerm") ? localStorage.getItem("searchTerm") : "");

  const queryClient = useQueryClient()

  const resources = sampleResources

  useEffect(() => {
    const delay = setTimeout(() => {
      setSearch(prev => ({ ...prev, searchTerm: searchInput.trim() }));
      localStorage.setItem("searchTerm", searchInput.trim());
    }, 400);

    return () => clearTimeout(delay);
  }, [searchInput]);

  return (
    <div className="w-[100%] md:px-6 py-6">
      {/* Unit Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 md:px-0"
      >
        <Card className="gradient-primary text-primary-foreground overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col items-start justify-center gap-4">
              <div>
                <p className="text-primary-foreground/70 text-sm mb-1">Currently Studying</p>
                <h1 className="text-2xl font-bold">{resources[0]?.units.name}</h1>
                <p className="text-primary-foreground/80 mt-2 text-sm">
                  {resources.length} resources available
                </p>
              </div>

              <div className="flex flex-row-reverse items-center gap-3">
                <Button
                  variant="secondary"
                  className="bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-0"
                  // onClick={() => onNavigate("timer")}
                  onClick={() => { setShowPomodoro(showPomodoro == "true" ? "false" : "true"); localStorage.setItem("showPomodoro", JSON.stringify(showPomodoro == "true" ? false : true)) }}
                >
                  <Timer className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  className="bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-0"
                  // onClick={() => onNavigate("timer")}
                  onClick={() => { setShowSearch(showSearch == "true" ? "false" : "true"); setSearch({ searchTerm: "", type: "all" }); localStorage.setItem("showSearch", JSON.stringify(showSearch == "true" ? false : true)) }}
                >
                  <Search className="h-4 w-4" />
                  Search
                </Button>
                <Button
                  variant="secondary"
                  className="bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-0"
                >
                  <BookOpen className="h-4 w-4" />
                  Resources
                </Button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="hidden md:grid grid-cols-1 gap-4 mt-6 pt-6 px-6 md:px-0 border-t border-primary-foreground/20">
              {/* <div>
                <p className="text-3xl font-bold">78%</p>
                <p className="text-sm text-primary-foreground/70">Average Score</p>
              </div>
              <div>
                <p className="text-3xl font-bold">5.2h</p>
                <p className="text-sm text-primary-foreground/70">Study Time</p>
              </div>
              <div>
                <p className="text-3xl font-bold">24</p>
                <p className="text-sm text-primary-foreground/70">Flashcards</p>
              </div> */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="default" className="font-light border border-primary-foreground/20">
                  {resources[0]?.schools?.name || unitsXtics?.schoolName || "Loading..."}
                </Badge>
                .
                <Badge variant="default" className="font-light border border-primary-foreground/20">
                  {resources[0]?.departments?.name || unitsXtics?.departmentName || "Loading..."}
                </Badge>
                .
                <Badge variant="default" className="font-light border border-primary-foreground/20">
                  Year {unitsXtics?.year} . Semester {unitsXtics?.semester}
                </Badge>
                .
                <Badge variant="default" className="font-light border border-primary-foreground/20">
                  {resources[0]?.units?.name || "Loading..."}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pomodoro */}
      {showPomodoro == "true" && <div className="px-6 md:px-0 my-2">
        <PomodoroTimerCondensed />
      </div>}

      {showSearch == "true" && <form className="my-2 px-6 md:px-0 grid grid-cols-5 *:items-center gap-2">
        <div className="col-span-3 h-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="searchTerm"
              type="text"
              placeholder="Search resources..."
              className="pl-10"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="col-span-2 border border-primary/20 h-full flex items-center justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 w-full">
                <Label>Type:</Label>
                <span className="inline">{search.type}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="">
              <DropdownMenuItem className="gap-2 px-4 py-2 rounded-none cursor-pointer border-b border-border" onClick={() => setSearch(prev => ({ ...prev, type: "all" }))}>
                All
              </DropdownMenuItem>

              <DropdownMenuItem className="gap-2 px-4 py-2 rounded-none cursor-pointer border-b border-border" onClick={() => setSearch(prev => ({ ...prev, type: "notes" }))}>
                Notes
              </DropdownMenuItem>

              <DropdownMenuItem className="gap-2 px-4 py-2 rounded-none cursor-pointer border-b border-border" onClick={() => setSearch(prev => ({ ...prev, type: "cats" }))}>
                Cats
              </DropdownMenuItem>

              <DropdownMenuItem className="gap-2 px-4 py-2 rounded-none cursor-pointer border-b border-border" onClick={() => setSearch(prev => ({ ...prev, type: "exams" }))}>
                Exams
              </DropdownMenuItem>

              <DropdownMenuItem className="gap-2 px-4 py-2 rounded-none cursor-pointer border-b border-border" onClick={() => setSearch(prev => ({ ...prev, type: "tutorials" }))}>
                Tutorials
              </DropdownMenuItem>

              {/* <DropdownMenuSeparator /> */}

            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* <Button type="submit" className="col-span-1" size="default" disabled={isLoading}>
            {isLoading ? (
              <Loader className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Search className="h-4 w-4" />
              </>
            )}
          </Button> */}
      </form>}

      {/* Resources */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-4"
      >
        <DisplayResourceTabs resources={resources} />
      </motion.div>
    </div>
  );
};

export default StudyDashboard;
