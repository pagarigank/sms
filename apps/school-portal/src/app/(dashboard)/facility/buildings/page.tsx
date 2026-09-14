'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { DataTable } from '@sms/ui';
import { ColumnDef } from '@tanstack/react-table';
import { useToast, useConfirm, Badge, statusToVariant, StatusDot } from '@sms/ui';
import { Plus, Search, Building, Edit, Trash2, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@sms/ui';
import { Button } from '@sms/ui';
import { Input } from '@sms/ui';
import { Label } from '@sms/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sms/ui';
import { cn } from '@sms/utils';

interface Building {
  id: string;
  name: string;
  code?: string;
  address?: string;
  floorCount?: number;
  tenantId: string;
  branchId: string;
  createdAt: string;
}

interface Tenant {
  id: string;
  name: string;
}

interface Branch {
  id: string;
  name: string;
  tenantId: string;
}

export default function BuildingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [searchQuery, setSearchQuery] = useState('');
  const [tenantFilter, setTenantFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    tenantId: '',
    branchId: '',
    address: '',
  });

  const { data: buildingsRes, isLoading } = useQuery({
    queryKey: ['buildings', searchQuery, tenantFilter, branchFilter],
    queryFn: () => apiClient.facility.listBuildings({
      limit: 100,
      search: searchQuery,
      tenantId: tenantFilter === 'all' ? undefined : tenantFilter,
      branchId: branchFilter === 'all' ? undefined : branchFilter,
    }),
  });

  const { data: tenantsRes } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => apiClient.tenants.list({ limit: 100 }),
  });

  const { data: branchesRes } = useQuery<any[]>({
    queryKey: ['branches', tenantFilter],
    queryFn: () =>
      tenantFilter !== 'all'
        ? apiClient.branches.list({ tenantId: tenantFilter, limit: 100 }).then((r: any) => r.data)
        : Promise.resolve([]),
    enabled: tenantFilter !== 'all',
  });

  const tenants: Tenant[] = (tenantsRes?.data as unknown as Tenant[]) ?? [];
  const branches: Branch[] = (branchesRes as unknown as Branch[]) ?? [];
  const buildings: Building[] = ((buildingsRes?.data as unknown) as Building[]) ?? [];

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiClient.facility.createBuilding(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      setShowCreate(false);
      setForm({ name: '', code: '', tenantId: '', branchId: '', address: '' });
      toast({ title: 'Building created', description: 'Building has been created successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Building> }) =>
      apiClient.facility.updateBuilding(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      setEditingBuilding(null);
      toast({ title: 'Building updated', description: 'Building has been updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.facility.deleteBuilding(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      toast({ title: 'Building deleted', description: 'Building has been permanently deleted.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleEdit = (building: Building) => {
    setForm({
      name: building.name,
      code: building.code || '',
      tenantId: building.tenantId,
      branchId: building.branchId,
      address: building.address || '',
    });
    setEditingBuilding(building);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBuilding) {
      updateMutation.mutate({ id: editingBuilding.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleTenantChange = (tenantId: string) => {
    setForm(prev => ({ ...prev, tenantId, branchId: '' }));
  };

  const columns: ColumnDef<any, any>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Building className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.code || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'address',
      header: 'Address',
      cell: ({ row }) => row.original.address || '—',
    },
    {
      accessorKey: 'floorCount',
      header: 'Floors',
      cell: ({ row }) => <span className="font-medium">{row.original.floorCount ?? 0}</span>,
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      header: 'Actions',
      cell: ({ row }) => {
        const building = row.original;
        return (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(building)}
              className="h-8 w-8 p-0"
              aria-label="Edit building"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const ok = await confirm({
                  title: `Delete ${building.name}?`,
                  description: "This action cannot be undone.",
                  confirmLabel: "Delete",
                  destructive: true,
                });
                if (ok) deleteMutation.mutate(building.id);
              }}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              aria-label="Delete building"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label="Manage floors"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Buildings</h1>
            <p className="text-muted-foreground">Manage campus buildings and facilities</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <span className="flex items-center space-x-1">
              <Plus className="h-4 w-4" />
              <span>Add Building</span>
            </span>
          </Button>
        </div>

        {showCreate && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Building</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Main Building"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="code">Code</Label>
                    <Input
                      id="code"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      placeholder="MB"
                      maxLength={10}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="tenantId">Tenant</Label>
                  <Select
                    value={form.tenantId}
                    onValueChange={(value) => handleTenantChange(value)}
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
                  <Label htmlFor="branchId">Branch</Label>
                  <Select
                    value={form.branchId}
                    onValueChange={(value) => setForm({ ...form, branchId: value })}
                    disabled={!form.tenantId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={form.tenantId ? "Select branch" : "Select tenant first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="123 Main Street, City"
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
        )}

        {editingBuilding && (
          <Dialog open={!!editingBuilding} onOpenChange={(open) => !open && setEditingBuilding(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit Building</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="edit-name">Name</Label>
                    <Input
                      id="edit-name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-code">Code</Label>
                    <Input
                      id="edit-code"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-tenantId">Tenant</Label>
                  <Select
                    value={form.tenantId}
                    onValueChange={(value) => handleTenantChange(value)}
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
                  <Label htmlFor="edit-branchId">Branch</Label>
                  <Select
                    value={form.branchId}
                    onValueChange={(value) => setForm({ ...form, branchId: value })}
                    disabled={!form.tenantId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={form.tenantId ? "Select branch" : "Select tenant first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="edit-address">Address</Label>
                  <Input
                    id="edit-address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="123 Main Street, City"
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingBuilding(null)}>Cancel</Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'Updating...' : 'Save Changes'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Filters */}
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search buildings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={tenantFilter}
              onValueChange={(value) => setTenantFilter(value)}
            >
              <SelectTrigger>
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
            <Select
              value={branchFilter}
              onValueChange={(value) => setBranchFilter(value)}
              disabled={tenantFilter === 'all'}
            >
              <SelectTrigger>
                <SelectValue placeholder={tenantFilter === 'all' ? "Select tenant first" : "All Branches"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns as any}
          data={buildings as any}
          isLoading={isLoading}
          emptyMessage="No buildings found. Click 'Add Building' to create your first building."
        />

      </div>
    </>
  );
}