import type { ReactNode } from "react";
import { House } from "@phosphor-icons/react";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export interface Crumb { label: string; onClick?: () => void }

interface Props {
  /** Home icon target (where the user came from). */
  onHome: () => void;
  /** Ancestors, shown as chips. A chip without `onClick` is plain text. */
  trail: Crumb[];
  /** The page you are on, in the accent colour. */
  current: string;
  /** Optional trailing slot, e.g. a countdown. */
  right?: ReactNode;
}

const chip = "block max-w-[14rem] truncate rounded-full bg-field px-3.5 py-1.5 text-base text-ink";

/** Floating breadcrumb card: home icon, then chip / chip / current page. Same width and floating look as the main navbar. */
const PageCrumbs = ({ onHome, trail, current, right }: Props) => (
  <div className="px-3 pt-3 font-geist md:px-6">
    <Breadcrumb className="mx-auto flex w-full max-w-3xl items-center gap-3 rounded-full bg-surface/85 p-1.5 pr-5 shadow-[0_8px_30px_-14px_rgba(14,21,37,0.18)] ring-1 ring-line backdrop-blur-xl">
      <BreadcrumbList className="no-scrollbar min-w-0 flex-1 flex-nowrap gap-2 overflow-x-auto text-base text-ink-muted sm:gap-2">
        <BreadcrumbItem>
          <button type="button" onClick={onHome} aria-label="Back" className="flex size-9 items-center justify-center rounded-full text-ink transition-colors duration-300 hover:bg-field">
            <House size={20} />
          </button>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        {trail.map((c, i) => (
          <BreadcrumbItem key={i} className="min-w-0 shrink-0 gap-2">
            {c.onClick ? (
              <BreadcrumbLink asChild><button type="button" onClick={c.onClick} className={`${chip} transition-colors duration-300 hover:bg-field-strong`}>{c.label}</button></BreadcrumbLink>
            ) : (
              <span className={chip}>{c.label}</span>
            )}
            <BreadcrumbSeparator className="px-0.5 text-ink-muted">/</BreadcrumbSeparator>
          </BreadcrumbItem>
        ))}
        <BreadcrumbItem className="shrink-0">
          <BreadcrumbPage className="font-medium text-brand">{current}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
      {right}
    </Breadcrumb>
  </div>
);

export default PageCrumbs;
