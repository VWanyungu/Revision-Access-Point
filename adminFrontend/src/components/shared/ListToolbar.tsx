import { ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { InstitutionFilter } from '@/components/shared/InstitutionFilter';

interface ListToolbarProps {
  search: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  /** Number of matches; shown while a search or filter is active. */
  resultCount?: number;
  institutionId?: number;
  onInstitution?: (id: number) => void;
  /** Extra filters (a school, unit or type picker). */
  children?: ReactNode;
  /** True when any filter or search is active, so Reset shows. */
  active: boolean;
  onReset: () => void;
}

/** Search with a clear button, the institution filter, any page-specific filters, and a way back to everything. */
export const ListToolbar = ({ search, onSearch, placeholder = 'Search', resultCount, institutionId, onInstitution, children, active, onReset }: ListToolbarProps) => (
  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
    <div className="relative w-full sm:w-72">
      <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
      <Input type="search" aria-label={placeholder} placeholder={placeholder} value={search} onChange={(e) => onSearch(e.target.value)}
        className="rounded-full bg-field pl-10 pr-10 ring-1 ring-line [&::-webkit-search-cancel-button]:hidden" />
      {search && (
        <button type="button" aria-label="Clear search" onClick={() => onSearch('')}
          className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted transition-[background-color,transform] duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] hover:bg-field-strong hover:text-ink active:scale-[0.96] motion-reduce:transition-none max-md:size-10">
          <X className="size-4" />
        </button>
      )}
    </div>
    {onInstitution && <div className="w-full sm:w-56"><InstitutionFilter value={institutionId ?? 0} onChange={onInstitution} /></div>}
    {children}
    {active && (
      <div className="flex items-center gap-3">
        {resultCount !== undefined && <span role="status" className="text-sm tabular-nums text-ink-muted">{resultCount} {resultCount === 1 ? 'result' : 'results'}</span>}
        <Button type="button" variant="ghost" size="sm" onClick={onReset} className="max-md:h-11">Reset filters</Button>
      </div>
    )}
  </div>
);
