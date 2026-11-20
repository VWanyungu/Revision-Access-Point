import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { BookOpenText, Exam, FileText, UserCircle } from "@phosphor-icons/react";

const TABS = [
  { id: "unit", label: "Unit", Icon: BookOpenText, to: "/app?view=syllabus" },
  { id: "papers", label: "Papers", Icon: FileText, to: "/app?view=papers" },
  { id: "practice", label: "Practice", Icon: Exam, to: "/app?view=predictions" },
  { id: "profile", label: "Profile", Icon: UserCircle, to: "/app/profile" },
] as const;

/** Floating pill tab bar for phones, in the same glass language as the top navbar. The unit page lifts its Topics pill above it. */
const MobileTabBar = () => {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const path = pathname.replace(/\/+$/, "");
  const view = params.get("view");
  const active = path === "/app/profile" ? "profile" : path === "/app" ? (view === "predictions" ? "practice" : view === "papers" || view === null ? "papers" : "unit") : null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] font-geist md:hidden">
      <nav aria-label="Sections" className="pointer-events-auto mx-auto flex max-w-sm items-center gap-1 rounded-full bg-surface/35 p-1.5 text-ink shadow-float ring-1 ring-white/60 backdrop-blur-2xl backdrop-saturate-150 dark:bg-surface/30 dark:ring-white/10">
        {TABS.map(({ id, label, Icon, to }) => (
          <button
            key={id}
            type="button"
            onClick={() => navigate(to)}
            aria-current={active === id ? "page" : undefined}
            className={`flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-xs transition-[background-color,color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] motion-reduce:transition-none ${
              active === id ? "bg-ink/10 font-semibold text-ink" : "font-medium text-ink"
            }`}
          >
            <Icon size={20} weight={active === id ? "fill" : "regular"} aria-hidden />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default MobileTabBar;
