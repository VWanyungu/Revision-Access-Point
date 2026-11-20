import { NavLink, useNavigate } from 'react-router-dom';
import { Landmark, LayoutDashboard, Building2, BookOpen, Layers, FileText, Users, ChevronDown, LogOut, UserCircle, Menu } from 'lucide-react';
import { useAuth, type AdminRole } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { ModeToggle } from '@/components/mode-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import logo from '@/assets/logo-light.svg';

const ALL: AdminRole[] = ['super_admin', 'institution_admin', 'school_admin', 'course_admin'];
const links = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ALL },
  { icon: Landmark, label: 'Institutions', path: '/institutions', roles: ['super_admin'] },
  { icon: Building2, label: 'Schools', path: '/schools', roles: ['super_admin', 'institution_admin'] },
  { icon: BookOpen, label: 'Departments', path: '/departments', roles: ['super_admin', 'institution_admin', 'school_admin'] },
  { icon: Layers, label: 'Units', path: '/units', roles: ALL },
  { icon: FileText, label: 'Resources', path: '/resources', roles: ALL },
  { icon: Users, label: 'Admins', path: '/admins', roles: ['super_admin', 'institution_admin', 'school_admin'] },
];

/** Whether a role may open a page (profile is open to all). */
export const canOpen = (role: AdminRole, path: string) => {
  const link = links.find((l) => path === l.path || path.startsWith(`${l.path}/`));
  return !link || link.roles.includes(role);
};

/** Floating pill navbar, same look as the client app's. */
export const AdminNav = () => {
  const { logout } = useAuth();
  const { data: me } = useProfile();
  const navigate = useNavigate();
  const visible = links.filter((l) => l.roles.includes(me?.role ?? 'super_admin'));

  return (
    <header className="pointer-events-none sticky top-0 z-50 px-3 pt-3 md:px-6 md:pt-4">
      <nav aria-label="Main" className="pointer-events-auto mx-auto flex w-full max-w-5xl items-center gap-1 rounded-full bg-surface/70 p-1.5 pl-4 text-ink ring-1 ring-line/60 backdrop-blur-xl">
        <NavLink to="/dashboard" aria-label="Revision Access Point admin" className="relative mr-2 shrink-0 transition-opacity hover:opacity-70 before:absolute before:-inset-y-3 before:inset-x-0 before:content-['']">
          <img src={logo} alt="" className="h-6 w-[107px] dark:invert" />
        </NavLink>

        <div className="hidden items-center gap-0.5 lg:flex">
          {visible.map(({ label, path }) => (
            <NavLink key={path} to={path} className={({ isActive }) => `nav-link !py-2 ${isActive ? 'active' : ''}`}>
              {label}
            </NavLink>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <ModeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="group relative flex h-9 items-center gap-2 rounded-full bg-primary pl-1.5 pr-3 before:absolute before:-inset-1 before:content-[''] text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-dark">
                <Avatar className="size-6">
                  {me?.avatarUrl && <AvatarImage src={me.avatarUrl} alt="" />}
                  <AvatarFallback className="bg-primary-foreground/20 text-xs text-primary-foreground">{me?.initials || 'A'}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline">{me?.name.split(' ')[0] ?? 'Account'}</span>
                <ChevronDown size={14} className="transition-transform group-data-[state=open]:rotate-180" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={10} className="min-w-[200px] rounded-2xl p-1.5">
              {visible.map(({ icon: Icon, label, path }) => (
                <DropdownMenuItem key={path} className="cursor-pointer gap-2.5 rounded-inner px-3 py-2.5 text-sm lg:hidden" onClick={() => navigate(path)}>
                  <Icon size={18} /> {label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-inner px-3 py-2.5 text-sm" onClick={() => navigate('/profile')}>
                <UserCircle size={18} /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-inner px-3 py-2.5 text-sm text-danger focus:text-danger" onClick={logout}>
                <LogOut size={18} /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </header>
  );
};
