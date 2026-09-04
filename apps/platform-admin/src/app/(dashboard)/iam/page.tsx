'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export default function IAMPage() {
  const { data: roles } = useQuery({
    queryKey: ['iam-roles'],
    queryFn: () => apiClient.iam.listRoles(),
  });

  const { data: permissions } = useQuery({
    queryKey: ['iam-permissions'],
    queryFn: () => apiClient.iam.listPermissions(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
        <p className="text-muted-foreground">Manage the platform permission catalog</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Roles</h2>
          <p className="text-sm text-muted-foreground">System roles available across tenants</p>
          <div className="mt-4 space-y-2">
            {roles?.data?.map((role) => (
              <div key={role.id} className="flex items-center justify-between rounded-md border p-3">
                <span className="font-medium">{role.name}</span>
                <span className="text-xs text-muted-foreground">{role.description}</span>
              </div>
            )) ?? (
              <p className="text-sm text-muted-foreground">No roles loaded</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Permission Catalog</h2>
          <p className="text-sm text-muted-foreground">Available permissions for role assignment</p>
          <div className="mt-4 max-h-96 space-y-1 overflow-y-auto">
            {permissions?.data?.map((perm) => (
              <div key={perm.id} className="flex items-center justify-between rounded border p-2 text-sm">
                <span className="font-mono text-xs">{perm.resource}:{perm.action}</span>
                <span className="text-muted-foreground">{perm.description}</span>
              </div>
            )) ?? (
              <p className="text-sm text-muted-foreground">No permissions loaded</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
