'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { DataTable } from '@sms/ui';
import { ColumnDef } from '@tanstack/react-table';
import { useToast, useConfirm, Badge, statusToVariant, StatusDot } from '@sms/ui';
import { Plus, Search, Shield, User, Mail, Lock, PauseCircle, PlayCircle, Unlock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@sms/ui';
import { Button } from '@sms/ui';
import { Input } from '@sms/ui';
import { Label } from '@sms/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sms/ui';
import { Checkbox } from '@sms/ui';
import { cn } from '@sms/utils';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  status: string;
  tenantId: string;
  tenantName?: string;
  mfaEnabled?: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

interface Role {
  id: string;
  name: string;
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'locked'>('all');
  const [tenantFilter, setTenantFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    middleName: '',
    tenantId: '',
    roleIds: [] as string[],
  });

  const { data: usersRes, isLoading } = useQuery({
    queryKey: ['users', searchQuery, statusFilter, tenantFilter],
    queryFn: () => apiClient.users.list({
      limit: 100,
      search: searchQuery,
      status: statusFilter === 'all' ? undefined : statusFilter,
      tenantId: tenantFilter === 'all' ? undefined : tenantFilter,
    }),
  });

  const { data: tenantsRes } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => apiClient.tenants.list({ limit: 100 }),
  });

  const { data: rolesRes } = useQuery({
    queryKey: ['iam-roles'],
    queryFn: () => apiClient.iam.listRoles(),
  });

  const tenants: Tenant[] = tenantsRes?.data ?? [];
  const roles: Role[] = rolesRes?.data ?? [];
  const users: User[] = usersRes?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiClient.users.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowCreate(false);
      setForm({ email: '', password: '', firstName: '', lastName: '', middleName: '', tenantId: '', roleIds: [] });
      toast({ title: 'User created', description: 'User has been created successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: User) => apiClient.users.update(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
      toast({ title: 'User updated', description: 'User has been updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => apiClient.users.suspend(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'User suspended', description: 'User has been suspended.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => apiClient.users.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'User activated', description: 'User has been activated.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const unlockMutation = useMutation({
    mutationFn: (id: string) => apiClient.users.unlock(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'User unlocked', description: 'User account has been unlocked.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) => apiClient.users.resetPassword(id, newPassword),
    onSuccess: () => {
      toast({ title: 'Password reset', description: 'User password has been reset.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleEdit = (user: User) => {
    setForm({
      email: user.email,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      middleName: user.middleName || '',
      tenantId: user.tenantId,
      roleIds: [],
    });
    setEditingUser(user);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      updateMutation.mutate({ ...editingUser, ...form, id: editingUser.id });
    } else {
      createMutation.mutate(form);
    }
  };

  const statusConfig = {
    active: { label: 'Active' },
    suspended: { label: 'Suspended' },
    locked: { label: 'Locked' },
  } as const;

  const renderEmailCell = ({ row }: { row: { original: User } }) => (      <div className="flex items-center space-x-2">
      <div className="w-8 h-8 rounded-full bg-[hsl(var(--accent-subtle))] flex items-center justify-center">
        <User className="h-4 w-4 text-[hsl(var(--accent-ink))]" />
      </div>
      <div>
        <p className="font-medium text-[hsl(var(--ink-100))]">{row.original.email}</p>
        <p className="text-xs text-[hsl(var(--ink-300))]">{row.original.tenantName}</p>
      </div>
    </div>
  );

  const renderNameCell = ({ row }: { row: { original: User } }) => {
    const user = row.original;
    return (
      <div>
        <p className="font-medium text-[hsl(var(--ink-100))]">{user.firstName} {user.lastName}</p>
        {user.middleName && <p className="text-xs text-[hsl(var(--ink-300))]">{user.middleName}</p>}
      </div>
    );
  };

  const renderStatusCell = ({ row }: { row: { original: User } }) => {
    const status = row.original.status;
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return (
      <Badge variant={statusToVariant(status)}>
        <StatusDot />
        {config.label}
      </Badge>
    );
  };

  const renderMfaCell = ({ row }: { row: { original: User } }) => (
    <span className={cn('inline-flex items-center gap-1', row.original.mfaEnabled ? 'text-[hsl(var(--status-success-ink))]' : 'text-[hsl(var(--ink-300))]')}>
      <Shield className="h-3.5 w-3.5" />
      <span className="text-xs">{row.original.mfaEnabled ? 'Enabled' : 'Disabled'}</span>
    </span>
  );

  const renderLastLoginCell = ({ row }: { row: { original: User } }) =>
    row.original.lastLoginAt ? new Date(row.original.lastLoginAt).toLocaleDateString() : 'Never';

  const renderCreatedCell = ({ row }: { row: { original: User } }) =>
    new Date(row.original.createdAt).toLocaleDateString();

  const renderActionsCell = ({ row }: { row: { original: User } }) => {
    const user = row.original;
    return (
      <div className="flex items-center space-x-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleEdit(user)}
          className="h-8 w-8 p-0"
          aria-label="Edit user"
        >
          <Mail className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            const newPassword = window.prompt('Enter new password:');
            if (newPassword) resetPasswordMutation.mutate({ id: user.id, newPassword });
          }}
          className="h-8 w-8 p-0"
          aria-label="Reset password"
        >
          <Lock className="h-4 w-4" />
        </Button>
        {user.status === 'active' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              const ok = await confirm({
                title: `Suspend ${user.email}?`,
                description: 'The user will not be able to sign in until reactivated.',
                confirmLabel: 'Suspend',
                destructive: true,
              });
              if (ok) suspendMutation.mutate(user.id);
            }}
            className="h-8 w-8 p-0 text-[hsl(var(--status-warning-ink))] hover:text-[hsl(var(--status-warning-ink))]"
            aria-label="Suspend user"
          >
            <PauseCircle className="h-4 w-4" />
          </Button>
        )}
        {user.status === 'suspended' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => activateMutation.mutate(user.id)}
            className="h-8 w-8 p-0 text-[hsl(var(--status-success-ink))] hover:text-[hsl(var(--status-success-ink))]"
            aria-label="Activate user"
          >
            <PlayCircle className="h-4 w-4" />
          </Button>
        )}
        {user.status === 'locked' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => unlockMutation.mutate(user.id)}
            className="h-8 w-8 p-0 text-[hsl(var(--secondary))] hover:text-[hsl(var(--secondary))]"
            aria-label="Unlock user"
          >
            <Unlock className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          aria-label="Manage roles"
        >
          <Shield className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  const columns: ColumnDef<any, any>[] = [
    { accessorKey: 'email', header: 'Email', cell: renderEmailCell },
    { accessorKey: 'name', header: 'Name', cell: renderNameCell },
    { accessorKey: 'status', header: 'Status', cell: renderStatusCell },
    { accessorKey: 'mfaEnabled', header: 'MFA', cell: renderMfaCell },
    { accessorKey: 'lastLoginAt', header: 'Last Login', cell: renderLastLoginCell },
    { accessorKey: 'createdAt', header: 'Created', cell: renderCreatedCell },
    { header: 'Actions', cell: renderActionsCell },
  ];

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Users</h1>
            <p className="text-[hsl(var(--ink-300))]">Manage platform users and their roles across all tenants</p>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button>
                <span className="flex items-center space-x-1">
                  <Plus className="h-4 w-4" />
                  <span>Add User</span>
                </span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required={!editingUser}
                    />
                    {!editingUser && <p className="text-xs text-[hsl(var(--ink-300))]">Leave blank to keep current password</p>}
                  </div>
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="middleName">Middle Name</Label>
                    <Input
                      id="middleName"
                      value={form.middleName}
                      onChange={(e) => setForm({ ...form, middleName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="tenantId" className="text-[hsl(var(--ink-200))]">Tenant</Label>
                    <Select
                      value={form.tenantId}
                      onValueChange={(value) => setForm({ ...form, tenantId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select tenant" />
                      </SelectTrigger>
                      <SelectContent>
                        {tenants.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            {tenant.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[hsl(var(--ink-200))]">Roles</Label>
                    <div className="space-y-2">
                      {roles.map((role) => (
                        <label key={role.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={form.roleIds.includes(role.id)}
                            onCheckedChange={(checked) =>
                              setForm({
                                ...form,
                                roleIds: checked
                                  ? [...form.roleIds, role.id]
                                  : form.roleIds.filter((id) => id !== role.id),
                              })
                            }
                          />
                          <span className="text-sm text-[hsl(var(--ink-100))]">{role.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
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

        {/* Filters */}
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-raised))] p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--ink-300))]" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as 'all' | 'active' | 'suspended' | 'locked')}
            >                    <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="locked">Locked</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={tenantFilter}
              onValueChange={(value) => setTenantFilter(value)}
            >                    <SelectTrigger className="w-48">
                <SelectValue placeholder="All Tenants" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tenants</SelectItem>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns as any}
          data={users}
          isLoading={isLoading}
          emptyMessage="No users found. Click 'Add User' to create a new user."
        />
      </div>
    </>
  );
}