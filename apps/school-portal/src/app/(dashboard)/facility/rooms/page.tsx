'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useLookupValues } from '@/lib/use-lookup';
import { Plus } from 'lucide-react';
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
  // ColumnDef from @sms/ui so it matches the DataTable prop type
  // (the workspace has duplicate react-table majors; this avoids variance errors).
  type ColumnDef,
} from '@sms/ui';

const ROOM_TYPES_FALLBACK = ['classroom', 'laboratory', 'office', 'clinic', 'cashier', 'canteen', 'library', 'gym', 'stockroom'];

export default function RoomsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ floorId: '', branchId: '', name: '', roomType: 'classroom', capacity: '' });

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => apiClient.facility.listRooms(),
  });

  // Room types are a tenant-configurable Lookup List (spec §8) — not a hardcode.
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
      setForm({ floorId: '', branchId: '', name: '', roomType: 'classroom', capacity: '' });
      toast({ title: 'Room created', description: 'The room has been added to the facility registry.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const columns: ColumnDef<any, any>[] = [
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
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rooms</h1>
          <p className="text-muted-foreground">Manage rooms across all buildings</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> Add Room
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={(rooms?.data as any[]) ?? []}
        isLoading={isLoading}
        emptyMessage="No rooms found."
        emptyDescription="Add your first room to start mapping the campus."
        emptyAction={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Add Room
          </Button>
        }
      />

      {/* Create Room dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Room</DialogTitle>
            <DialogDescription>Register a new room under a floor.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(form);
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 md:grid-cols-2">
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
                <Label htmlFor="room-floor">Floor ID</Label>
                <Input
                  id="room-floor"
                  value={form.floorId}
                  onChange={(e) => setForm({ ...form, floorId: e.target.value })}
                  className="mt-1"
                  required
                />
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
    </div>
  );
}
