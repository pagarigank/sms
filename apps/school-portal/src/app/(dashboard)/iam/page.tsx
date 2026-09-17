'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { Plus, Search, ShieldCheck, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  DataTable,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  statusToVariant,
  useConfirm,
  useToast,
} from '@sms/ui';
import { ColumnDef } from '@tanstack/react-table';

/**
 * FR-CFG-1 — Roles & Permissions builder. Roles are tenant-scoped: create a
 * role, then grant it permissions from the catalog. Platform Super Admin and
 * other system roles cannot be edited here (isSystem rows are read-only).
 */

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

export default function IAMPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { currentTenantId } = useTenantStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [managing, setManaging] = useState<Role | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);

  const { data: rolesRes, isLoading } = useQuery({
    queryKey: ['iam-roles', currentTenantId],
    queryFn: () => apiClient.iam.listRoles({ tenantId: currentTenantId ?? undefined }),
  });
  const roles: Role[] = rolesRes?.data ?? [];

  const { data: permissionsRes } = useQuery({
    queryKey: ['iam-permissions'],
    queryFn: () => apiClient.iam.listPermissions(),
  });
  const permissions: Permission[] = permissionsRes?.data ?? [];

  // Group the catalog by resource for a module×action matrix (frontend.md §6).
  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of permissions) {
      const list = map.get(p.resource) ?? [];
      list.push(p);
      map.set(p.resource, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  // Permissions currently granted to the role being managed. The backend
  // returns `{ permissions: [...] }` (not an array) — unwrap defensively.
  const { data: rolePermsRes, isLoading: rolePermsLoading } = useQuery({
    queryKey: ['iam-role-permissions', managing?.id],
    queryFn: () => apiClient.iam.getRolePermissions(managing!.id),
    enabled: !!managing,
  });
  const grantedIds = useMemo(() => {
    const d = rolePermsRes?.data as unknown;
    const list: { id: string }[] = Array.isArray(d)
      ? (d as { id: string }[])
      : Array.isArray((d as any)?.permissions)
        ? (d as any).permissions
        : [];
    return new Set(list.map((p) => p.id));
  }, [rolePermsRes]);
  // Sync the working selection when the granted set loads or the dialog opens.
  const [selectionSyncedFor, setSelectionSyncedFor] = useState<string | null>(null);
  if (managing && grantedIds.size >= 0 && selectionSyncedFor !== managing.id && !rolePermsLoading) {
    setSelectedPermissionIds([...grantedIds]);
    setSelectionSyncedFor(managing.id);
  }

  const createRoleMutation = useMutation({
    mutationFn: (data: typeof newRole) =>
      apiClient.iam.createRole({ ...data, tenantId: currentTenantId ?? '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam-roles'] });
      setShowCreate(false);
      setNewRole({ name: '', description: '' });
      toast({ title: 'Role created', description: 'Grant it permissions next.' });
    },
    onError: (error: Error) =>
      toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: (vars: { roleId: string; permissionIds: string[] }) =>
      apiClient.iam.updateRolePermissions(vars.roleId, vars.permissionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam-role-permissions'] });
      setManaging(null);
      toast({ title: 'Permissions saved' });
    },
    onError: (error: Error) =>
      toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) => apiClient.iam.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam-roles'] });
      toast({ title: 'Role deleted' });
    },
    onError: (error: Error) =>
      toast({ title: 'Cannot delete role', description: error.message, variant: 'destructive' }),
  });

  const filteredRoles = searchQuery.trim()
    ? roles.filter((r) => `${r.name} ${r.description ?? ''}`.toLowerCase().includes(searchQuery.toLowerCase()))
    : roles;

  const columns: ColumnDef<any, any>[] = [
    {
      accessorKey: 'name',
      header: 'Role',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </span>
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.description || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'isSystem',
      header: 'Type',
      cell: ({ row }) =>
        row.original.isSystem ? (
          <Badge variant="info">System</Badge>
        ) : (
          <Badge variant="neutral">Custom</Badge>
        ),
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => {
        const role = row.original as Role;
        return (
          <div className="flex justify-end gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setManaging(role);
                setSelectionSyncedFor(null);
              }}
            >
              Permissions
            </Button>
            {!role.isSystem && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-[hsl(var(--status-danger-ink))] hover:text-[hsl(var(--status-danger-ink))]"
                aria-label={`Delete ${role.name}`}
                onClick={async () => {
                  const ok = await confirm({
                    title: `Delete ${role.name}?`,
                    description: 'Users with this role keep it until reassigned.',
                    confirmLabel: 'Delete',
                    destructive: true,
                  });
                  if (ok) deleteRoleMutation.mutate(role.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roles &amp; Permissions</h1>
          <p className="text-muted-foreground">Manage tenant roles and permission assignments</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> New Role
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search roles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <DataTable
        columns={columns as any}
        data={filteredRoles}
        isLoading={isLoading}
        emptyMessage="No roles found."
        emptyDescription="Create a custom role, then grant it permissions from the catalog."
      />

      <div className="rounded-lg border bg-card shadow-sm">
        <div className="border-b p-4">
          <h2 className="font-semibold">Permission Catalog</h2>
          <p className="text-sm text-muted-foreground">
            {permissions.length} permissions across {grouped.length} modules — open a role&apos;s
            permissions to assign them
          </p>
        </div>
        <div className="max-h-96 space-y-3 overflow-y-auto p-4">
          {grouped.map(([resource, perms]) => (
            <div key={resource}>
              <p className="mb-1 font-mono text-xs font-medium text-muted-foreground">{resource}</p>
              <div className="flex flex-wrap gap-1">
                {perms.map((p) => (
                  <Badge key={p.id} variant="outline">
                    {p.action}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create role */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Role</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createRoleMutation.mutate(newRole);
            }}
            className="mt-2 space-y-3"
          >
            <div>
              <Label htmlFor="role-name">Name</Label>
              <Input
                id="role-name"
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                placeholder="e.g. Collections Supervisor"
                required
              />
            </div>
            <div>
              <Label htmlFor="role-desc">Description</Label>
              <Input
                id="role-desc"
                value={newRole.description}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                placeholder="What this role can do"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRoleMutation.isPending}>
                {createRoleMutation.isPending ? 'Creating…' : 'Create role'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Permission matrix per role */}
      <Dialog open={!!managing} onOpenChange={(open) => !open && setManaging(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Permissions — {managing?.name}</DialogTitle>
          </DialogHeader>
          <div className="mt-2 max-h-[24rem] space-y-3 overflow-y-auto">
            {grouped.map(([resource, perms]) => (
              <div key={resource} className="rounded-md border p-3">
                <p className="mb-2 font-mono text-xs font-medium text-muted-foreground">{resource}</p>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {perms.map((p) => {
                    const idx = selectedPermissionIds.indexOf(p.id);
                    const checked = idx >= 0;
                    return (
                      <label key={p.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setSelectedPermissionIds((prev) =>
                              e.target.checked
                                ? [...prev, p.id]
                                : prev.filter((id) => id !== p.id),
                            )
                          }
                        />
                        {p.action}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManaging(null)}>
              Cancel
            </Button>
            <Button
              disabled={updatePermissionsMutation.isPending || !managing}
              onClick={() =>
                managing &&
                updatePermissionsMutation.mutate({
                  roleId: managing.id,
                  permissionIds: selectedPermissionIds,
                })
              }
            >
              {updatePermissionsMutation.isPending ? 'Saving…' : 'Save permissions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
