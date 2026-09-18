'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { DataTable } from '@sms/ui';
import { ColumnDef } from '@tanstack/react-table';
import { useToast, useConfirm, Badge, StatusDot } from '@sms/ui';
import { Plus, Search, Edit, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@sms/ui';
import { Button } from '@sms/ui';
import { Input } from '@sms/ui';
import { Label } from '@sms/ui';
import { Checkbox } from '@sms/ui';
import Link from 'next/link';

interface Stage {
  id: string;
  stageName: string;
  stageCode: string;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
  tenantId: string;
}

export default function PipelineStagesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { currentTenantId } = useTenantStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [form, setForm] = useState({
    stageName: '',
    stageCode: '',
    sortOrder: 0,
    isDefault: false,
    isActive: true,
  });

  const { data: stagesRes, isLoading } = useQuery({
    queryKey: ['admissions-stages', currentTenantId],
    queryFn: () => apiClient.admissions.getStages({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });

  const allStages: Stage[] = (stagesRes as any)?.data ?? [];
  const stages = allStages.filter((s) =>
    !searchQuery.trim()
      ? true
      : `${s.stageName} ${s.stageCode}`.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiClient.admissions.createStage({ ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admissions-stages'] });
      setShowCreate(false);
      setForm({ stageName: '', stageCode: '', sortOrder: 0, isDefault: false, isActive: true });
      toast({ title: 'Stage created', description: 'Pipeline stage has been created.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Stage) => apiClient.admissions.updateStage(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admissions-stages'] });
      setEditingStage(null);
      toast({ title: 'Stage updated', description: 'Pipeline stage has been updated.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleEdit = (stage: Stage) => {
    setForm({
      stageName: stage.stageName,
      stageCode: stage.stageCode,
      sortOrder: stage.sortOrder,
      isDefault: stage.isDefault,
      isActive: stage.isActive,
    });
    setEditingStage(stage);
  };

  const handleSave = () => {
    if (!form.stageName.trim() || !form.stageCode.trim()) {
      toast({ title: 'Validation Error', description: 'Name and Code are required.', variant: 'destructive' });
      return;
    }
    if (editingStage) {
      updateMutation.mutate({ ...editingStage, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const columns: ColumnDef<any, any>[] = [
    {
      accessorKey: 'stageName',
      header: 'Name',
      cell: ({ row }: { row: any }) => <span className="font-medium">{row.original.stageName}</span>,
    },
    {
      accessorKey: 'stageCode',
      header: 'Code',
    },
    {
      accessorKey: 'sortOrder',
      header: 'Order',
    },
    {
      accessorKey: 'isDefault',
      header: 'Default',
      cell: ({ row }: { row: any }) => (
        row.original.isDefault ? <Badge variant="secondary">Yes</Badge> : <span className="text-muted-foreground">-</span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }: { row: any }) => (
        row.original.isActive ? (
          <div className="flex items-center gap-2"><StatusDot className="bg-green-500" /> Active</div>
        ) : (
          <div className="flex items-center gap-2"><StatusDot className="bg-red-500" /> Inactive</div>
        )
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }: { row: any }) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}>
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/sis/admissions">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configure Pipeline Stages</h1>
          <p className="text-muted-foreground">Manage the Kanban stages for the Admissions Pipeline.</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search stages..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Stage
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <DataTable
          columns={columns as any}
          data={stages}
          emptyMessage={isLoading ? 'Loading stages...' : 'No stages configured.'}
        />
      </div>

      <Dialog open={showCreate || !!editingStage} onOpenChange={(open) => {
        if (!open) {
          setShowCreate(false);
          setEditingStage(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStage ? 'Edit Stage' : 'Create Stage'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="stageName">Stage Name</Label>
              <Input
                id="stageName"
                value={form.stageName}
                onChange={(e) => setForm({ ...form, stageName: e.target.value })}
                placeholder="e.g. Assessment"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stageCode">Stage Code</Label>
              <Input
                id="stageCode"
                value={form.stageCode}
                onChange={(e) => setForm({ ...form, stageCode: e.target.value })}
                placeholder="e.g. assessment"
                disabled={!!editingStage}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Checkbox
                id="isDefault"
                checked={form.isDefault}
                onCheckedChange={(c) => setForm({ ...form, isDefault: c as boolean })}
              />
              <Label htmlFor="isDefault">Default Entry Stage</Label>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Checkbox
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(c) => setForm({ ...form, isActive: c as boolean })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreate(false);
              setEditingStage(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingStage ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
