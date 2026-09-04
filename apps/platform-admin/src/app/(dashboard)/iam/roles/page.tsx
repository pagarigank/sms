'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export default function RolesPage() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const { data: rolesRes } = useQuery({
    queryKey: ['iam-roles'],
    queryFn: () => apiClient.iam.listRoles(),
  });

  const { data: permissionsRes } = useQuery({
    queryKey: ['iam-permissions'],
    queryFn: () => apiClient.iam.listPermissions(),
  });

  const roles = rolesRes?.data ?? [];
  const permissions = permissionsRes?.data ?? [];

  // Group permissions by resource
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) acc[perm.resource] = [];
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, typeof permissions>);

  const resources = Object.keys(groupedPermissions).sort();
  const actions = ['view', 'create', 'edit', 'delete', 'approve', 'export'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
        <p className="text-muted-foreground">Configure roles and assign permissions using the matrix editor</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Roles List */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Roles</h2>
          <p className="text-sm text-muted-foreground">Select a role to edit its permissions</p>
          <div className="mt-4 space-y-2">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`w-full rounded-md border p-3 text-left transition-colors ${
                  selectedRole === role.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <p className="font-medium">{role.name}</p>
                <p className="text-xs opacity-70">{role.description}</p>
              </button>
            ))}
            {roles.length === 0 && (
              <p className="text-sm text-muted-foreground">No roles found</p>
            )}
          </div>
        </div>

        {/* Permission Matrix */}
        <div className="col-span-2 rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Permission Matrix</h2>
          <p className="text-sm text-muted-foreground">
            {selectedRole
              ? 'Toggle permissions for the selected role'
              : 'Select a role from the left to edit its permissions'}
          </p>

          {selectedRole ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left font-medium">Resource</th>
                    {actions.map((action) => (
                      <th key={action} className="px-3 py-2 text-center font-medium capitalize">
                        {action}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resources.map((resource) => (
                    <tr key={resource} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{resource}</td>
                      {actions.map((action) => {
                        const perm = groupedPermissions[resource]?.find(
                          (p) => p.action === action
                        );
                        return (
                          <td key={action} className="px-3 py-2 text-center">
                            {perm ? (
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300"
                                defaultChecked={true} // Would check against role_permissions
                                onChange={(e) => {
                                  // TODO: Call API to toggle permission
                                  console.log('Toggle', perm.id, e.target.checked);
                                }}
                              />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-8 text-center text-muted-foreground">
              <p>Select a role to view and edit its permissions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
