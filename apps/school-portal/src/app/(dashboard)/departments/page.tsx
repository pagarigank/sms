'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { DataTable } from '@sms/ui';
import { ColumnDef } from '@tanstack/react-table';
import { useToast, useConfirm, Badge, statusToVariant, StatusDot } from '@sms/ui';
import { Plus, Building, Check, Trash2, Edit, PauseCircle, PlayCircle, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@sms/ui';
import { Button } from '@sms/ui';
import { Input } from '@sms/ui';
import { Label } from '@sms/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sms/ui';
import { Checkbox } from '@sms/ui';
import { cn } from '@sms/utils';

interface Department {
  id: string;
  name: string;
  code: string;
  educationLevelIds: string[];
  isDefault: boolean;
  contactEmail?: string;
  tenantId: string;
  tenantName?: string;
  branchId: string;
  branchName?: string;
  createdAt?: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

interface Branch {
  id: string;
  name: string;
  code: string;
  tenantId: string;
}

interface EducationLevel {
  id: string;
  name: string;
  code: string;
}

export default function DepartmentsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [searchQuery, setSearchQuery] = useState('');
  const [tenantFilter, setTenantFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    tenantId: '',
    branchId: '',
    educationLevelIds: [] as string[],
    isDefault: false,
    contactEmail: '',
  });

  const { data: deptRes, isLoading } = useQuery({
    queryKey: ['departments', searchQuery, tenantFilter, branchFilter],
    queryFn: () => apiClient.departments.list({
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

  const { data: branchesRes } = useQuery({
    queryKey: ['branches', tenantFilter],
    queryFn: async () => {
      if (tenantFilter === 'all') return { data: [] };
      return apiClient.branches.list({ tenantId: tenantFilter, limit: 100 });
    },
    enabled: tenantFilter !== 'all',
  });

  const { data: educationLevelsRes } = useQuery({
    queryKey: ['education-levels'],
    queryFn: () => apiClient.academic.listEducationLevels(),
  });

  const tenants: Tenant[] = tenantsRes?.data ?? [];
  const branches: Branch[] = (branchesRes?.data as Branch[]) ?? [];
  const educationLevels: EducationLevel[] = educationLevelsRes?.data ?? [];
  const departments: Department[] = deptRes?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiClient.departments.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setShowCreate(false);
      setForm({ name: '', code: '', tenantId: '', branchId: '', educationLevelIds: [], isDefault: false, contactEmail: '' });
      toast({ title: 'Department created', description: 'Department has been created successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Department) => apiClient.departments.update(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setEditingDept(null);
      toast({ title: 'Department updated', description: 'Department has been updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.departments.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({ title: 'Department deleted', description: 'Department has been permanently deleted.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => apiClient.departments.setDefault(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({ title: 'Default department set', description: 'New enrollments in this branch default to it.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleEdit = (dept: Department) => {
    setForm({
      name: dept.name,
      code: dept.code,
      tenantId: dept.tenantId,
      branchId: dept.branchId,
      educationLevelIds: dept.educationLevelIds,
      isDefault: dept.isDefault,
      contactEmail: dept.contactEmail || '',
    });
    setEditingDept(dept);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDept) {
      updateMutation.mutate({ ...form, id: editingDept.id });
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
            <p className="text-xs text-muted-foreground">{row.original.code}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'tenantName',
      header: 'Tenant',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.tenantName}</p>
          <p className="text-xs text-muted-foreground">{row.original.tenantId.slice(0, 8)}...</p>
        </div>
      ),
    },
    {
      accessorKey: 'branchName',
      header: 'Branch',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.branchName}</p>
          <p className="text-xs text-muted-foreground">{row.original.branchId.slice(0, 8)}...</p>
        </div>
      ),
    },
    {
      accessorKey: 'educationLevelIds',
      header: 'Education Levels',
      cell: ({ row }) => {
        const levels = row.original.educationLevelIds
          .map((id: string) => educationLevels.find(el => el.id === id)?.name)
          .filter(Boolean)
          .join(', ');
        return levels || '—';
      },
    },
    {
      accessorKey: 'isDefault',
      header: 'Default',
      cell: ({ row }) => row.original.isDefault ? (
        <Badge variant="accent">Default</Badge>
      ) : (
        <span className="text-muted-foreground">No</span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString() : '—',
    },
    {
      header: 'Actions',
      cell: ({ row }) => {
        const dept = row.original;
        return (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(dept)}
              className="h-8 w-8 p-0"
              aria-label="Edit department"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const ok = await confirm({
                  title: `Delete ${dept.name}?`,
                  description: "This action cannot be undone.",
                  confirmLabel: "Delete",
                  destructive: true,
                });
                if (ok) deleteMutation.mutate(dept.id);
              }}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              aria-label="Delete department"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            {!dept.isDefault && (
              <Button
                variant="ghost"
                size="sm"
                disabled={setDefaultMutation.isPending}
                onClick={() => setDefaultMutation.mutate(dept.id)}
                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                aria-label="Set as default"
                title="Set as default department for this branch"
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
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
            <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
            <p className="text-muted-foreground">Manage academic departments across tenants and branches</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <span className="flex items-center space-x-1">
              <Plus className="h-4 w-4" />
              <span>Add Department</span>
            </span>
          </Button>
        </div>

        {showCreate && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Department</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Elementary Department"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="code">Code</Label>
                    <Input
                      id="code"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      placeholder="ELEM"
                      maxLength={10}
                      required
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
                <div>
                  <Label>Education Levels</Label>
                  <div className="space-y-2">
                    {educationLevels.map((level) => (
                      <label key={level.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={form.educationLevelIds.includes(level.id)}
                          onCheckedChange={(checked) =>
                            setForm({
                              ...form,
                              educationLevelIds: checked
                                ? [...form.educationLevelIds, level.id]
                                : form.educationLevelIds.filter((id) => id !== level.id),
                            })
                          }
                        />
                        <span className="text-sm">{level.name} ({level.code})</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isDefault"
                    checked={form.isDefault}
                    onCheckedChange={(checked) => setForm({ ...form, isDefault: checked })}
                  />
                  <Label htmlFor="isDefault" className="text-sm font-medium">
                    Set as default department for this branch
                  </Label>
                </div>
                <div>
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                    placeholder="dept@school.edu"
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

        {editingDept && (
          <Dialog open={!!editingDept} onOpenChange={(open) => !open && setEditingDept(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Department</DialogTitle>
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
                      required
                      readOnly
                    />
                    <p className="text-xs text-muted-foreground">Code cannot be changed</p>
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
                <div>
                  <Label>Education Levels</Label>
                  <div className="space-y-2">
                    {educationLevels.map((level) => (
                      <label key={level.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={form.educationLevelIds.includes(level.id)}
                          onCheckedChange={(checked) =>
                            setForm({
                              ...form,
                              educationLevelIds: checked
                                ? [...form.educationLevelIds, level.id]
                                : form.educationLevelIds.filter((id) => id !== level.id),
                            })
                          }
                        />
                        <span className="text-sm">{level.name} ({level.code})</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edit-isDefault"
                    checked={form.isDefault}
                    onCheckedChange={(checked) => setForm({ ...form, isDefault: checked })}
                  />
                  <Label htmlFor="edit-isDefault" className="text-sm font-medium">
                    Set as default department for this branch
                  </Label>
                </div>
                <div>
                  <Label htmlFor="edit-contactEmail">Contact Email</Label>
                  <Input
                    id="edit-contactEmail"
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                    placeholder="dept@school.edu"
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingDept(null)}>Cancel</Button>
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
                placeholder="Search departments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={tenantFilter}
              onValueChange={(value) => setTenantFilter(value)}
            >
              <SelectTrigger className="w-48">
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
              <SelectTrigger className="w-48">
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
          data={departments}
          isLoading={isLoading}
          emptyMessage="No departments found. Click 'Add Department' to create your first department."
        />

      </div>
    </>
  );
}