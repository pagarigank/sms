'use client';

import * as React from 'react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useLookupValues } from '@/lib/use-lookup';
import { Plus, Edit, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusDot,
  statusToVariant,
  useToast,
  useConfirm,
  type ColumnDef,
} from '@sms/ui';

const ROOM_TYPES_FALLBACK = ['classroom', 'laboratory', 'office', 'clinic', 'cashier', 'canteen', 'library', 'gym', 'stockroom'];

export default function RoomsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  
  const [showCreate, setShowCreate] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any | null>(null);
  
  const defaultForm = { branchId: '', buildingId: '', floorId: '', name: '', roomType: 'classroom', capacity: '', status: 'active' };
  const [form, setForm] = useState(defaultForm);

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => apiClient.facility.listRooms(),
  });

  const { data: branchesRes } = useQuery({
    queryKey: ['branches'],
    queryFn: () => apiClient.branches.list({ limit: 100 }),
  });
  const branches = branchesRes?.data?.data ?? [];

  const { data: buildingsRes } = useQuery({
    queryKey: ['buildings', form.branchId],
    queryFn: () => apiClient.facility.listBuildings({ branchId: form.branchId!, limit: 100 }),
    enabled: !!form.branchId,
  });
  const buildings = buildingsRes?.data ?? [];

  const { data: floorsRes } = useQuery({
    queryKey: ['floors', form.buildingId],
    queryFn: () => apiClient.facility.listFloors({ buildingId: form.buildingId! }),
    enabled: !!form.buildingId,
  });
  const floors = floorsRes?.data ?? [];

  const roomTypes = useLookupValues('room_type', ROOM_TYPES_FALLBACK);

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiClient.facility.createRoom({
        ...data,
        capacity: data.capacity ? parseInt(data.capacity) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setShowCreate(false);
      setForm(defaultForm);
      toast({ title: 'Room created', description: 'The room has been added to the facility registry.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof form> }) =>
      apiClient.facility.updateRoom(id, {
        ...data,
        capacity: data.capacity ? parseInt(data.capacity as string) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setEditingRoom(null);
      setForm(defaultForm);
      setShowCreate(false);
      toast({ title: 'Room updated', description: 'The room has been updated.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.facility.deleteRoom(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast({ title: 'Room deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleEdit = React.useCallback((room: any) => {
    setEditingRoom(room);
    setForm({
      branchId: room.branchId || '',
      buildingId: room.floor?.buildingId || '',
      floorId: room.floorId || '',
      name: room.name || '',
      roomType: room.roomType || 'classroom',
      capacity: room.capacity ? room.capacity.toString() : '',
      status: room.status || 'active',
    });
    setShowCreate(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRoom) {
      updateMutation.mutate({ id: editingRoom.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const columns = React.useMemo<ColumnDef<any, any>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-medium text-[hsl(var(--foreground))]">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'roomType',
      header: 'Type',
      cell: ({ row }) => (
        <span className="text-[hsl(var(--ink-200))] capitalize">{row.original.roomType}</span>
      ),
    },
    {
      accessorKey: 'capacity',
      header: 'Capacity',
      cell: ({ row }) => (
        <span className="text-[hsl(var(--ink-200))]">{row.original.capacity ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'floor',
      header: 'Floor',
      cell: ({ row }) => (
        <span className="text-[hsl(var(--ink-200))]">{row.original.floor?.label || '—'}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={statusToVariant(row.original.status)}>
          <StatusDot />
          {row.original.status
            ? row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)
            : 'Unknown'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: ({ row }) => {
        const room = row.original;
        return (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(room)}
              className="h-8 w-8 p-0"
              aria-label="Edit room"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const ok = await confirm({
                  title: `Delete ${room.name}?`,
                  description: "This action cannot be undone.",
                  confirmLabel: "Delete",
                  destructive: true,
                });
                if (ok) deleteMutation.mutate(room.id);
              }}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              aria-label="Delete room"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ], [handleEdit, confirm, deleteMutation]);

  const dataList = Array.isArray(rooms) ? rooms : ((rooms as any)?.data as any[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rooms</h1>
          <p className="text-muted-foreground">Manage rooms across all buildings</p>
        </div>
        <Button onClick={() => {
          setEditingRoom(null);
          setForm(defaultForm);
          setShowCreate(true);
        }}>
          <Plus className="h-4 w-4" /> Add Room
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={dataList}
        isLoading={isLoading}
        emptyMessage="No rooms found."
        emptyDescription="Add your first room to start mapping the campus."
        emptyAction={
          <Button size="sm" onClick={() => {
            setEditingRoom(null);
            setForm(defaultForm);
            setShowCreate(true);
          }}>
            <Plus className="h-4 w-4" /> Add Room
          </Button>
        }
      />

      <Dialog open={showCreate} onOpenChange={(open) => {
        if (!open) {
          setShowCreate(false);
          setEditingRoom(null);
          setForm(defaultForm);
        } else {
          setShowCreate(true);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRoom ? 'Edit Room' : 'Create Room'}</DialogTitle>
            <DialogDescription>{editingRoom ? 'Update room details.' : 'Register a new room under a floor.'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="branchId">Branch</Label>
                <Select value={form.branchId} onValueChange={(v) => setForm({ ...form, branchId: v, buildingId: '', floorId: '' })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="buildingId">Building</Label>
                <Select disabled={!form.branchId} value={form.buildingId} onValueChange={(v) => setForm({ ...form, buildingId: v, floorId: '' })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select Building" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="floorId">Floor</Label>
                <Select disabled={!form.buildingId} value={form.floorId} onValueChange={(v) => setForm({ ...form, floorId: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select Floor" />
                  </SelectTrigger>
                  <SelectContent>
                    {floors.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.label || `Floor ${f.floorNumber}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="room-name">Name</Label>
                <Input
                  id="room-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label>Room Type</Label>
                <Select value={form.roomType} onValueChange={(v) => setForm({ ...form, roomType: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roomTypes.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="room-capacity">Capacity</Label>
                <Input
                  id="room-capacity"
                  type="number"
                  min={0}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setShowCreate(false);
                setEditingRoom(null);
                setForm(defaultForm);
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
