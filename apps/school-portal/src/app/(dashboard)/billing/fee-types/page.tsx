'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import {
  Badge,
  Button,
  DataTable,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusDot,
  statusToVariant,
  useConfirm,
  useToast,
} from '@sms/ui';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Search, DollarSign, Edit, Trash2, CheckCircle, Percent, Tag } from 'lucide-react';
import { cn } from '@sms/utils';

interface FeeType {
  id: string;
  name: string;
  code: string;
  description?: string;
  glAccount?: string;
  isTaxable: boolean;
  taxRate?: number;
  isActive: boolean;
  tenantId: string;
  createdAt: string;
}

export default function FeeTypesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { currentTenantId } = useTenantStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editingFeeType, setEditingFeeType] = useState<FeeType | null>(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    glAccount: '',
    isTaxable: true,
    taxRate: 12,
    isActive: true,
  });

  const { data: feeTypesRes, isLoading } = useQuery({
    queryKey: ['fee-types', statusFilter, currentTenantId],
    queryFn: () =>
      apiClient.billing.getFeeTypes({
        tenantId: currentTenantId!,
        isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
      }),
    enabled: !!currentTenantId,
  });

  const allFeeTypes: FeeType[] = feeTypesRes?.data ?? [];
  const feeTypes = allFeeTypes.filter((ft) =>
    !searchQuery.trim()
      ? true
      : `${ft.name} ${ft.code} ${ft.glAccount ?? ''}`.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiClient.billing.createFeeType({ ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-types'] });
      setShowCreate(false);
      setForm({ name: '', code: '', description: '', glAccount: '', isTaxable: true, taxRate: 12, isActive: true });
      toast({ title: 'Fee Type created', description: 'Fee type has been created successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FeeType) => apiClient.billing.updateFeeType(data.id, {
      ...data,
      taxRate: data.taxRate,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-types'] });
      setEditingFeeType(null);
      toast({ title: 'Fee Type updated', description: 'Fee type has been updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.billing.deleteFeeType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-types'] });
      toast({ title: 'Fee Type deleted', description: 'Fee type has been permanently deleted.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleEdit = (feeType: FeeType) => {
    setForm({
      name: feeType.name,
      code: feeType.code,
      description: feeType.description || '',
      glAccount: feeType.glAccount || '',
      isTaxable: feeType.isTaxable,
      taxRate: feeType.taxRate || 0,
      isActive: feeType.isActive,
    });
    setEditingFeeType(feeType);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const taxRateValue = form.taxRate;
    if (editingFeeType) {
      updateMutation.mutate({ ...form, id: editingFeeType.id, taxRate: taxRateValue } as FeeType);
    } else {
      createMutation.mutate({ ...form, taxRate: taxRateValue });
    }
  };

  const columns: ColumnDef<any, any>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.code}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => row.original.description || '—',
    },
    {
      accessorKey: 'glAccount',
      header: 'GL Account',
      cell: ({ row }) => row.original.glAccount ? (
        <span className="font-mono text-sm">{row.original.glAccount}</span>
      ) : '—',
    },
    {
      accessorKey: 'isTaxable',
      header: 'Tax',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Tag className="h-3.5 w-3.5" />
          <span className="text-xs">
            {row.original.isTaxable ? `Taxable (${row.original.taxRate || 0}%)` : 'Non-taxable'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={statusToVariant(row.original.isActive)}>
          <StatusDot />
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      header: 'Actions',
      cell: ({ row }) => {
        const feeType = row.original;
        return (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(feeType)}
              className="h-8 w-8 p-0"
              aria-label="Edit fee type"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const ok = await confirm({
                  title: `Delete ${feeType.name}?`,
                  description: "This action cannot be undone.",
                  confirmLabel: "Delete",
                  destructive: true,
                });
                if (ok) deleteMutation.mutate(feeType.id);
              }}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              aria-label="Delete fee type"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Fee Types"
          description="Configure fee categories for billing and invoicing"
          actions={
            <Button onClick={() => setShowCreate(true)}>
              <span className="flex items-center space-x-1">
                <Plus className="h-4 w-4" />
                <span>Add Fee Type</span>
              </span>
            </Button>
          }
        />

        {showCreate && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Fee Type</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Tuition Fee, Miscellaneous Fee"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="code">Code</Label>
                    <Input
                      id="code"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      placeholder="TUIT, MISC"
                      maxLength={10}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Description of this fee type"
                  />
                </div>
                <div>
                  <Label htmlFor="glAccount">GL Account Code</Label>
                  <Input
                    id="glAccount"
                    value={form.glAccount}
                    onChange={(e) => setForm({ ...form, glAccount: e.target.value })}
                    placeholder="4000, 4100"
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.isTaxable}
                      onChange={(e) => setForm({ ...form, isTaxable: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Taxable</span>
                  </label>
                  {form.isTaxable && (
                    <div>
                      <Label htmlFor="taxRate">Tax Rate (%)</Label>
                      <Input
                        id="taxRate"
                        type="number"
                        step="0.01"
                        value={form.taxRate}
                        onChange={(e) => setForm({ ...form, taxRate: parseFloat(e.target.value) || 0 })}
                        placeholder="12"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="isActive" className="text-sm font-medium">
                    Active
                  </Label>
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

        {editingFeeType && (
          <Dialog open={!!editingFeeType} onOpenChange={(open) => !open && setEditingFeeType(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit Fee Type</DialogTitle>
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
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-glAccount">GL Account Code</Label>
                  <Input
                    id="edit-glAccount"
                    value={form.glAccount}
                    onChange={(e) => setForm({ ...form, glAccount: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.isTaxable}
                      onChange={(e) => setForm({ ...form, isTaxable: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Taxable</span>
                  </label>
                  {form.isTaxable && (
                    <div>
                      <Label htmlFor="edit-taxRate">Tax Rate (%)</Label>
                      <Input
                        id="edit-taxRate"
                        type="number"
                        step="0.01"
                        value={form.taxRate}
                        onChange={(e) => setForm({ ...form, taxRate: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-isActive"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="edit-isActive" className="text-sm font-medium">
                    Active
                  </Label>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingFeeType(null)}>Cancel</Button>
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
                placeholder="Search fee types..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as 'all' | 'active' | 'inactive')}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns as any}
          data={feeTypes}
          isLoading={isLoading}
          emptyMessage="No fee types found."
          emptyDescription="Get started by configuring your school fee types."
          emptyAction={
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              <span>Create Fee Type</span>
            </Button>
          }
        />

      </div>
    </>
  );
}