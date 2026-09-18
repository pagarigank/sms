'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
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
import { Plus, Search, Route, Edit, Trash2, BookOpen, Building } from 'lucide-react';
import { cn } from '@sms/utils';

interface Track {
  id: string;
  name: string;
  code: string;
  tenantId: string;
  createdAt: string;
}

interface Strand {
  id: string;
  trackId: string;
  name: string;
  code: string;
  trackName?: string;
  tenantId: string;
  createdAt: string;
}

export default function TracksPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<'tracks' | 'strands'>('tracks');
  const [searchQuery, setSearchQuery] = useState('');

  // Tracks state
  const [showCreateTrack, setShowCreateTrack] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [trackForm, setTrackForm] = useState({ name: '', code: '' });

  // Strands state
  const [showCreateStrand, setShowCreateStrand] = useState(false);
  const [editingStrand, setEditingStrand] = useState<Strand | null>(null);
  const [strandForm, setStrandForm] = useState({ trackId: '', name: '', code: '' });

  const { data: tracksRes } = useQuery({
    queryKey: ['tracks', searchQuery],
    queryFn: () => apiClient.academic.listTracks({ limit: 100, search: searchQuery }),
  });

  const { data: strandsRes } = useQuery({
    queryKey: ['strands', searchQuery],
    queryFn: () => apiClient.academic.listStrands({ limit: 100, search: searchQuery }),
  });

  const tracks: Track[] = tracksRes?.data ?? [];
  const strands: Strand[] = strandsRes?.data ?? [];

  // Track mutations
  const createTrackMutation = useMutation({
    mutationFn: (data: typeof trackForm) => apiClient.academic.createTrack(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      setShowCreateTrack(false);
      setTrackForm({ name: '', code: '' });
      toast({ title: 'Track created', description: 'Track has been created successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateTrackMutation = useMutation({
    mutationFn: (data: Track) => apiClient.academic.updateTrack(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      setEditingTrack(null);
      toast({ title: 'Track updated', description: 'Track has been updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteTrackMutation = useMutation({
    mutationFn: (id: string) => apiClient.academic.deleteTrack(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      toast({ title: 'Track deleted', description: 'Track has been permanently deleted.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Strand mutations
  const createStrandMutation = useMutation({
    mutationFn: (data: typeof strandForm) => apiClient.academic.createStrand(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strands'] });
      setShowCreateStrand(false);
      setStrandForm({ trackId: '', name: '', code: '' });
      toast({ title: 'Strand created', description: 'Strand has been created successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateStrandMutation = useMutation({
    mutationFn: (data: Strand) => apiClient.academic.updateStrand(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strands'] });
      setEditingStrand(null);
      toast({ title: 'Strand updated', description: 'Strand has been updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteStrandMutation = useMutation({
    mutationFn: (id: string) => apiClient.academic.deleteStrand(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strands'] });
      toast({ title: 'Strand deleted', description: 'Strand has been permanently deleted.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleEditTrack = (track: Track) => {
    setTrackForm({ name: track.name, code: track.code });
    setEditingTrack(track);
  };

  const handleEditStrand = (strand: Strand) => {
    setStrandForm({ trackId: strand.trackId, name: strand.name, code: strand.code });
    setEditingStrand(strand);
  };

  // Jump from a track row to its strands (the old button was decorative).
  const manageStrands = (track: Track) => {
    setSearchQuery(track.name);
    setActiveTab('strands');
  };

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTrack) {
      updateTrackMutation.mutate({ ...trackForm, id: editingTrack.id } as Track);
    } else {
      createTrackMutation.mutate(trackForm);
    }
  };

  const handleStrandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStrand) {
      updateStrandMutation.mutate({ ...strandForm, id: editingStrand.id } as Strand);
    } else {
      createStrandMutation.mutate(strandForm);
    }
  };

  const trackColumns: ColumnDef<any, any>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Route className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.code}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => <span className="font-mono font-medium">{row.original.code}</span>,
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      header: 'Actions',
      cell: ({ row }) => {
        const track = row.original;
        return (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditTrack(track)}
              className="h-8 w-8 p-0"
              aria-label="Edit track"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const ok = await confirm({
                  title: `Delete ${track.name}?`,
                  description: "This action cannot be undone.",
                  confirmLabel: "Delete",
                  destructive: true,
                });
                if (ok) deleteTrackMutation.mutate(track.id);
              }}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              aria-label="Delete track"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label="Manage strands"
              title="Manage strands under this track"
              onClick={() => manageStrands(track)}
            >
              <BookOpen className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const strandColumns: ColumnDef<any, any>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.code}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'trackName',
      header: 'Track',
      cell: ({ row }) => row.original.trackName || row.original.trackId,
    },
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => <span className="font-mono font-medium">{row.original.code}</span>,
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      header: 'Actions',
      cell: ({ row }) => {
        const strand = row.original;
        return (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditStrand(strand)}
              className="h-8 w-8 p-0"
              aria-label="Edit strand"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const ok = await confirm({
                  title: `Delete ${strand.name}?`,
                  description: "This action cannot be undone.",
                  confirmLabel: "Delete",
                  destructive: true,
                });
                if (ok) deleteStrandMutation.mutate(strand.id);
              }}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              aria-label="Delete strand"
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
        <PageHeader title="Tracks & Strands" description="Manage SHS tracks and strand configurations" />

        <div className="border-b">
          <nav className="flex space-x-4">
            <button
              onClick={() => setActiveTab('tracks')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'tracks'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Route className="h-4 w-4" />
              <span>Tracks</span>
            </button>
            <button
              onClick={() => setActiveTab('strands')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'strands'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Strands</span>
            </button>
          </nav>
        </div>

        {activeTab === 'tracks' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Tracks</h2>
                <p className="text-muted-foreground">Senior High School track configurations</p>
              </div>
              <Button onClick={() => setShowCreateTrack(true)}>
                <span className="flex items-center space-x-1">
                  <Plus className="h-4 w-4" />
                  <span>Add Track</span>
                </span>
              </Button>
            </div>

            {showCreateTrack && (
              <Dialog open={showCreateTrack} onOpenChange={setShowCreateTrack}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create Track</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleTrackSubmit} className="mt-4 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={trackForm.name}
                          onChange={(e) => setTrackForm({ ...trackForm, name: e.target.value })}
                          placeholder="Academic, TVL, Sports, Arts & Design"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="code">Code</Label>
                        <Input
                          id="code"
                          value={trackForm.code}
                          onChange={(e) => setTrackForm({ ...trackForm, code: e.target.value.toUpperCase() })}
                          placeholder="ACAD, TVL, SPRT, ARTS"
                          maxLength={10}
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setShowCreateTrack(false)}>Cancel</Button>
                      <Button type="submit" disabled={createTrackMutation.isPending}>
                        {createTrackMutation.isPending ? 'Creating...' : 'Create'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}

            {editingTrack && (
              <Dialog open={!!editingTrack} onOpenChange={(open) => !open && setEditingTrack(null)}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Edit Track</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleTrackSubmit} className="mt-4 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="edit-name">Name</Label>
                        <Input
                          id="edit-name"
                          value={trackForm.name}
                          onChange={(e) => setTrackForm({ ...trackForm, name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-code">Code</Label>
                        <Input
                          id="edit-code"
                          value={trackForm.code}
                          onChange={(e) => setTrackForm({ ...trackForm, code: e.target.value.toUpperCase() })}
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setEditingTrack(null)}>Cancel</Button>
                      <Button type="submit" disabled={updateTrackMutation.isPending}>
                        {updateTrackMutation.isPending ? 'Updating...' : 'Save Changes'}
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
                    placeholder="Search tracks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <DataTable
              columns={trackColumns as any}
              data={tracks}
              isLoading={false}
              emptyMessage="No tracks found. Click 'Add Track' to create your first track."
            />
          </>
        )}

        {activeTab === 'strands' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Strands</h2>
                <p className="text-muted-foreground">Specialized strands under each track</p>
              </div>
              <Button onClick={() => setShowCreateStrand(true)}>
                <span className="flex items-center space-x-1">
                  <Plus className="h-4 w-4" />
                  <span>Add Strand</span>
                </span>
              </Button>
            </div>

            {showCreateStrand && (
              <Dialog open={showCreateStrand} onOpenChange={setShowCreateStrand}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create Strand</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleStrandSubmit} className="mt-4 space-y-4">
                    <div>
                      <Label htmlFor="trackId">Track</Label>
                      <Select
                        value={strandForm.trackId}
                        onValueChange={(value) => setStrandForm({ ...strandForm, trackId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select track" />
                        </SelectTrigger>
                        <SelectContent>
                          {tracks.map((track) => (
                            <SelectItem key={track.id} value={track.id}>
                              {track.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={strandForm.name}
                          onChange={(e) => setStrandForm({ ...strandForm, name: e.target.value })}
                          placeholder="STEM, ABM, HUMSS, GAS"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="code">Code</Label>
                        <Input
                          id="code"
                          value={strandForm.code}
                          onChange={(e) => setStrandForm({ ...strandForm, code: e.target.value.toUpperCase() })}
                          placeholder="STEM, ABM, HUMSS"
                          maxLength={10}
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setShowCreateStrand(false)}>Cancel</Button>
                      <Button type="submit" disabled={createStrandMutation.isPending}>
                        {createStrandMutation.isPending ? 'Creating...' : 'Create'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}

            {editingStrand && (
              <Dialog open={!!editingStrand} onOpenChange={(open) => !open && setEditingStrand(null)}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Edit Strand</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleStrandSubmit} className="mt-4 space-y-4">
                    <div>
                      <Label htmlFor="edit-trackId">Track</Label>
                      <Select
                        value={strandForm.trackId}
                        onValueChange={(value) => setStrandForm({ ...strandForm, trackId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select track" />
                        </SelectTrigger>
                        <SelectContent>
                          {tracks.map((track) => (
                            <SelectItem key={track.id} value={track.id}>
                              {track.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="edit-name">Name</Label>
                        <Input
                          id="edit-name"
                          value={strandForm.name}
                          onChange={(e) => setStrandForm({ ...strandForm, name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-code">Code</Label>
                        <Input
                          id="edit-code"
                          value={strandForm.code}
                          onChange={(e) => setStrandForm({ ...strandForm, code: e.target.value.toUpperCase() })}
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setEditingStrand(null)}>Cancel</Button>
                      <Button type="submit" disabled={updateStrandMutation.isPending}>
                        {updateStrandMutation.isPending ? 'Updating...' : 'Save Changes'}
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
                    placeholder="Search strands..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <DataTable
              columns={strandColumns as any}
              data={strands}
              isLoading={false}
              emptyMessage="No strands found. Click 'Add Strand' to create your first strand."
            />
          </>
        )}

      </div>
    </>
  );
}