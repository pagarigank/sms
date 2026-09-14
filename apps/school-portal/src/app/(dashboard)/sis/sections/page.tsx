'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { Plus, Users } from 'lucide-react';
import {
  Badge,
  Button,
  DataTable,
  StatusDot,
  statusToVariant,
  // ColumnDef from @sms/ui so it matches the DataTable prop type
  // (the workspace has duplicate react-table majors; this avoids variance errors).
  type ColumnDef,
} from '@sms/ui';

export default function SectionsPage() {
  const { currentTenantId, currentBranchId } = useTenantStore();

  const { data: sections, isLoading } = useQuery({
    queryKey: ['sections', currentTenantId, currentBranchId],
    queryFn: () => apiClient.sis.listSections({ tenantId: currentTenantId!, branchId: currentBranchId ?? undefined }),
    enabled: !!currentTenantId,
  });

  const sectionList: any[] = (sections?.data as any[]) ?? [];

  const columns: ColumnDef<any, any>[] = [
    {
      accessorKey: 'name',
      header: 'Section',
      cell: ({ row }) => (
        <span className="font-medium text-[hsl(var(--foreground))]">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'gradeLevelId',
      header: 'Grade Level',
      cell: ({ row }) => (
        <span className="text-[hsl(var(--ink-200))]">{row.original.gradeLevelId || '—'}</span>
      ),
    },
    {
      accessorKey: 'homeroom',
      header: 'Homeroom',
      cell: ({ row }) => (
        <span className="text-[hsl(var(--ink-200))]">{row.original.homeroom || '—'}</span>
      ),
    },
    {
      accessorKey: 'capacity',
      header: 'Capacity',
      cell: ({ row }) => (
        <span className="text-[hsl(var(--ink-200))]">{row.original.capacity} students</span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={statusToVariant(row.original.isActive)}>
          <StatusDot />
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: () => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="View section students">
            <Users className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sections</h1>
          <p className="text-muted-foreground">Manage class sections and capacity</p>
        </div>
        <Button disabled title="Section creation is coming soon">
          <Plus className="h-4 w-4" /> Add Section
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={sectionList}
        isLoading={isLoading}
        emptyMessage="No sections yet."
        emptyDescription="Create sections to organize students into homerooms."
      />
    </div>
  );
}
