'use client';

import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type PaginationState,
  type SortingState,
  type Updater,
} from '@tanstack/react-table';
import { cn } from '@sms/utils';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';
import { Skeleton } from './skeleton';
import { Button } from './button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

interface DataTableProps<TData, TValue = any> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pagination?: PaginationState;
  pageCount?: number;
  totalRows?: number;
  onPaginationChange?: (updater: Updater<PaginationState>) => void;
  /** Client-side sort. Ignored when a server-driven `sorting`/`onSortingChange` pair is given. */
  sortable?: boolean;
  sorting?: SortingState;
  onSortingChange?: (updater: Updater<SortingState>) => void;
  /** Renders a search box / filters row above the table. */
  toolbar?: React.ReactNode;
  /** Minimum row height; "compact" fits ~20% more rows on screen. */
  density?: 'default' | 'compact';
  /** Called with the row value when a body row is clicked (rows become cursor-pointer). */
  onRowClick?: (row: TData) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  /** Rendered in the last column of the empty state to guide first-use. */
  emptyAction?: React.ReactNode;
  className?: string;
}

function DataTable<TData, TValue>({
  columns,
  data,
  pagination,
  pageCount,
  totalRows,
  onPaginationChange,
  sortable = true,
  sorting: sortingProp,
  onSortingChange,
  toolbar,
  density = 'default',
  onRowClick,
  isLoading,
  emptyMessage = 'No data found.',
  emptyDescription,
  emptyAction,
  className,
}: DataTableProps<TData, TValue>) {
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([]);
  const sorting = sortingProp ?? internalSorting;
  const handleSortingChange: (updater: Updater<SortingState>) => void =
    onSortingChange ?? setInternalSorting;

  const table = useReactTable({
    data,
    columns,
    pageCount: pageCount ?? -1,
    state: {
      pagination,
      // Only feed sorting state to the table when client-side sorting is on,
      // so server-driven pages don't get silently re-sorted.
      ...(sortingProp || onSortingChange || sortable ? { sorting } : {}),
    },
    onSortingChange: sortable || onSortingChange ? handleSortingChange : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: sortable || onSortingChange ? getSortedRowModel() : undefined,
    manualPagination: true,
    enableSorting: sortable || !!onSortingChange,
  });

  const colCount = columns.length;
  const pageSize = pagination?.pageSize ?? 10;
  const rowsOnPage = table.getRowModel().rows.length;
  const showingRange =
    totalRows != null && pagination
      ? `${pagination.pageIndex * pageSize + 1}–${pagination.pageIndex * pageSize + rowsOnPage} of ${totalRows}`
      : null;
  const canPaginate = !!pagination && (onPaginationChange != null || pageCount != null);
  const pageCountSafe = pageCount ?? Math.max(1, Math.ceil((totalRows ?? rowsOnPage) / pageSize));

  const cellPadding = density === 'compact' ? 'px-3 py-2' : undefined;

  return (
    <div className={cn('space-y-3', className)}>
      {toolbar && <div>{toolbar}</div>}

      <div className="rounded-lg border bg-[hsl(var(--surface-raised))] shadow-sm">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-[hsl(var(--surface-muted))]/90 backdrop-blur">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const canSort = sortable && header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        'text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--ink-300))]',
                        cellPadding
                      )}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 rounded transition-colors hover:text-[hsl(var(--foreground))]"
                          aria-label={`Sort by ${typeof header.column.columnDef.header === 'string' ? header.column.columnDef.header : header.id}`}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sortDir === 'asc' ? (
                            <ChevronUp className="h-3 w-3" aria-hidden="true" />
                          ) : sortDir === 'desc' ? (
                            <ChevronDown className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden="true" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: colCount }).map((__, j) => (
                    <TableCell key={`sk-${i}-${j}`} className={cellPadding}>
                      <Skeleton className="h-4 w-full max-w-[160px]" />
                      {j === 0 && <Skeleton className="mt-1.5 h-3 w-24" />}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn('transition-colors', onRowClick && 'cursor-pointer')}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cellPadding}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={colCount} className={cn('h-40', cellPadding)}>
                  <div className="flex flex-col items-center justify-center gap-1.5 py-8 text-center">
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">{emptyMessage}</p>
                    {emptyDescription && (
                      <p className="max-w-sm text-sm text-[hsl(var(--ink-300))]">{emptyDescription}</p>
                    )}
                    {emptyAction && <div className="mt-2">{emptyAction}</div>}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && canPaginate && (
        <div className="flex flex-col items-center justify-between gap-2 px-1 sm:flex-row">
          <p className="text-sm text-[hsl(var(--ink-300))]">
            {showingRange ?? `Page ${pagination.pageIndex + 1} of ${pageCountSafe}`}
          </p>
          <div className="flex items-center gap-1">
            <Select
              value={String(pageSize)}
              onValueChange={(v) =>
                onPaginationChange?.({ pageIndex: 0, pageSize: Number(v) })
              }
            >
              <SelectTrigger className="h-8 w-[70px] text-xs" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              aria-label="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              aria-label="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export { DataTable };
export type { ColumnDef } from '@tanstack/react-table';
