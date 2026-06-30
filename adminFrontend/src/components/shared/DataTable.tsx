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
import { FileX } from 'lucide-react';

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
      <div className="rounded-lg border bg-card">
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
      <div className="rounded-lg border bg-card">
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
      <div className="rounded-lg border bg-card overflow-hidden">
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

      {/* Pagination Controls */}
      {meta && onPageChange && (
        <div className="flex flex-col items-start gap-3 px-2">
          <div className="flex items-center w-full justify-between">
            <button
              className="px-3 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => onPageChange(meta.page - 1)}
              disabled={meta.page <= 1}
            >
              Previous
            </button>
            <div className="text-sm font-medium">
              Page {meta.page} of {meta.lastPage}
            </div>
            <button
              className="px-3 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => onPageChange(meta.page + 1)}
              disabled={meta.page >= meta.lastPage}
            >
              Next
            </button>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {((meta.page - 1) * meta.pageSize) + 1} to {Math.min(meta.page * meta.pageSize, meta.total)} of {meta.total} entries
            {/* {meta.total} entries */}
          </div>
        </div>
      )}
    </div>
  );
}
