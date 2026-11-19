import { ReactNode } from "react";
import PageCrumbs, { type Crumb } from "@/components/layout/PageCrumbs";
import logoLight from "@/assets/auth/logo-light.svg";
import { Dropdown } from "@/components/ui/dropdown";

/** Same easing everywhere on the pay screens: a quick start that settles softly. */
export const EASE = [0.32, 0.72, 0, 1] as const;

export const PayPage = ({ children }: { children: ReactNode }) => (
  <div className="min-h-[100dvh] bg-background font-geist text-ink">{children}</div>
);

/** Logo and a quiet text action. Desktop shows the full lockup, phones fit it in 28px. */
export const PayHeader = ({ action }: { action?: { label: string; onClick: () => void } }) => (
  <header className="flex h-14 items-center justify-between border-b border-line px-5 md:h-16 md:px-12 xl:px-36">
    <img src={logoLight} alt="Revision Access Point" className="h-[28.5px] w-[127px] dark:invert" />
    {action && (
      <button
        type="button"
        onClick={action.onClick}
        className="text-sm font-medium text-ink-muted transition-colors duration-300 hover:text-ink"
      >
        {action.label}
      </button>
    )}
  </header>
);

/** Payment breadcrumb: the same floating card as every other page. Without `onHome` (after paying) the house is just an icon. */
export const PayTopBar = ({ trail = [], current = "Payment", onHome }: { trail?: Crumb[]; current?: string; onHome?: () => void }) => (
  <PageCrumbs onHome={onHome} trail={trail} current={current} />
);

/**
 * Pinned to the bottom on phones, sits in the flow on desktop.
 * `className` lets the choose screen hide it on desktop.
 */
export const PayBottomBar = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div
    className={`fixed inset-x-0 bottom-0 flex flex-col items-center gap-2 border-t border-line bg-background px-5 pb-6 pt-4 md:static md:border-0 md:px-0 md:pb-0 md:pt-8 ${className}`}
  >
    {children}
  </div>
);

export const Title = ({ children, sub, icon, subDesktopOnly }: { children: ReactNode; sub?: ReactNode; icon?: ReactNode; subDesktopOnly?: boolean }) => (
  <div className="flex flex-col gap-3">
    {icon}
    <h1 className="font-literata text-xl font-normal md:text-2xl">
      {children}
    </h1>
    {sub && <p className={`text-base text-ink-muted ${subDesktopOnly ? "hidden md:block" : ""}`}>{sub}</p>}
  </div>
);

/** Primary ink pill. `arrow` adds the nested circular arrow used on the one main action. */
export const InkButton = ({
  children, arrow, className = "", ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { arrow?: boolean }) => (
  <button
    className={`group flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-base font-medium text-ink-fg transition-[transform,background-color,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-ink-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${className}`}
    {...rest}
  >
    {children}
    {arrow && (
      <span className="-mr-2 ml-1 flex size-7 items-center justify-center rounded-full bg-surface/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px">
        <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden>
          <path d="M200 64v104a8 8 0 0 1-16 0V83.3L69.7 197.7a8 8 0 0 1-11.4-11.4L172.7 72H88a8 8 0 0 1 0-16h104a8 8 0 0 1 8 8Z" />
        </svg>
      </span>
    )}
  </button>
);

export const QuietButton = ({
  tone = "plain", className = "", ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "plain" | "soft" }) => (
  <button
    className={`flex h-11 items-center justify-center rounded-full px-5 text-base font-medium transition-[transform,background-color,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${
      tone === "soft" ? "bg-field hover:bg-field-strong" : "hover:bg-field"
    } ${className}`}
    {...rest}
  />
);

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}

export const SelectField = ({ label, value, onChange, options, placeholder, disabled }: SelectFieldProps) => (
  <div className="flex min-w-0 flex-1 flex-col gap-2">
    <span className="text-sm font-medium">{label}</span>
    <Dropdown fullWidth label={label} placeholder={placeholder} disabled={disabled} selectedId={value} onSelect={onChange} items={options.map((o) => ({ id: o.value, name: o.label }))} />
  </div>
);

export const DetailRow = ({ label, value, total }: { label: string; value: ReactNode; total?: boolean }) => (
  <div className={`flex items-center gap-4 py-3 text-base ${total ? "border-t border-line font-medium" : ""}`}>
    <span className={`flex-1 ${total ? "" : "text-ink-muted"}`}>{label}</span>
    <span className="shrink-0 text-right">{value}</span>
  </div>
);

export const formatDate = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** The semester pass lasts four months from today. */
export const accessUntil = (from = new Date()) => {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 4);
  return d;
};
