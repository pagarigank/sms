'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { DataTable } from '@sms/ui';
import type { ColumnDef } from '@tanstack/react-table';
import { useToast, useConfirm, Badge, statusToVariant, StatusDot } from '@sms/ui';
import { Plus, Search, Edit, Trash2, Layers, ChevronLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@sms/ui';
import { Button } from '@sms/ui';
import { Input } from '@sms/ui';
import { Label } from '@sms/ui';

interface Floor {
  id: string;
  buildingId: string;
  label: string;
  floorNumber: number;
  buildingName?: string;
  tenantId: string;
  createdAt: string;
}

interface Building {
  id: string;
  name: string;
  code?: string;
}

export default function FloorsPage() {
  const params = useParams();
  const buildingId = params.buildingId as string;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null);
  const [formLabel, setFormLabel] = useState('');
  const [formFloorNumber, setFormFloorNumber] = useState('');

  const { data: buildingRes } = useQuery({
    queryKey: ['building', buildingId],
    queryFn: () => apiClient.facility.getBuilding(buildingId),
  });

  const { data: floorsRes, isLoading } = useQuery({
    queryKey: ['floors', buildingId],
    queryFn: () => apiClient.facility.listFloors({ buildingId }),
  });
  // Backend floors route has no search param — filter client-side.
  const building = (buildingRes?.data as unknown as Building | undefined) ?? null;
  const allFloors: Floor[] = ((floorsRes?.data as unknown) as Floor[] | undefined) ?? [];
  const floors = searchQuery
    ? allFloors.filter((f) => f.label?.toLowerCase().includes(searchQuery.toLowerCase()))
    : allFloors;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['floors', buildingId] });

  const createMutation = useMutation({
    mutationFn: (data: { buildingId: string; label: string; floorNumber: number }) =>
      apiClient.facility.createFloor(data),
    onSuccess: () => {
      invalidate();
      setShowCreate(false);
      setFormLabel('');
      setFormFloorNumber('');
      toast({ title: 'Floor created', description: 'Floor has been created successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Floor> }) =>
      apiClient.facility.updateFloor(id, data),
    onSuccess: () => {
      invalidate();
      setEditingFloor(null);
      toast({ title: 'Floor updated', description: 'Floor has been updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.facility.deleteFloor(id),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Floor deleted', description: 'Floor has been permanently deleted.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const openCreate = () => {
    setFormLabel('');
    setFormFloorNumber('');
    setShowCreate(true);
  };

  const openEdit = (floor: Floor) => {
    setFormLabel(floor.label);
    setFormFloorNumber(String(floor.floorNumber));
    setEditingFloor(floor);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      buildingId,
      label: formLabel,
      floorNumber: Number(formFloorNumber),
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFloor) return;
    updateMutation.mutate({
      id: editingFloor.id,
      data: { label: formLabel, floorNumber: Number(formFloorNumber) },
    });
  };

  const columns: ColumnDef<any, any>[] = [
    {
      accessorKey: 'label',
      header: 'Label',
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">{row.original.label}</p>
            <p className="text-xs text-muted-foreground">Floor {row.original.floorNumber}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'floorNumber',
      header: 'Floor #',
      cell: ({ row }) => <span className="font-medium">{row.original.floorNumber}</span>,
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const floor = row.original;
        return (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEdit(floor)}
              className="h-8 w-8 p-0"
              aria-label="Edit floor"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const ok = await confirm({
                  title: `Delete ${floor.label}?`,
                  description: "This action cannot be undone.",
                  confirmLabel: "Delete",
                  destructive: true,
                });
                if (ok) deleteMutation.mutate(floor.id);
              }}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              aria-label="Delete floor"
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link
              href="/facility/buildings"
              className="mb-1 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Back to Buildings
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Floors</h1>
            <p className="text-muted-foreground">Manage floors for {building?.name || 'this building'}</p>
          </div>
          <Button onClick={openCreate}>
            <span className="flex items-center space-x-1">
              <Plus className="h-4 w-4" />
              <span>Add Floor</span>
            </span>
          </Button>
        </div>

        {/* Create */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Floor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="Ground Floor, 1st Floor, etc."
                  required
                />
              </div>
              <div>
                <Label htmlFor="floorNumber">Floor Number</Label>
                <Input
                  id="floorNumber"
                  type="number"
                  value={formFloorNumber}
                  onChange={(e) => setFormFloorNumber(e.target.value)}
                  placeholder="0, 1, 2, -1 (basement)"
                  required
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

        {/* Edit */}
        <Dialog open={!!editingFloor} onOpenChange={(open) => !open && setEditingFloor(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Floor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="mt-4 space-y-4">
              <div>
                <Label htmlFor="edit-label">Label</Label>
                <Input
                  id="edit-label"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-floorNumber">Floor Number</Label>
                <Input
                  id="edit-floorNumber"
                  type="number"
                  value={formFloorNumber}
                  onChange={(e) => setFormFloorNumber(e.target.value)}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingFloor(null)}>Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Updating...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Filters */}
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search floors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <DataTable
          columns={columns as any}
          data={floors as any}
          isLoading={isLoading}
          emptyMessage="No floors found. Click 'Add Floor' to create your first floor."
        />

      </div>
    </>
  );
}
