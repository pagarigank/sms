'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useLookupValues } from '@/lib/use-lookup';
import { useParams } from 'next/navigation';
import { DataTable } from '@sms/ui';
import { ColumnDef } from '@tanstack/react-table';
import { useToast, useConfirm, Badge, statusToVariant, StatusDot } from '@sms/ui';
import { Plus, Search, Building, Edit, Trash2, Home, Maximize, Minimize } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@sms/ui';
import { Button } from '@sms/ui';
import { Input } from '@sms/ui';
import { Label } from '@sms/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sms/ui';
import { cn } from '@sms/utils';

interface Room {
  id: string;
  branchId: string;
  floorId: string;
  name: string;
  roomType: string;
  capacity?: number;
  status: string;
  seatingLayout?: string;
  equipmentTags?: string[];
  floorName?: string;
  branchName?: string;
  createdAt: string;
}

interface Floor {
  id: string;
  label: string;
  floorNumber: number;
  buildingId: string;
}

interface Branch {
  id: string;
  name: string;
  tenantId: string;
}

export default function RoomsPage() {
  const params = useParams();
  const floorId = params.floorId as string;
  const buildingId = params.buildingId as string;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [form, setForm] = useState({
    name: '',
    floorId: '',
    branchId: '',
    roomType: 'classroom',
    capacity: 0,
    status: 'active',
  });

  const { data: floorRes } = useQuery({
    queryKey: ['floor', floorId],
    queryFn: () => apiClient.facility.getFloor(floorId),
  });

  const { data: roomsRes, isLoading } = useQuery({
    queryKey: ['rooms', floorId, searchQuery, statusFilter, roomTypeFilter],
    queryFn: () => apiClient.facility.listRooms({
      floorId,
      limit: 100,
      search: searchQuery,
      status: statusFilter === 'all' ? undefined : statusFilter,
      roomType: roomTypeFilter === 'all' ? undefined : roomTypeFilter,
    }),
  });

  const { data: floorsRes } = useQuery({
    queryKey: ['floors', buildingId],
    queryFn: () => apiClient.facility.listFloors({ buildingId }),
  });

  const { data: branchesRes } = useQuery({
    queryKey: ['branches'],
    queryFn: () => apiClient.branches.list({ limit: 100 }),
  });

  const floor = floorRes?.data;
  const rooms: Room[] = roomsRes?.data ?? [];
  const floors: Floor[] = floorsRes?.data ?? [];
  const branches: Branch[] = (branchesRes?.data?.data ?? []) as Branch[];

  // Room types are a tenant-configurable Lookup List (spec §8) — not a hardcode.
  const roomTypes = useLookupValues('room_type', ['classroom', 'laboratory', 'gym', 'clinic', 'office', 'cashier', 'canteen', 'library', 'stockroom']);

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiClient.facility.createRoom({
      ...data,
      capacity: data.capacity || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', floorId] });
      setShowCreate(false);
      setForm({ name: '', floorId: floorId, branchId: '', roomType: 'classroom', capacity: 0, status: 'active' });
      toast({ title: 'Room created', description: 'Room has been created successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Room) => apiClient.facility.updateRoom(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', floorId] });
      setEditingRoom(null);
      toast({ title: 'Room updated', description: 'Room has been updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.facility.deleteRoom(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', floorId] });
      toast({ title: 'Room deleted', description: 'Room has been permanently deleted.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleEdit = (room: Room) => {
    setForm({
      name: room.name,
      floorId: room.floorId,
      branchId: room.branchId,
      roomType: room.roomType,
      capacity: room.capacity || 0,
      status: room.status,
    });
    setEditingRoom(room);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const capacityValue = form.capacity || undefined;
    if (editingRoom) {
      const updateData = { ...form, id: editingRoom.id };
      if (capacityValue !== undefined) updateData.capacity = capacityValue;
      updateMutation.mutate(updateData as Room);
    } else {
      const createData = { ...form };
      if (capacityValue !== undefined) createData.capacity = capacityValue;
      createMutation.mutate(createData);
    }
  };

  const getRoomTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      classroom: <Home className="h-4 w-4" />,
      laboratory: <Maximize className="h-4 w-4" />,
      gym: <Minimize className="h-4 w-4" />,
      clinic: <Building className="h-4 w-4" />,
      office: <Building className="h-4 w-4" />,
    };
    return icons[type] || <Home className="h-4 w-4" />;
  };

  const columns: ColumnDef<any, any>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            {getRoomTypeIcon(row.original.roomType)}
          </div>
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{row.original.roomType}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'capacity',
      header: 'Capacity',
      cell: ({ row }) => row.original.capacity ? <span className="font-medium">{row.original.capacity}</span> : '—',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge variant={statusToVariant(status)}>
            <StatusDot />
            {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
          </Badge>
        );
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
  ];

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Rooms</h1>
            <p className="text-muted-foreground">Manage rooms for {floor?.label || 'Floor'}</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <span className="flex items-center space-x-1">
              <Plus className="h-4 w-4" />
              <span>Add Room</span>
            </span>
          </Button>
        </div>

        {showCreate && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Room</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Room 101"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="roomType">Room Type</Label>
                    <Select
                      value={form.roomType}
                      onValueChange={(value) => setForm({ ...form, roomType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select room type" />
                      </SelectTrigger>
                      <SelectContent>
                        {roomTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })}
                    placeholder="30"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) => setForm({ ...form, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <input type="hidden" id="floorId" name="floorId" value={floorId} />
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

        {editingRoom && (
          <Dialog open={!!editingRoom} onOpenChange={(open) => !open && setEditingRoom(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit Room</DialogTitle>
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
                    <Label htmlFor="edit-roomType">Room Type</Label>
                    <Select
                      value={form.roomType}
                      onValueChange={(value) => setForm({ ...form, roomType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select room type" />
                      </SelectTrigger>
                      <SelectContent>
                        {roomTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-capacity">Capacity</Label>
                  <Input
                    id="edit-capacity"
                    type="number"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) => setForm({ ...form, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingRoom(null)}>Cancel</Button>
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
                placeholder="Search rooms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={roomTypeFilter}
              onValueChange={(value) => setRoomTypeFilter(value)}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {roomTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns as any}
          data={rooms}
          isLoading={isLoading}
          emptyMessage="No rooms found. Click 'Add Room' to create your first room."
        />

      </div>
    </>
  );
}