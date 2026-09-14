'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { UserPlus, Search, Users } from 'lucide-react';
import {
  Badge,
  // Import ColumnDef from @sms/ui so it matches the DataTable prop type
  // (the workspace has duplicate react-table majors; this avoids variance errors).
  type ColumnDef,
  Button,
  DataTable,
  Input,
  StatusDot,
  statusToVariant,
} from '@sms/ui';

export default function EnrollmentsPage() {
  const { currentTenantId, currentBranchId } = useTenantStore();
  const [search, setSearch] = useState('');

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['enrollments', currentTenantId, currentBranchId],
    queryFn: () => apiClient.sis.listEnrollments({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });

  const filtered = ((enrollments?.data as any[]) ?? []).filter((e: any) =>
    `${e.studentId} ${e.schoolYearId}`.toLowerCase().includes(search.toLowerCase())
  );

  const columns: ColumnDef<any, any>[] = [
    {
      accessorKey: 'studentId',
      header: 'Student',
      cell: ({ row }) => (
        <span className="font-medium text-[hsl(var(--foreground))]">{row.original.studentId}</span>
      ),
    },
    {
      accessorKey: 'schoolYearId',
      header: 'School Year',
      cell: ({ row }) => (
        <span className="text-[hsl(var(--ink-200))]">{row.original.schoolYearId}</span>
      ),
    },
    {
      accessorKey: 'sectionId',
      header: 'Section',
      cell: ({ row }) => (
        <span className="text-[hsl(var(--ink-200))]">{row.original.sectionId || '—'}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={statusToVariant(row.original.status)}>
          <StatusDot />
          {row.original.status
            ? row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)
            : 'Unknown'}
        </Badge>
      ),
    },
    {
      accessorKey: 'enrolledAt',
      header: 'Enrolled At',
      cell: ({ row }) => (
        <span className="text-[hsl(var(--ink-200))]">
          {row.original.enrolledAt ? new Date(row.original.enrolledAt).toLocaleDateString() : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enrollments</h1>
          <p className="text-muted-foreground">Manage student enrollments</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/sis/enrollments/wizard">
              <UserPlus className="h-4 w-4" /> Enrollment Wizard
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/sis/enrollments/batch">
              <Users className="h-4 w-4" /> Batch Re-enroll
            </Link>
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        toolbar={
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search enrollments..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                className="pl-10"
                aria-label="Search enrollments"
              />
            </div>
          </div>
        }
        emptyMessage="No enrollments found."
        emptyDescription="Use the Enrollment Wizard to enroll a student into a school year."
        emptyAction={
          <Button size="sm" asChild>
            <Link href="/sis/enrollments/wizard">
              <UserPlus className="h-4 w-4" /> Open Enrollment Wizard
            </Link>
          </Button>
        }
      />
    </div>
  );
}
