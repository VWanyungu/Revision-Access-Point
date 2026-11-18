import { BookOpen, CaretDown, CreditCard, SignOut } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { ModeToggle } from "@/components/mode-toggle";
import { useAuth } from "@/context/AuthContext";
import logoLight from "@/assets/auth/logo-light.svg";

interface NavbarProps {
  studyContext?: { year: number; unit: number };
  currentPage?: string;
  onMenuClick: () => void;
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

const links = [
  { page: "resources", label: "Resources", Icon: BookOpen },
  { page: "subscriptions", label: "Subscriptions", Icon: CreditCard },
];

const Navbar = ({ currentPage, onLogout, onNavigate }: NavbarProps) => {
  const { user, signOut } = useAuth();
  const meta = user?.user_metadata?.full_name as string | undefined;
  const userName = (meta || user?.email?.split("@")[0] || "Account").split(" ")[0];

  const handleLogout = async () => {
    localStorage.removeItem("user");
    try {
      await signOut();
      toast.success("Logged out");
    } catch (e: any) {
      toast.error("Error logging out: " + e.message);
    }
    onLogout();
  };

  return (
    // Sticky wrapper ignores the pointer so only the pill itself is clickable; page content scrolls beneath it.
    <header className="pointer-events-none sticky top-0 z-50 px-3 pt-3 font-geist md:px-6 md:pt-4">
      <nav
        aria-label="Main"
        className="pointer-events-auto mx-auto flex w-full max-w-3xl items-center gap-1 rounded-full bg-surface/85 p-1.5 pl-4 text-ink shadow-[0_8px_30px_-14px_rgba(14,21,37,0.18)] ring-1 ring-line backdrop-blur-xl"
      >
        <button
          type="button"
          onClick={() => onNavigate("resources")}
          aria-label="Revision Access Point home"
          className="mr-2 shrink-0 transition-opacity duration-300 hover:opacity-70"
        >
          <img src={logoLight} alt="" className="h-6 w-[107px] dark:invert" />
        </button>

        <div className="ml-auto hidden items-center gap-0.5 md:flex">
          {links.map(({ page, label }) => (
            <button
              key={page}
              type="button"
              onClick={() => onNavigate(page)}
              aria-current={currentPage === page ? "page" : undefined}
              className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                currentPage === page
                  ? "bg-field text-ink"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-1">
          <ModeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="group flex h-9 items-center gap-1.5 rounded-full bg-ink pl-4 pr-3 text-sm font-medium text-ink-fg ring-2 ring-ink/10 transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-ink-hover active:scale-[0.98]"
              >
                {userName}
                <CaretDown size={14} className="transition-transform duration-300 group-data-[state=open]:rotate-180" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={10} className="min-w-[200px] rounded-2xl p-1.5 font-geist">
              {links.map(({ page, label, Icon }) => (
                <DropdownMenuItem
                  key={page}
                  className="cursor-pointer gap-2.5 rounded-xl px-3 py-2.5 text-sm md:hidden"
                  onClick={() => onNavigate(page)}
                >
                  <Icon size={18} /> {label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                className="cursor-pointer gap-2.5 rounded-xl px-3 py-2.5 text-sm text-danger focus:text-danger"
                onClick={handleLogout}
              >
                <SignOut size={18} /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
