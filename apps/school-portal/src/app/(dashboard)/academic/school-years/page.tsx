'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { DataTable } from '@sms/ui';
import { ColumnDef } from '@tanstack/react-table';
import { useToast, useConfirm, Badge, statusToVariant, StatusDot } from '@sms/ui';
import { Plus, Search, Calendar, Edit, Trash2, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@sms/ui';
import { Button } from '@sms/ui';
import { Input } from '@sms/ui';
import { Label } from '@sms/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sms/ui';

interface SchoolYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  tenantId: string;
  branchId?: string;
  createdAt: string;
}

interface Tenant {
  id: string;
  name: string;
}

export default function SchoolYearsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived' | 'upcoming'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editingSchoolYear, setEditingSchoolYear] = useState<SchoolYear | null>(null);
  const [form, setForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    status: 'upcoming',
  });

  const { data: schoolYearsRes, isLoading } = useQuery({
    queryKey: ['school-years', searchQuery, statusFilter],
    queryFn: () => apiClient.academic.listSchoolYears({
      limit: 100,
      search: searchQuery,
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
  });

  const schoolYears: SchoolYear[] = schoolYearsRes?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiClient.academic.createSchoolYear(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-years'] });
      setShowCreate(false);
      setForm({ name: '', startDate: '', endDate: '', status: 'upcoming' });
      toast({ title: 'School Year created', description: 'School year has been created successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: SchoolYear) => apiClient.academic.updateSchoolYear(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-years'] });
      setEditingSchoolYear(null);
      toast({ title: 'School Year updated', description: 'School year has been updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.academic.deleteSchoolYear(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-years'] });
      toast({ title: 'School Year deleted', description: 'School year has been permanently deleted.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => apiClient.academic.activateSchoolYear(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-years'] });
      toast({ title: 'School Year activated', description: 'School year has been set as active.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleEdit = (schoolYear: SchoolYear) => {
    setForm({
      name: schoolYear.name,
      startDate: schoolYear.startDate,
      endDate: schoolYear.endDate,
      status: schoolYear.status,
    });
    setEditingSchoolYear(schoolYear);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSchoolYear) {
      updateMutation.mutate({ ...form, id: editingSchoolYear.id } as SchoolYear);
    } else {
      createMutation.mutate(form);
    }
  };

  const columns: ColumnDef<any, any>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">{row.original.name}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'startDate',
      header: 'Start Date',
      cell: ({ row }) => new Date(row.original.startDate).toLocaleDateString(),
    },
    {
      accessorKey: 'endDate',
      header: 'End Date',
      cell: ({ row }) => new Date(row.original.endDate).toLocaleDateString(),
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
        const schoolYear = row.original;
        return (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(schoolYear)}
              className="h-8 w-8 p-0"
              aria-label="Edit school year"
            >
              <Edit className="h-4 w-4" />
            </Button>
            {schoolYear.status !== 'active' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => activateMutation.mutate(schoolYear.id)}
                className="h-8 w-8 p-0 text-[hsl(var(--status-success-ink))] hover:text-[hsl(var(--status-success-ink))]"
                aria-label="Set as active"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"                onClick={async () => {
                  const ok = await confirm({
                    title: `Delete ${schoolYear.name}?`,
                    description: 'This action cannot be undone.',
                    confirmLabel: 'Delete',
                    destructive: true,
                  });
                  if (ok) deleteMutation.mutate(schoolYear.id);
                }}
                className="h-8 w-8 p-0 text-[hsl(var(--status-danger-ink))] hover:text-[hsl(var(--status-danger-ink))]"
              aria-label="Delete school year"
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">School Years</h1>
            <p className="text-muted-foreground">Manage academic school years and their terms</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <span className="flex items-center space-x-1">
              <Plus className="h-4 w-4" />
              <span>Add School Year</span>
            </span>
          </Button>
        </div>

        {showCreate && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create School Year</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="SY 2026-2027"
                    required
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) => setForm({ ...form, status: value as 'active' | 'archived' | 'upcoming' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
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

        {editingSchoolYear && (
          <Dialog open={!!editingSchoolYear} onOpenChange={(open) => !open && setEditingSchoolYear(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit School Year</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="edit-startDate">Start Date</Label>
                    <Input
                      id="edit-startDate"
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-endDate">End Date</Label>
                    <Input
                      id="edit-endDate"
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) => setForm({ ...form, status: value as 'active' | 'archived' | 'upcoming' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingSchoolYear(null)}>Cancel</Button>
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
                placeholder="Search school years..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as 'all' | 'active' | 'archived' | 'upcoming')}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns as any}
          data={schoolYears}
          isLoading={isLoading}
          emptyMessage="No school years found. Click 'Add School Year' to create your first school year."
        />
      </div>
    </>
  );
}