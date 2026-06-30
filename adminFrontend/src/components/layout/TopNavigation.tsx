import { ChevronRight, LogOut, User, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface TopNavigationProps {
  onMenuToggle: () => void;
}

const roleLabels = {
  super_admin: 'Super Admin',
  school_admin: 'School Admin',
  course_admin: 'Course Admin',
};

export const TopNavigation = ({ onMenuToggle }: TopNavigationProps) => {
  const { user, logout } = useAuth();
  const { currentSchool, currentCourse } = useNavigation();

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-40 h-16 bg-card border-b flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuToggle}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            {/* <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">U</span>
            </div> */}
            <span className="font-semibold text-lg hidden sm:inline">Admin Panel</span>
          </div>

          {(currentSchool || currentCourse) && (
            <div className="hidden md:flex items-center gap-1.5 ml-4 text-sm">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              {currentSchool && (
                <span className="context-badge">
                  School: {currentSchool.name}
                </span>
              )}
              {currentCourse && (
                <>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <span className="context-badge">
                    Course: {currentCourse.name}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 h-auto py-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {user ? getInitials(user.name) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">
                {user && roleLabels[user.role]}
              </p>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};
