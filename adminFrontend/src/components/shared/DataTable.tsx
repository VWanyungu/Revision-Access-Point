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
import { ChevronLeft, ChevronRight, FileX } from 'lucide-react';

const pagerButton = 'flex size-10 items-center justify-center rounded-full bg-field text-ink ring-1 ring-line transition-[background-color,transform] duration-300 hover:bg-field-strong active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
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
  keyExtractor: (item: T) => string;
  // Pagination Props
  meta?: PaginationMeta;
  onPageChange?: (page: number) => void;
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No data available',
  emptyIcon,
  keyExtractor,
  meta,
  onPageChange
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="rounded-3xl bg-surface ring-1 ring-line">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (data.length === 0 && !isLoading) {
    return (
      <div className="rounded-3xl bg-surface ring-1 ring-line">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        </Table>
        <div className="empty-state py-16 px-8">
          {emptyIcon || <FileX className="h-12 w-12 mb-4 text-muted-foreground/50" />}
          <p className="text-sm mt-6">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-surface ring-1 ring-line overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
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

      {meta && onPageChange && meta.lastPage > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between gap-4 px-2">
          <span className="text-sm tabular-nums text-ink-muted">
            {(meta.page - 1) * meta.pageSize + 1}–{Math.min(meta.page * meta.pageSize, meta.total)} of {meta.total}
          </span>
          <div className="flex items-center gap-2">
            <button aria-label="Previous page" disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)} className={pagerButton}><ChevronLeft size={16} /></button>
            <span className="min-w-[4.5rem] text-center text-sm tabular-nums text-ink">{meta.page} / {meta.lastPage}</span>
            <button aria-label="Next page" disabled={meta.page >= meta.lastPage} onClick={() => onPageChange(meta.page + 1)} className={pagerButton}><ChevronRight size={16} /></button>
          </div>
        </nav>
      )}
    </div>
  );
}
