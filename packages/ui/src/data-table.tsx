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

      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-raised))] shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-[hsl(var(--surface-input))] border-b-2 border-[hsl(var(--border-strong))]">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b border-[hsl(var(--border))] hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const canSort = sortable && header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        'text-xs font-bold uppercase tracking-wider text-[hsl(var(--ink-100))]',
                        cellPadding
                      )}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-bold text-[hsl(var(--ink-100))] transition-colors hover:text-[hsl(var(--accent))] hover:bg-[hsl(var(--surface-raised))] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--accent))]"
                          aria-label={`Sort by ${typeof header.column.columnDef.header === 'string' ? header.column.columnDef.header : header.id}`}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sortDir === 'asc' ? (
                            <ChevronUp className="h-3.5 w-3.5 text-[hsl(var(--accent))]" aria-hidden="true" />
                          ) : sortDir === 'desc' ? (
                            <ChevronDown className="h-3.5 w-3.5 text-[hsl(var(--accent))]" aria-hidden="true" />
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 text-[hsl(var(--ink-200))] opacity-80 group-hover:opacity-100" aria-hidden="true" />
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
                <TableRow key={`sk-${i}`} className="border-b border-[hsl(var(--border))]">
                  {Array.from({ length: colCount }).map((__, j) => (
                    <TableCell key={`sk-${i}-${j}`} className={cellPadding}>
                      <Skeleton className="h-4 w-full max-w-[160px] animate-pulse" />
                      {j === 0 && <Skeleton className="mt-2 h-3 w-24 animate-pulse opacity-60" />}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    'border-b border-[hsl(var(--border))] transition-colors duration-150',
                    'hover:bg-[hsl(var(--accent)/0.04)]',
                    onRowClick && 'cursor-pointer hover:bg-[hsl(var(--accent)/0.08)]'
                  )}
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
                <TableCell colSpan={colCount} className={cn('h-48', cellPadding)}>
                  <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                    <p className="text-sm font-medium text-[hsl(var(--ink-100))]">{emptyMessage}</p>
                    {emptyDescription && (
                      <p className="max-w-sm text-xs text-[hsl(var(--ink-300))] leading-relaxed">{emptyDescription}</p>
                    )}
                    {emptyAction && <div className="mt-3">{emptyAction}</div>}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && canPaginate && (
        <div className="flex flex-col items-center justify-between gap-3 px-1.5 py-1 sm:flex-row">
          <p className="text-xs text-[hsl(var(--ink-300))]">
            {showingRange ?? `Page ${pagination.pageIndex + 1} of ${pageCountSafe}`}
          </p>
          <div className="flex items-center gap-1.5">
            <Select
              value={String(pageSize)}
              onValueChange={(v) =>
                onPaginationChange?.({ pageIndex: 0, pageSize: Number(v) })
              }
            >
              <SelectTrigger className="h-8 w-[80px] rounded-lg text-xs bg-[hsl(var(--surface-raised))] border-[hsl(var(--border))]" aria-label="Rows per page">
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
            <div className="flex items-center rounded-lg border border-[hsl(var(--border-strong))] bg-[hsl(var(--surface-raised))] p-0.5 shadow-xs">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md border-0 bg-transparent text-[hsl(var(--ink-100))] hover:bg-[hsl(var(--surface-input))] hover:text-[hsl(var(--accent))] disabled:opacity-30 shadow-none"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                aria-label="First page"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md border-0 bg-transparent text-[hsl(var(--ink-100))] hover:bg-[hsl(var(--surface-input))] hover:text-[hsl(var(--accent))] disabled:opacity-30 shadow-none"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md border-0 bg-transparent text-[hsl(var(--ink-100))] hover:bg-[hsl(var(--surface-input))] hover:text-[hsl(var(--accent))] disabled:opacity-30 shadow-none"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Next page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md border-0 bg-transparent text-[hsl(var(--ink-100))] hover:bg-[hsl(var(--surface-input))] hover:text-[hsl(var(--accent))] disabled:opacity-30 shadow-none"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                aria-label="Last page"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { DataTable };
export type { ColumnDef } from '@tanstack/react-table';
