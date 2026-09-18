'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore, useAuthStore } from '@/lib/store';
import {
  Plus, Search, ShieldCheck, Trash2, UserCog, Users, KeyRound,
  Lock, Unlock, Power, PowerOff, Eye, EyeOff,
} from 'lucide-react';
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
  useConfirm,
  useToast,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@sms/ui';
import { ColumnDef } from '@tanstack/react-table';

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

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  phone?: string;
  status: string;
  tenantId: string;
  mfaEnabled?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

type Tab = 'users' | 'roles';

export default function IAMPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { currentTenantId } = useTenantStore();
  const currentUser = useAuthStore((s) => s.user);
  const isSuperAdmin = currentUser && !currentUser.tenantId;

  const [activeTab, setActiveTab] = useState<Tab>('users');

  // ── Users State ──────────────────────────────────────────────────
  const [userSearch, setUserSearch] = useState('');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState<User | null>(null);
  const [showRoleAssign, setShowRoleAssign] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [assignedRoleIds, setAssignedRoleIds] = useState<string[]>([]);

  const [userForm, setUserForm] = useState({
    email: '', password: '', firstName: '', lastName: '', middleName: '', phone: '', tenantId: '',
  });
  const [newUserRoleIds, setNewUserRoleIds] = useState<string[]>([]);
  const [newUserEmployeeId, setNewUserEmployeeId] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // ── Roles State ──────────────────────────────────────────────────
  const [roleSearch, setRoleSearch] = useState('');
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [managing, setManaging] = useState<Role | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [selectionSyncedFor, setSelectionSyncedFor] = useState<string | null>(null);

  // ── Data Fetching ─────────────────────────────────────────────────

  const { data: usersRes, isLoading: usersLoading } = useQuery({
    queryKey: ['users', currentTenantId, userSearch],
    queryFn: () => apiClient.users.listUsers({ tenantId: currentTenantId ?? undefined, search: userSearch || undefined }),
    enabled: !!currentTenantId,
  });
  const users: User[] = (usersRes?.data as any) ?? [];

  const { data: employeesRes } = useQuery({
    queryKey: ['employees-iam', currentTenantId],
    queryFn: () => apiClient.hr.getEmployees({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId && showCreateUser,
  });
  const employeesList: any[] = (employeesRes?.data as any[]) ?? [];

  const { data: rolesRes, isLoading: rolesLoading } = useQuery({
    queryKey: ['iam-roles', currentTenantId],
    queryFn: () => apiClient.iam.listRoles({ tenantId: currentTenantId ?? undefined }),
  });
  const roles: Role[] = rolesRes?.data ?? [];

  const { data: tenantsRes } = useQuery({
    queryKey: ['tenants-list'],
    queryFn: () => apiClient.tenants.list(),
    enabled: !!isSuperAdmin,
  });
  const tenants = (tenantsRes?.data as any) ?? [];

  const { data: permissionsRes } = useQuery({
    queryKey: ['iam-permissions'],
    queryFn: () => apiClient.iam.listPermissions(),
  });
  const permissions: Permission[] = permissionsRes?.data ?? [];

  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of permissions) {
      const list = map.get(p.resource) ?? [];
      list.push(p);
      map.set(p.resource, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  // Role permissions (for the permissions editor)
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
  if (managing && grantedIds.size >= 0 && selectionSyncedFor !== managing.id && !rolePermsLoading) {
    setSelectedPermissionIds([...grantedIds]);
    setSelectionSyncedFor(managing.id);
  }

  // Roles for the currently viewed user
  const { data: userRolesRes } = useQuery({
    queryKey: ['user-roles', showRoleAssign?.id],
    queryFn: () => apiClient.users.getUserRoles(showRoleAssign!.id),
    enabled: !!showRoleAssign,
  });
  const userRoles: any[] = (userRolesRes?.data as any) ?? [];

  // Sync role IDs when dialog opens
  const [rolesSyncedFor, setRolesSyncedFor] = useState<string | null>(null);
  if (showRoleAssign && rolesSyncedFor !== showRoleAssign.id && userRoles.length >= 0) {
    setAssignedRoleIds(userRoles.map((r: any) => r.roleId ?? r.id));
    setRolesSyncedFor(showRoleAssign.id);
  }

  // ── User Mutations ────────────────────────────────────────────────

  const createUserMutation = useMutation({
    mutationFn: (data: any) => apiClient.users.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowCreateUser(false);
      setUserForm({ email: '', password: '', firstName: '', lastName: '', middleName: '', phone: '', tenantId: '' });
      setNewUserRoleIds([]);
      setNewUserEmployeeId('');
      toast({ title: 'User created successfully', variant: 'success' });
    },
    onError: (err: any) => toast({ title: 'Error creating user', description: err.message, variant: 'destructive' }),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.users.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
      toast({ title: 'User updated', variant: 'success' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => apiClient.users.suspendUser(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast({ title: 'User suspended' }); },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => apiClient.users.activateUser(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast({ title: 'User activated', variant: 'success' }); },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => apiClient.users.resetPassword(id, password),
    onSuccess: () => {
      setShowPasswordReset(null);
      setNewPassword('');
      toast({ title: 'Password reset successfully', variant: 'success' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const assignRolesMutation = useMutation({
    mutationFn: ({ id, roleIds }: { id: string; roleIds: string[] }) => apiClient.users.assignRoles(id, roleIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      setShowRoleAssign(null);
      toast({ title: 'Roles updated', variant: 'success' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  // ── Role Mutations ────────────────────────────────────────────────

  const createRoleMutation = useMutation({
    mutationFn: (data: typeof newRole) =>
      apiClient.iam.createRole({ ...data, tenantId: currentTenantId ?? '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam-roles'] });
      setShowCreateRole(false);
      setNewRole({ name: '', description: '' });
      toast({ title: 'Role created' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: (vars: { roleId: string; permissionIds: string[] }) =>
      apiClient.iam.updateRolePermissions(vars.roleId, vars.permissionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam-role-permissions'] });
      setManaging(null);
      toast({ title: 'Permissions saved' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) => apiClient.iam.deleteRole(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['iam-roles'] }); toast({ title: 'Role deleted' }); },
    onError: (err: Error) => toast({ title: 'Cannot delete role', description: err.message, variant: 'destructive' }),
  });

  // ── User Table Columns ────────────────────────────────────────────

  const userStatusBadge = (status: string) => {
    if (status === 'active') return <Badge variant="success">Active</Badge>;
    if (status === 'suspended') return <Badge variant="warning">Suspended</Badge>;
    if (status === 'locked') return <Badge variant="destructive">Locked</Badge>;
    return <Badge variant="neutral">{status}</Badge>;
  };

  const userColumns: ColumnDef<any, any>[] = [
    {
      id: 'name',
      header: 'User',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center font-semibold text-accent text-sm shrink-0">
            {(row.original.firstName?.[0] ?? row.original.email[0]).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-sm">
              {[row.original.lastName, row.original.firstName].filter(Boolean).join(', ') || '—'}
            </p>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => row.original.phone || '—',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => userStatusBadge(row.original.status),
    },
    {
      accessorKey: 'lastLoginAt',
      header: 'Last Login',
      cell: ({ row }) => row.original.lastLoginAt
        ? new Date(row.original.lastLoginAt).toLocaleDateString()
        : 'Never',
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => {
        const user = row.original as User;
        const isActive = user.status === 'active';
        return (
          <div className="flex justify-end gap-1">
            <Button variant="outline" size="sm" onClick={() => {
              setEditingUser(user);
              setUserForm({
                email: user.email,
                password: '',
                firstName: user.firstName ?? '',
                lastName: user.lastName ?? '',
                middleName: user.middleName ?? '',
                phone: user.phone ?? '',
                tenantId: user.tenantId,
              });
            }}>
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setShowRoleAssign(user); setRolesSyncedFor(null); }}>
              <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Roles
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setShowPasswordReset(user); setNewPassword(''); }}>
              <KeyRound className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ${isActive ? 'text-orange-500 hover:text-orange-500' : 'text-green-500 hover:text-green-500'}`}
              title={isActive ? 'Suspend User' : 'Activate User'}
              onClick={async () => {
                const ok = await confirm({
                  title: isActive ? `Suspend ${user.email}?` : `Activate ${user.email}?`,
                  description: isActive
                    ? 'The user will not be able to log in until reactivated.'
                    : 'The user will regain access to the system.',
                  confirmLabel: isActive ? 'Suspend' : 'Activate',
                  destructive: isActive,
                });
                if (ok) isActive ? suspendMutation.mutate(user.id) : activateMutation.mutate(user.id);
              }}
            >
              {isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
            </Button>
          </div>
        );
      },
    },
  ];

  // ── Role Table Columns ────────────────────────────────────────────

  const filteredRoles = roleSearch.trim()
    ? roles.filter((r) => `${r.name} ${r.description ?? ''}`.toLowerCase().includes(roleSearch.toLowerCase()))
    : roles;

  const roleColumns: ColumnDef<any, any>[] = [
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
        row.original.isSystem ? <Badge variant="info">System</Badge> : <Badge variant="neutral">Custom</Badge>,
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => {
        const role = row.original as Role;
        return (
          <div className="flex justify-end gap-1">
            <Button variant="outline" size="sm" onClick={() => { setManaging(role); setSelectionSyncedFor(null); }}>
              Permissions
            </Button>
            {!role.isSystem && (
              <Button
                variant="ghost" size="sm"
                className="h-8 w-8 p-0 text-[hsl(var(--status-danger-ink))] hover:text-[hsl(var(--status-danger-ink))]"
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

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users & Roles</h1>
          <p className="text-muted-foreground">Manage user accounts, roles, and permission assignments.</p>
        </div>
        <Button onClick={() => activeTab === 'users' ? setShowCreateUser(true) : setShowCreateRole(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {activeTab === 'users' ? 'New User' : 'New Role'}
        </Button>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 rounded-lg border bg-card p-1 w-fit">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'users' ? 'bg-accent text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="h-4 w-4" /> Users
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'roles' ? 'bg-accent text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShieldCheck className="h-4 w-4" /> Roles & Permissions
        </button>
      </div>

      {/* ── USERS TAB ─────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <DataTable
            columns={userColumns as any}
            data={users}
            isLoading={usersLoading}
            emptyMessage="No users found."
            emptyDescription="Create a new user account to get started."
          />
        </div>
      )}

      {/* ── ROLES TAB ─────────────────────────────────────────── */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search roles…"
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <DataTable
            columns={roleColumns as any}
            data={filteredRoles}
            isLoading={rolesLoading}
            emptyMessage="No roles found."
            emptyDescription="Create a custom role, then grant it permissions from the catalog."
          />
          {/* Permission Catalog */}
          <div className="rounded-lg border bg-card shadow-sm">
            <div className="border-b p-4">
              <h2 className="font-semibold">Permission Catalog</h2>
              <p className="text-sm text-muted-foreground">
                {permissions.length} permissions across {grouped.length} modules
              </p>
            </div>
            <div className="max-h-80 space-y-3 overflow-y-auto p-4">
              {grouped.map(([resource, perms]) => (
                <div key={resource}>
                  <p className="mb-1 font-mono text-xs font-medium text-muted-foreground">{resource}</p>
                  <div className="flex flex-wrap gap-1">
                    {perms.map((p) => (
                      <Badge key={p.id} variant="outline">{p.action}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Dialog open={showCreateUser} onOpenChange={(open) => { setShowCreateUser(open); if (!open) { setNewUserRoleIds([]); setNewUserEmployeeId(''); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-accent" /> New User Account
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const payload = { ...userForm };
              if (!isSuperAdmin) {
                payload.tenantId = currentTenantId ?? '';
              } else if (payload.tenantId === 'platform') {
                payload.tenantId = '';
              }
              createUserMutation.mutate({
                ...payload,
                roleIds: newUserRoleIds.length > 0 ? newUserRoleIds : undefined,
                employeeId: newUserEmployeeId || undefined,
              });
            }}
            className="space-y-4 py-2"
          >
            {/* ── Section 1: Account Details ── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="u-fname">First Name</Label>
                <Input id="u-fname" value={userForm.firstName} onChange={(e) => setUserForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Juan" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="u-lname">Last Name</Label>
                <Input id="u-lname" value={userForm.lastName} onChange={(e) => setUserForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Dela Cruz" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-email">Email <span className="text-red-500">*</span></Label>
              <Input id="u-email" type="email" required value={userForm.email} onChange={(e) => setUserForm(f => ({ ...f, email: e.target.value }))} placeholder="user@school.edu" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-phone">Phone</Label>
              <Input id="u-phone" value={userForm.phone} onChange={(e) => setUserForm(f => ({ ...f, phone: e.target.value }))} placeholder="+63 9XX XXX XXXX" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-pass">Password <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input
                  id="u-pass"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={userForm.password}
                  onChange={(e) => setUserForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min. 8 characters"
                  className="pr-10"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(s => !s)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* ── Section 1.5: Tenant Selection (Super Admin Only) ── */}
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label htmlFor="u-tenant">Tenant Assignment <span className="text-red-500">*</span></Label>
                <Select
                  value={userForm.tenantId || 'platform'}
                  onValueChange={(v) => setUserForm(f => ({ ...f, tenantId: v }))}
                >
                  <SelectTrigger id="u-tenant">
                    <SelectValue placeholder="Select a tenant..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platform">— Platform Admin (No Tenant) —</SelectItem>
                    {tenants.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">SuperAdmins can assign users to a specific tenant, or leave them as Platform users.</p>
              </div>
            )}

            {/* ── Section 2: Link to Employee (optional) ── */}
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Link to Employee Record <span className="font-normal">(optional)</span></p>
              <Select
                value={newUserEmployeeId || 'none'}
                onValueChange={(v) => {
                  if (v === 'none') {
                    setNewUserEmployeeId('');
                  } else {
                    setNewUserEmployeeId(v);
                    const emp = employeesList.find((e: any) => e.id === v);
                    if (emp) {
                      setUserForm(f => ({
                        ...f,
                        firstName: f.firstName || emp.firstName || '',
                        lastName: f.lastName || emp.lastName || '',
                        phone: f.phone || emp.contactNumber || '',
                      }));
                    }
                  }
                }}
              >
                <SelectTrigger id="u-employee">
                  <SelectValue placeholder="Select an employee to link..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Not linked —</SelectItem>
                  {employeesList.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.lastName}, {emp.firstName} {emp.position ? `· ${emp.position}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newUserEmployeeId && (
                <p className="text-xs text-muted-foreground">This account will be linked to the employee profile in HR.</p>
              )}
            </div>

            {/* ── Section 3: Assign Roles (optional) ── */}
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assign Roles <span className="font-normal">(optional)</span></p>
              <div className="max-h-40 overflow-y-auto grid gap-2">
                {roles.map((role) => (
                  <label key={role.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/30 rounded px-1 py-0.5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-muted accent-primary"
                      checked={newUserRoleIds.includes(role.id)}
                      onChange={(e) => {
                        setNewUserRoleIds(prev =>
                          e.target.checked ? [...prev, role.id] : prev.filter(id => id !== role.id)
                        );
                      }}
                    />
                    <span className="text-sm font-medium">{role.name}</span>
                    {role.description && <span className="text-xs text-muted-foreground">— {role.description}</span>}
                  </label>
                ))}
                {roles.length === 0 && <p className="text-xs text-muted-foreground">No roles available. Create roles first.</p>}
              </div>
            </div>

            {isSuperAdmin && (
              <div className="space-y-2">
                <Label htmlFor="u-tenant">Assign Tenant (Superadmin Only) <span className="text-red-500">*</span></Label>
                <Select
                  value={userForm.tenantId}
                  onValueChange={(v) => setUserForm(f => ({ ...f, tenantId: v }))}
                  required
                >
                  <SelectTrigger id="u-tenant">
                    <SelectValue placeholder="Select a tenant..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platform">Platform Admin (No Tenant)</SelectItem>
                    {tenants.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateUser(false)}>Cancel</Button>
              <Button type="submit" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? 'Creating…' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit User Dialog ─────────────────────────────────── */}
      <Dialog open={!!editingUser} onOpenChange={(o) => !o && setEditingUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User — {editingUser?.email}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editingUser) updateUserMutation.mutate({
                id: editingUser.id,
                data: { firstName: userForm.firstName, lastName: userForm.lastName, middleName: userForm.middleName, phone: userForm.phone },
              });
            }}
            className="space-y-4 py-2"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={userForm.firstName} onChange={(e) => setUserForm(f => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={userForm.lastName} onChange={(e) => setUserForm(f => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Middle Name</Label>
              <Input value={userForm.middleName} onChange={(e) => setUserForm(f => ({ ...f, middleName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={userForm.phone} onChange={(e) => setUserForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
              <Button type="submit" disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Reset Password Dialog ────────────────────────────── */}
      <Dialog open={!!showPasswordReset} onOpenChange={(o) => !o && setShowPasswordReset(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-accent" /> Reset Password
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Set a new password for <strong>{showPasswordReset?.email}</strong>.</p>
            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="pr-10"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(s => !s)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordReset(null)}>Cancel</Button>
            <Button
              disabled={newPassword.length < 8 || resetPasswordMutation.isPending}
              onClick={() => showPasswordReset && resetPasswordMutation.mutate({ id: showPasswordReset.id, password: newPassword })}
            >
              {resetPasswordMutation.isPending ? 'Resetting…' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign Roles Dialog ──────────────────────────────── */}
      <Dialog open={!!showRoleAssign} onOpenChange={(o) => !o && setShowRoleAssign(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-accent" /> Assign Roles — {showRoleAssign?.email}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2 max-h-72 overflow-y-auto">
            {roles.map((role) => (
              <label key={role.id} className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={assignedRoleIds.includes(role.id)}
                  onChange={(e) => setAssignedRoleIds(prev =>
                    e.target.checked ? [...prev, role.id] : prev.filter(id => id !== role.id)
                  )}
                />
                <div>
                  <p className="font-medium text-sm">{role.name}</p>
                  {role.description && <p className="text-xs text-muted-foreground">{role.description}</p>}
                </div>
                {role.isSystem && <Badge variant="info" className="ml-auto">System</Badge>}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleAssign(null)}>Cancel</Button>
            <Button
              disabled={assignRolesMutation.isPending}
              onClick={() => showRoleAssign && assignRolesMutation.mutate({ id: showRoleAssign.id, roleIds: assignedRoleIds })}
            >
              {assignRolesMutation.isPending ? 'Saving…' : 'Save Roles'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Role Dialog ───────────────────────────────── */}
      <Dialog open={showCreateRole} onOpenChange={setShowCreateRole}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Role</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createRoleMutation.mutate(newRole); }} className="mt-2 space-y-3">
            <div>
              <Label htmlFor="role-name">Name</Label>
              <Input id="role-name" value={newRole.name} onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} placeholder="e.g. Collections Supervisor" required />
            </div>
            <div>
              <Label htmlFor="role-desc">Description</Label>
              <Input id="role-desc" value={newRole.description} onChange={(e) => setNewRole({ ...newRole, description: e.target.value })} placeholder="What this role can do" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateRole(false)}>Cancel</Button>
              <Button type="submit" disabled={createRoleMutation.isPending}>
                {createRoleMutation.isPending ? 'Creating…' : 'Create role'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Permission Matrix Dialog ─────────────────────────── */}
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
                    const checked = selectedPermissionIds.includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setSelectedPermissionIds((prev) =>
                              e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id),
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
            <Button variant="outline" onClick={() => setManaging(null)}>Cancel</Button>
            <Button
              disabled={updatePermissionsMutation.isPending || !managing}
              onClick={() => managing && updatePermissionsMutation.mutate({ roleId: managing.id, permissionIds: selectedPermissionIds })}
            >
              {updatePermissionsMutation.isPending ? 'Saving…' : 'Save permissions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
