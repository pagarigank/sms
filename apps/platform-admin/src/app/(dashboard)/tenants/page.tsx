'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { DataTable, useToast, useConfirm, Badge, statusToVariant, StatusDot } from '@sms/ui';
import { ColumnDef } from '@tanstack/react-table';
import { Edit, Trash2, PauseCircle, PlayCircle, Eye, Palette, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@sms/ui';
import { Button } from '@sms/ui';
import { Input } from '@sms/ui';
import { Label } from '@sms/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sms/ui';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  planId?: string;
  branding?: Record<string, unknown>;
  createdAt: string;
}

interface TenantPlan {
  id: string;
  plan_key: string;
  name: string;
}

export default function TenantsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [showCreate, setShowCreate] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', planId: '' });

  const { data: tenantsRes, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => apiClient.tenants.list({ limit: 100 }),
  });

  const { data: plansRes } = useQuery({
    queryKey: ['tenant-plans'],
    queryFn: () => apiClient.tenants.listPlans(),
  });

  const plans: TenantPlan[] = plansRes?.data ?? [];
  const tenants: Tenant[] = tenantsRes?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiClient.tenants.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setShowCreate(false);
      setForm({ name: '', slug: '', planId: '' });
      toast({ title: 'Tenant created', description: 'Tenant has been created successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Tenant) => apiClient.tenants.update(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setEditingTenant(null);
      toast({ title: 'Tenant updated', description: 'Tenant has been updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => apiClient.tenants.suspend(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({ title: 'Tenant suspended', description: 'Tenant has been suspended.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => apiClient.tenants.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({ title: 'Tenant activated', description: 'Tenant has been activated.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.tenants.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({ title: 'Tenant deleted', description: 'Tenant has been permanently deleted.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleEdit = (tenant: Tenant) => {
    setForm({ name: tenant.name, slug: tenant.slug, planId: tenant.planId || '' });
    setEditingTenant(tenant);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTenant) {
      updateMutation.mutate({ ...editingTenant, ...form, id: editingTenant.id });
    } else {
      createMutation.mutate(form);
    }
  };

  const statusConfig = {
    active: { label: 'Active' },
    suspended: { label: 'Suspended' },
    archived: { label: 'Archived' },
  } as const;

  const columns: ColumnDef<any, any>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-[hsl(var(--accent-subtle))] flex items-center justify-center">
            <Palette className="h-4 w-4 text-[hsl(var(--accent))]" />
          </div>
          <div>
            <p className="font-medium text-[hsl(var(--ink-100))]">{row.original.name}</p>
            <p className="text-xs text-[hsl(var(--ink-300))]">{row.original.slug}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.archived;
        return (
          <Badge variant={statusToVariant(status)}>
            <StatusDot />
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'planId',
      header: 'Plan',
      cell: ({ row }) => {
        const plan = plans.find(p => p.id === row.original.planId);
        return plan ? plan.name : row.original.planId;
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      header: 'Actions',
      cell: ({ row }) => {
        const tenant = row.original;
        return (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(tenant)}
              className="h-8 w-8 p-0 border border-transparent hover:border-[hsl(var(--border-strong))] text-[hsl(var(--ink-200))] hover:text-[hsl(var(--ink-100))]"
              aria-label="Edit tenant"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const ok = await confirm({
                  title: `Delete ${tenant.name}?`,
                  description: 'This action cannot be undone.',
                  confirmLabel: 'Delete',
                  destructive: true,
                });
                if (ok) deleteMutation.mutate(tenant.id);
              }}
              className="h-8 w-8 p-0 text-[hsl(var(--status-danger-ink))] hover:text-[hsl(var(--status-danger-ink))]"
              aria-label="Delete tenant"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            {tenant.status === 'active' && (            <Button
              variant="ghost"
              size="sm"
              onClick={() => suspendMutation.mutate(tenant.id)}
              className="h-8 w-8 p-0 text-[hsl(var(--status-warning-ink))] hover:text-[hsl(var(--status-warning-ink))]"
              aria-label="Suspend tenant"
            >
              <PauseCircle className="h-4 w-4" />
            </Button>
            )}
            {tenant.status === 'suspended' && (            <Button
              variant="ghost"
              size="sm"
              onClick={() => activateMutation.mutate(tenant.id)}
              className="h-8 w-8 p-0 text-[hsl(var(--status-success-ink))] hover:text-[hsl(var(--status-success-ink))]"
              aria-label="Activate tenant"
            >
              <PlayCircle className="h-4 w-4" />
            </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label="View branding"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label="Manage branding"
            >
              <Palette className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--ink-100))]">Tenants</h1>
            <p className="text-[hsl(var(--ink-300))]">Manage school organizations</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            <span>Add Tenant</span>
          </Button>
        </div>

        {showCreate && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Tenant</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="name" className="text-[hsl(var(--ink-200))]">Name</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Holy Angel Integrated School System, Inc."
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="slug" className="text-[hsl(var(--ink-200))]">Slug</Label>
                    <Input
                      id="slug"
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                      placeholder="holy-angel"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="planId" className="text-[hsl(var(--ink-200))]">Plan</Label>
                  <Select
                    value={form.planId}
                    onValueChange={(value) => setForm({ ...form, planId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} ({plan.plan_key})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {editingTenant && (
          <Dialog open={!!editingTenant} onOpenChange={(open) => !open && setEditingTenant(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit Tenant</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="edit-name" className="text-[hsl(var(--ink-200))]">Name</Label>
                    <Input
                      id="edit-name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-slug" className="text-[hsl(var(--ink-200))]">Slug</Label>
                    <Input
                      id="edit-slug"
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                      required
                      readOnly
                    />
                    <p className="text-xs text-[hsl(var(--ink-300))]">Slug cannot be changed</p>
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-planId" className="text-[hsl(var(--ink-200))]">Plan</Label>
                  <Select
                    value={form.planId}
                    onValueChange={(value) => setForm({ ...form, planId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} ({plan.plan_key})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingTenant(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'Updating...' : 'Save Changes'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        <DataTable
          columns={columns as any}
          data={tenants}
          isLoading={isLoading}
          emptyMessage="No tenants found. Click 'Add Tenant' to create your first school organization."
        />
      </div>
    </>
  );
}