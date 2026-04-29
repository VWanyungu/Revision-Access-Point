import { Bell, ChevronDown, User, BookOpen, Brain, Calendar, TrendingUp, LogOut, Menu, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/database/supabase";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";

interface NavbarProps {
  studyContext?: {
    year: number;
    unit: number;
  };
  onMenuClick: () => void;
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

const Navbar = ({ studyContext, onMenuClick, onLogout, onNavigate }: NavbarProps) => {
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.user_metadata) {
      setUserName(String(user.user_metadata.full_name).split(" ")[0]);
    }
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem("user");

    const { error } = await supabase.auth.signOut()

    if (error) {
      toast.error('Error logging out: ' + error.message)
    } else {
      toast.success('Logged out successful')
    }

    onLogout();
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex h-16 items-center px-4 md:px-6">
        {/* Mobile menu button */}
        {/* <Button
          variant="ghost"
          size="icon"
          className="mr-2 md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button> */}

        {/* Logo */}
        <div className="flex items-center gap-2">
          {/* <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <BookOpen className="h-5 w-5 text-primary-foreground" />
          </div> */}
          <span className="hidden font-semibold text-lg md:inline-block">Revision Access Point</span>
        </div>

        {/* Study Context */}
        {/* {studyContext && (
          <div className="ml-6 hidden items-center gap-2 md:flex">
            <span className="text-muted-foreground">/</span>
            <Badge variant="secondary" className="font-medium">
              {studyContext.year}
            </Badge>
            <span className="text-muted-foreground">→</span>
            <Badge variant="outline" className="font-medium">
              {studyContext.unit}
            </Badge>
          </div>
        )} */}

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          {/* Back to Resources button */}
          {/* <Button variant="outline" className="hidden md:flex gap-2" onClick={() => onNavigate("resources")}>
            <BookOpen className="h-4 w-4" />
            Back to Resources
          </Button> */}

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <span className="hidden md:inline">{userName}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="">
              {/* <DropdownMenuItem className="gap-2">
                <Brain className="h-4 w-4" />
                My Quizzes
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <BookOpen className="h-4 w-4" />
                Flashcards
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <Calendar className="h-4 w-4" />
                Study Calendar
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Progress
              </DropdownMenuItem>
              <DropdownMenuSeparator /> */}
              <DropdownMenuItem className="gap-2 px-4 py-2 rounded-none cursor-pointer border-b border-border" onClick={() => onNavigate("resources")}>
                <BookOpen className="h-4 w-4" />
                Resources
              </DropdownMenuItem>



              <DropdownMenuItem className="gap-2 px-4 py-2 rounded-none cursor-pointer border-b border-border" onClick={() => onNavigate("subscriptions")}>
                <CreditCard className="h-4 w-4" />
                Subscriptions
              </DropdownMenuItem>

              {/* <DropdownMenuSeparator /> */}

              <DropdownMenuItem className="gap-2 px-4 py-2 rounded-none cursor-pointer border-b border-border text-destructive focus:text-destructive" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
