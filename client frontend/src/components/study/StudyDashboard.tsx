import { motion } from "framer-motion";
import { Timer, TrendingUp, Brain, BookOpen, ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import ResourceTabs from "./ResourceTabs";
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

const StudyDashboard = ({ unitId, onNavigate, onGenerateQuiz, onGenerateAnswers, onViewResource, showResourceSelector }: StudyDashboardProps) => {
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

          <div className="col-span-2 md:col-span-1 border border-primary/20 rounded-md h-full flex items-center justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
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

export default StudyDashboard;
