'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useToast, useConfirm, Badge, statusToVariant, StatusDot } from '@sms/ui';
import { Plus, Save, Search, Filter, Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@sms/ui';
import { Button } from '@sms/ui';
import { Input } from '@sms/ui';
import { Label } from '@sms/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sms/ui';
import { Checkbox } from '@sms/ui';
import { cn } from '@sms/utils';

interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
}

interface Permission {
  id: string;
  resource: string;
  action: string;
  description?: string;
}

interface RolePermission {
  roleId: string;
  permissionId: string;
}

export default function RolesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', tenantId: '' });

  const { data: rolesRes } = useQuery({
    queryKey: ['iam-roles'],
    queryFn: () => apiClient.iam.listRoles(),
  });

  const { data: permissionsRes } = useQuery({
    queryKey: ['iam-permissions'],
    queryFn: () => apiClient.iam.listPermissions(),
  });

  const { data: rolePermissionsRes } = useQuery({
    queryKey: ['iam-role-permissions', selectedRole],
    queryFn: async () => {
      if (!selectedRole) return { data: [] };
      return apiClient.iam.getRolePermissions(selectedRole);
    },
    enabled: !!selectedRole,
  });

  const roles: Role[] = rolesRes?.data ?? [];
  const permissions: Permission[] = permissionsRes?.data ?? [];
  const rolePermissions: RolePermission[] = rolePermissionsRes?.data ?? [];

  // Group permissions by resource
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) acc[perm.resource] = [];
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, typeof permissions>);

  const resources = Object.keys(groupedPermissions).sort();
  const actions = ['view', 'create', 'edit', 'delete', 'approve', 'export'];

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiClient.iam.createRole({ ...data, tenantId: data.tenantId || 'current-tenant' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam-roles'] });
      setShowCreate(false);
      setForm({ name: '', description: '', tenantId: '' });
      toast({ title: 'Role created', description: 'Role has been created successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
      apiClient.iam.updateRolePermissions(roleId, permissionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam-role-permissions', selectedRole] });
      toast({ title: 'Permissions updated', description: 'Role permissions have been saved.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.iam.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam-roles'] });
      setSelectedRole(null);
      toast({ title: 'Role deleted', description: 'Role has been deleted.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const hasPermission = (permissionId: string) => rolePermissions.some(rp => rp.permissionId === permissionId);

  const handleTogglePermission = (permissionId: string) => {
    const newPermissions = hasPermission(permissionId)
      ? rolePermissions.filter(rp => rp.permissionId !== permissionId)
      : [...rolePermissions, { roleId: selectedRole!, permissionId }];
    updatePermissionsMutation.mutate({
      roleId: selectedRole!,
      permissionIds: newPermissions.map(rp => rp.permissionId),
    });
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
            <p className="text-muted-foreground">Configure roles and assign permissions using the matrix editor</p>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button>
                <span className="flex items-center space-x-1">
                  <Plus className="h-4 w-4" />
                  <span>New Role</span>
                </span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Role</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Branch Admin"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Role description"
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Roles List */}            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-raised))]">
            <div className="p-4 border-b border-[hsl(var(--border))]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--ink-300))]" />
                <Input
                  placeholder="Search roles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>              <div className="p-4 space-y-2">
              {roles
                .filter((role) =>
                  role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  role.description?.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}                  className={cn(
                      'w-full rounded-md border p-3 text-left transition-colors',
                      selectedRole === role.id
                        ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent-subtle))] text-[hsl(var(--accent-ink))]'
                        : 'border-transparent hover:bg-[hsl(var(--surface-muted))]'
                  )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[hsl(var(--ink-100))]">{role.name}</p>
                        <p className="text-xs text-[hsl(var(--ink-300))]">{role.description || 'No description'}</p>
                      </div>
                      {role.isSystem && (
                        <span className="rounded-full bg-[hsl(var(--surface-muted))] px-1.5 py-0.5 text-xs font-medium text-[hsl(var(--ink-300))]">System</span>
                      )}
                    </div>
                  </button>
                ))}
              {roles.length === 0 && (
                <p className="px-4 py-4 text-sm text-[hsl(var(--ink-300))] text-center">No roles found</p>
              )}
            </div>
          </div>

          {/* Permission Matrix */}
          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-raised))]">
            <div className="p-4 border-b border-[hsl(var(--border))]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[hsl(var(--ink-100))]">Permission Matrix</h2>
                  <p className="text-sm text-[hsl(var(--ink-300))]">
                    {selectedRole
                      ? `Editing permissions for ${roles.find(r => r.id === selectedRole)?.name}`
                      : 'Select a role from the left to edit its permissions'}
                  </p>
                </div>
              </div>

              {selectedRole ? (
                <div className="p-4">
                  <div className="flex items-center gap-4 mb-4">
                    <Input
                      placeholder="Filter permissions..."
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-64"
                    />
                    <Button
                      onClick={() => {
                        const allPermissions = permissions.map(p => p.id);
                        updatePermissionsMutation.mutate({
                          roleId: selectedRole!,
                          permissionIds: allPermissions,
                        });
                      }}
                      className="ml-auto"
                    >
                      <span className="flex items-center space-x-1">
                        <Shield className="h-4 w-4" />
                        <span>Select All</span>
                      </span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        updatePermissionsMutation.mutate({ roleId: selectedRole!, permissionIds: [] });
                      }}
                    >
                      <span className="flex items-center space-x-1">
                        <span>Clear All</span>
                      </span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        const ok = await confirm({
                          title: 'Delete this role?',
                          description: 'This action cannot be undone.',
                          confirmLabel: 'Delete',
                          destructive: true,
                        });
                        if (ok) deleteMutation.mutate(selectedRole!);
                      }}
                      className="text-[hsl(var(--status-danger-ink))] hover:text-[hsl(var(--status-danger-ink))]"
                    >
                      Delete Role
                    </Button>
                  </div>

                  <div className="rounded-lg border border-[hsl(var(--border))] overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-[hsl(var(--border))]">
                          <th className="px-3 py-2 text-left font-medium text-[hsl(var(--ink-200))] w-48">Resource</th>
                          {actions.map((action) => (
                            <th key={action} className="px-3 py-2 text-center font-medium capitalize text-[hsl(var(--ink-300))] w-24">
                              {action}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {resources
                          .filter((resource) =>
                            resource.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .map((resource) => (
                            <tr key={resource} className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--surface-muted))]">
                              <td className="px-3 py-2 font-medium text-[hsl(var(--ink-100))]">{resource}</td>
                              {actions.map((action) => {
                                const perm = groupedPermissions[resource]?.find(
                                  (p) => p.action === action
                                );
                                return (
                                  <td key={action} className="px-3 py-2 text-center">
                                    {perm ? (
                                      <Checkbox
                                        checked={hasPermission(perm.id)}
                                        onCheckedChange={() => handleTogglePermission(perm.id)}
                                        aria-label={`${action} ${resource}`}
                                      />
                                    ) : (
                                      <span className="text-[hsl(var(--ink-300))]">—</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-[hsl(var(--ink-300))]">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Select a role to view and edit its permissions</p>
                  <p className="text-sm">Click on a role from the list to configure its permission matrix</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}