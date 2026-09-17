'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { DataTable } from '@sms/ui';
import { ColumnDef } from '@tanstack/react-table';
import { useToast, useConfirm, Badge, StatusDot } from '@sms/ui';
import { Plus, Search, Edit, Trash2, Receipt } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@sms/ui';
import { Button } from '@sms/ui';
import { Input } from '@sms/ui';
import { Label } from '@sms/ui';
import { useTenantStore } from '@/lib/store';

interface PaymentPlan {
  id: string;
  name: string;
  description?: string;
  numberOfInstallments: number;
  cashDiscountPercentage: number;
  installmentFee: number;
  penaltyPercentage: number;
  isActive: boolean;
}

export default function PaymentPlansPage() {
  const { currentTenantId } = useTenantStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PaymentPlan | null>(null);
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    numberOfInstallments: 1,
    cashDiscountPercentage: 0,
    installmentFee: 0,
    penaltyPercentage: 0,
    isActive: true,
  });

  const { data: plansRes, isLoading } = useQuery({
    queryKey: ['payment-plans', currentTenantId],
    queryFn: () => apiClient.billing.getPaymentPlans({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });

  const plans: PaymentPlan[] = (plansRes?.data as PaymentPlan[]) ?? [];

  const filteredPlans = plans.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiClient.billing.createPaymentPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-plans'] });
      setShowCreate(false);
      resetForm();
      toast({ title: 'Payment Plan created', description: 'Payment plan has been created successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: PaymentPlan) => apiClient.billing.updatePaymentPlan(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-plans'] });
      setEditingPlan(null);
      toast({ title: 'Payment Plan updated', description: 'Payment plan has been updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.billing.deletePaymentPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-plans'] });
      toast({ title: 'Payment Plan deleted', description: 'Payment plan has been permanently deleted.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      numberOfInstallments: 1,
      cashDiscountPercentage: 0,
      installmentFee: 0,
      penaltyPercentage: 0,
      isActive: true,
    });
  };

  const handleCreate = () => {
    if (!form.name || form.numberOfInstallments < 1) {
      toast({ title: 'Validation Error', description: 'Name and a valid number of installments are required.', variant: 'destructive' });
      return;
    }
    createMutation.mutate(form);
  };

  const handleUpdate = () => {
    if (!editingPlan) return;
    if (!editingPlan.name || editingPlan.numberOfInstallments < 1) {
      toast({ title: 'Validation Error', description: 'Name and a valid number of installments are required.', variant: 'destructive' });
      return;
    }
    updateMutation.mutate(editingPlan);
  };

  const handleDelete = async (plan: PaymentPlan) => {
    const ok = await confirm({
      title: 'Delete Payment Plan',
      description: `Are you sure you want to delete ${plan.name}? This action cannot be undone. If it is already in use, it will be deactivated instead.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) {
      deleteMutation.mutate(plan.id);
    }
  };

  const columns: ColumnDef<any, any>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Badge variant={row.original.isActive ? 'success' : 'neutral'}>
            <StatusDot />
            {row.original.isActive ? 'Active' : 'Archived'}
          </Badge>
          <span className="font-medium text-ink-100">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => <span className="text-ink-200">{row.original.description || '-'}</span>,
    },
    {
      accessorKey: 'numberOfInstallments',
      header: 'Installments',
      cell: ({ row }) => (
        <Badge variant={row.original.numberOfInstallments > 1 ? 'info' : 'neutral'}>
          {row.original.numberOfInstallments} payments
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => setEditingPlan(row.original)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => handleDelete(row.original)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-100 flex items-center gap-2">
            <Receipt className="h-6 w-6 text-accent" />
            Payment Plans
          </h1>
          <p className="text-ink-200 text-sm mt-1">Manage billing schedules, installments, and fees.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-ink-300" />
            <Input
              placeholder="Search plans..."
              className="pl-9 bg-surface-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Plan
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="surface-card p-0 overflow-hidden">
        <DataTable columns={columns as any} data={filteredPlans} isLoading={isLoading} />
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => {
        setShowCreate(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Payment Plan</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Quarterly, Monthly (10x)" />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Number of Installments</Label>
                <Input type="number" min={1} value={form.numberOfInstallments} onChange={(e) => setForm({ ...form, numberOfInstallments: parseInt(e.target.value) || 1 })} />
              </div>
              <div className="grid gap-2">
                <Label>Installment Fee (₱)</Label>
                <Input type="number" min={0} value={form.installmentFee} onChange={(e) => setForm({ ...form, installmentFee: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded border-border text-accent focus:ring-accent" />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={createMutation.isPending}>Create Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingPlan} onOpenChange={(open) => {
        if (!open) setEditingPlan(null);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Payment Plan</DialogTitle>
          </DialogHeader>
          {editingPlan && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input value={editingPlan.name} onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Input value={editingPlan.description || ''} onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Number of Installments</Label>
                  <Input type="number" min={1} value={editingPlan.numberOfInstallments} onChange={(e) => setEditingPlan({ ...editingPlan, numberOfInstallments: parseInt(e.target.value) || 1 })} />
                </div>
                <div className="grid gap-2">
                  <Label>Installment Fee (₱)</Label>
                  <Input type="number" min={0} value={editingPlan.installmentFee} onChange={(e) => setEditingPlan({ ...editingPlan, installmentFee: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="editIsActive" checked={editingPlan.isActive} onChange={(e) => setEditingPlan({ ...editingPlan, isActive: e.target.checked })} className="rounded border-border text-accent focus:ring-accent" />
                <Label htmlFor="editIsActive">Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPlan(null)}>Cancel</Button>
            <Button onClick={handleUpdate} loading={updateMutation.isPending}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
