import { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, FileX } from 'lucide-react';
import type { Sort } from '@/hooks/useListParams';

const pagerButton = 'flex size-10 items-center justify-center rounded-full bg-field text-ink ring-1 ring-line transition-[background-color,transform] duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] hover:bg-field-strong active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none max-md:size-11';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
  /** Makes the header sortable. A database column when the server sorts, or a field of the row when the page sorts itself. */
  sortKey?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  lastPage: number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  /** Primary action shown in the empty state, e.g. Add. */
  emptyAction?: { label: string; onClick: () => void };
  /** True when a search or filter is active, so an empty result says so instead of "nothing yet". */
  filtered?: boolean;
  onResetFilters?: () => void;
  keyExtractor: (item: T) => string;
  sort?: Sort;
  onSortChange?: (sort: Sort) => void;
  // Pagination Props
  meta?: PaginationMeta;
  onPageChange?: (page: number) => void;
  /** Noun for the count line: "84 institutions". */
  noun?: string;
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'Nothing here yet.',
  emptyIcon,
  emptyAction,
  filtered = false,
  onResetFilters,
  keyExtractor,
  sort,
  onSortChange,
  meta,
  onPageChange,
  noun = 'results',
}: DataTableProps<T>) {
  const cycle = (key: string) => {
    if (!onSortChange) return;
    if (sort?.key !== key) onSortChange({ key, dir: 'asc' });
    else if (sort.dir === 'asc') onSortChange({ key, dir: 'desc' });
    else onSortChange(null);
  };

  const header = (
    <TableHeader>
      <TableRow className="bg-muted/50">
        {columns.map((column) => {
          const active = column.sortKey && sort?.key === column.sortKey ? sort : null;
          return (
            <TableHead key={column.key} className={column.className} aria-sort={active ? (active.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
              {column.sortKey && onSortChange ? (
                <button type="button" onClick={() => cycle(column.sortKey!)}
                  className="-mx-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors duration-300 hover:bg-field hover:text-ink motion-reduce:transition-none max-md:py-2.5">
                  {column.header}
                  {active ? (active.dir === 'asc' ? <ArrowUp aria-hidden className="size-3.5" /> : <ArrowDown aria-hidden className="size-3.5" />) : <ChevronsUpDown aria-hidden className="size-3.5 opacity-50" />}
                </button>
              ) : column.header}
            </TableHead>
          );
        })}
      </TableRow>
    </TableHeader>
  );

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-3xl bg-surface ring-1 ring-line" aria-busy="true">
        <Table>
          {header}
          <TableBody>
            {[...Array(5)].map((_, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    <Skeleton className="h-4 w-full motion-reduce:animate-none" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="overflow-hidden rounded-3xl bg-surface ring-1 ring-line">
        <Table>{header}</Table>
        <div className="empty-state px-8 py-16">
          {emptyIcon || <FileX className="mb-4 size-10 text-ink-subtle" />}
          {filtered ? (
            <>
              <p className="mt-2 text-base text-ink">Nothing matches your search or filters.</p>
              {onResetFilters && <Button variant="outline" className="mt-6" onClick={onResetFilters}>Reset filters</Button>}
            </>
          ) : (
            <>
              <p className="mt-2 text-base text-ink">{emptyMessage}</p>
              {emptyAction && <Button className="action-button mt-6" onClick={emptyAction.onClick}>{emptyAction.label}</Button>}
            </>
          )}
        </div>
      </div>
    );
  }

  const first = meta ? (meta.page - 1) * meta.pageSize + 1 : 1;
  const last = meta ? Math.min(meta.page * meta.pageSize, meta.total) : data.length;
  const total = meta?.total ?? data.length;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-3xl bg-surface ring-1 ring-line">
        <Table>
          {header}
          <TableBody>
            {data.map((item) => (
              <TableRow key={keyExtractor(item)} className="table-row-hover">
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.render
                      ? column.render(item)
                      : (item as Record<string, unknown>)[column.key] as ReactNode}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <nav aria-label="Pages" className="flex items-center justify-between gap-4 px-2">
        <span className="text-sm tabular-nums text-ink-muted">{first}–{last} of {total} {noun}</span>
        {meta && onPageChange && meta.lastPage > 1 && (
          <div className="flex items-center gap-2">
            <button aria-label="Previous page" disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)} className={pagerButton}><ChevronLeft size={16} /></button>
            <span className="min-w-[4.5rem] text-center text-sm tabular-nums text-ink">{meta.page} / {meta.lastPage}</span>
            <button aria-label="Next page" disabled={meta.page >= meta.lastPage} onClick={() => onPageChange(meta.page + 1)} className={pagerButton}><ChevronRight size={16} /></button>
          </div>
        )}
      </nav>
    </div>
  );
}
