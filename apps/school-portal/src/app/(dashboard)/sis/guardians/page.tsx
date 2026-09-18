'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { UserPlus, Search } from 'lucide-react';
import {
  Badge,
  Button,
  DataTable,
  Input,
  PageHeader,
  useToast,
  // ColumnDef from @sms/ui so it matches the DataTable prop type
  // (the workspace has duplicate react-table majors; this avoids variance errors).
  type ColumnDef,
} from '@sms/ui';

export default function GuardiansPage() {
  const { currentTenantId } = useTenantStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');

  const { data: guardians, isLoading } = useQuery({
    queryKey: ['guardians', currentTenantId],
    queryFn: () => apiClient.sis.listGuardians({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });

  const filtered = ((guardians?.data as any[]) ?? []).filter((g: any) =>
    `${g.firstName} ${g.lastName} ${g.email} ${g.contactNumber}`.toLowerCase().includes(search.toLowerCase())
  );

  const columns: ColumnDef<any, any>[] = [
    {
      accessorKey: 'lastName',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-medium text-[hsl(var(--foreground))]">
          {row.original.lastName}, {row.original.firstName} {row.original.middleName || ''}
        </span>
      ),
    },
    {
      accessorKey: 'contactNumber',
      header: 'Contact',
      cell: ({ row }) => (
        <span className="text-[hsl(var(--ink-200))]">{row.original.contactNumber || '—'}</span>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <span className="text-[hsl(var(--ink-200))]">{row.original.email || '—'}</span>
      ),
    },
    {
      accessorKey: 'relationshipToStudent',
      header: 'Relationship',
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.relationshipToStudent || '—'}</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guardians"
        description="Manage parent/guardian records"
        actions={
          <Button disabled title="Guardian creation is managed through admissions and student records">
            <UserPlus className="h-4 w-4" /> Add Guardian
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        toolbar={
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search guardians..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                aria-label="Search guardians"
              />
            </div>
          </div>
        }
        emptyMessage="No guardians found."
        emptyDescription="Guardians are typically created during admissions or linked from student records."
      />
    </div>
  );
}
