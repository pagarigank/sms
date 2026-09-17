'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { DataTable } from '@sms/ui';
import { ColumnDef } from '@tanstack/react-table';
import { useToast, useConfirm, Badge, statusToVariant, StatusDot } from '@sms/ui';
import { Plus, Search, Calendar, Edit, Trash2, CheckCircle, Repeat, ListOrdered, X } from 'lucide-react';
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

interface Term {
  id: string;
  schoolYearId: string;
  name: string;
  sequence: number;
  startDate?: string;
  endDate?: string;
  gradingDeadline?: string;
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

  // === Terms (FR-ACA-3): each school year carries its grading periods ===
  const [termsFor, setTermsFor] = useState<SchoolYear | null>(null);
  const [termEditing, setTermEditing] = useState<Term | null>(null);
  const [termForm, setTermForm] = useState({ name: '', sequence: '1', startDate: '', endDate: '', gradingDeadline: '' });

  const { data: termsRes, isLoading: termsLoading } = useQuery({
    queryKey: ['terms', termsFor?.id],
    queryFn: () => apiClient.academic.listTerms(termsFor!.id),
    enabled: !!termsFor,
  });
  const terms: Term[] = termsRes?.data ?? [];

  const createTermMutation = useMutation({
    mutationFn: (data: typeof termForm & { schoolYearId: string }) =>
      apiClient.academic.createTerm({
        ...data,
        sequence: Number(data.sequence) || 1,
        gradingDeadline: data.gradingDeadline || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      setTermForm({ name: '', sequence: String(terms.length + 1), startDate: '', endDate: '', gradingDeadline: '' });
      toast({ title: 'Term created' });
    },
    onError: (error: Error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const updateTermMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof termForm }) =>
      apiClient.academic.updateTerm(id, {
        ...data,
        sequence: Number(data.sequence) || 1,
        gradingDeadline: data.gradingDeadline || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      setTermEditing(null);
      toast({ title: 'Term updated' });
    },
    onError: (error: Error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const deleteTermMutation = useMutation({
    mutationFn: (id: string) => apiClient.academic.deleteTerm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      toast({ title: 'Term deleted' });
    },
    onError: (error: Error) => toast({ title: 'Cannot delete term', description: error.message, variant: 'destructive' }),
  });

  const openTerms = (schoolYear: SchoolYear) => {
    setTermsFor(schoolYear);
    setTermForm({ name: '', sequence: '1', startDate: '', endDate: '', gradingDeadline: '' });
    setTermEditing(null);
  };

  // === FR-CFG-6: Academic-year rollover wizard ===
  // Preview what would be cloned from the source year, then execute — the
  // backend clones terms, curricula (+subjects), grading systems (+components)
  // and honor-roll configs into the new year in ONE transaction.
  const [rolloverFor, setRolloverFor] = useState<SchoolYear | null>(null);
  const [rolloverForm, setRolloverForm] = useState({ name: '', startDate: '', endDate: '' });

  const { data: rolloverPreview, isLoading: previewLoading } = useQuery({
    queryKey: ['rollover-preview', rolloverFor?.id],
    queryFn: () => apiClient.academic.rolloverPreview(rolloverFor!.id),
    enabled: !!rolloverFor,
  });

  const rolloverMutation = useMutation({
    mutationFn: (vars: { sourceId: string; data: { name: string; startDate: string; endDate: string } }) =>
      apiClient.academic.rollover(vars.sourceId, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-years'] });
      setRolloverFor(null);
      toast({
        title: 'Rollover complete',
        description: 'Terms, curricula, grading systems and honor-roll configs were cloned into the new school year.',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Rollover failed', description: error.message, variant: 'destructive' });
    },
  });

  const openRollover = (schoolYear: SchoolYear) => {
    // Suggest the next year's name and dates from the source year.
    const startYear = new Date(schoolYear.startDate).getFullYear();
    setRolloverForm({
      name: schoolYear.name.replace(/\d{4}/, String(startYear + 1)),
      startDate: schoolYear.startDate,
      endDate: schoolYear.endDate,
    });
    setRolloverFor(schoolYear);
  };

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
              onClick={() => openTerms(schoolYear)}
              className="h-8 w-8 p-0"
              aria-label="Manage terms"
              title="Manage terms"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openRollover(schoolYear)}
              className="h-8 w-8 p-0"
              aria-label="Roll over to a new school year"
              title="Roll over to a new school year"
            >
              <Repeat className="h-4 w-4" />
            </Button>
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

        {/* FR-CFG-6: Rollover wizard — preview → confirm → execute */}
        {rolloverFor && (
          <Dialog open={!!rolloverFor} onOpenChange={(open) => !open && setRolloverFor(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Roll over from {rolloverFor.name}</DialogTitle>
              </DialogHeader>
              <div className="mt-2 space-y-4">
                {previewLoading ? (
                  <p className="text-sm text-muted-foreground">Counting what would be cloned…</p>
                ) : rolloverPreview ? (
                  <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/40 p-3 text-sm">
                    {(
                      [
                        ['Terms', rolloverPreview?.data?.terms],
                        ['Curricula', rolloverPreview?.data?.curricula],
                        ['Grading systems', rolloverPreview?.data?.gradingSystems],
                        ['Honor-roll configs', rolloverPreview?.data?.honorRollConfigs],
                      ] as [string, number | undefined][]
                    ).map(([label, value]) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium">{value ?? 0}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Preview unavailable — you can still proceed.</p>
                )}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    rolloverMutation.mutate({ sourceId: rolloverFor.id, data: rolloverForm });
                  }}
                  className="space-y-3"
                >
                  <div>
                    <Label htmlFor="rollover-name">New school year name</Label>
                    <Input
                      id="rollover-name"
                      value={rolloverForm.name}
                      onChange={(e) => setRolloverForm({ ...rolloverForm, name: e.target.value })}
                      placeholder="SY 2027-2028"
                      required
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label htmlFor="rollover-start">Start date</Label>
                      <Input
                        id="rollover-start"
                        type="date"
                        value={rolloverForm.startDate}
                        onChange={(e) => setRolloverForm({ ...rolloverForm, startDate: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="rollover-end">End date</Label>
                      <Input
                        id="rollover-end"
                        type="date"
                        value={rolloverForm.endDate}
                        onChange={(e) => setRolloverForm({ ...rolloverForm, endDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Clones the counts above into the new year in one transaction. Enrollments, sections and student data are
                    not copied — configure those after the rollover.
                  </p>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setRolloverFor(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={rolloverMutation.isPending}>
                      {rolloverMutation.isPending ? 'Rolling over…' : 'Execute rollover'}
                    </Button>
                  </DialogFooter>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* FR-ACA-3: Terms manager for one school year */}
        {termsFor && (
          <Dialog open={!!termsFor} onOpenChange={(open) => !open && setTermsFor(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Terms — {termsFor.name}</DialogTitle>
              </DialogHeader>
              <div className="mt-2 space-y-4">
                <div className="rounded-md border">
                  {termsLoading ? (
                    <p className="p-4 text-sm text-muted-foreground">Loading terms…</p>
                  ) : terms.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">
                      No terms yet. Add grading periods (e.g. 1st Quarter, Semester 1) — the rollover
                      wizard clones them into the next year.
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50 text-left">
                          <th className="px-3 py-2 font-medium">Seq</th>
                          <th className="px-3 py-2 font-medium">Name</th>
                          <th className="px-3 py-2 font-medium">Dates</th>
                          <th className="px-3 py-2 text-right font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {terms.map((t) => (
                          <tr key={t.id} className="border-b last:border-0">
                            <td className="px-3 py-2 font-mono">{t.sequence}</td>
                            <td className="px-3 py-2 font-medium">{t.name}</td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {t.startDate && t.endDate
                                ? `${new Date(t.startDate).toLocaleDateString()} – ${new Date(t.endDate).toLocaleDateString()}`
                                : '—'}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                aria-label={`Edit ${t.name}`}
                                onClick={() => {
                                  setTermEditing(t);
                                  setTermForm({
                                    name: t.name,
                                    sequence: String(t.sequence),
                                    startDate: t.startDate?.slice(0, 10) ?? '',
                                    endDate: t.endDate?.slice(0, 10) ?? '',
                                    gradingDeadline: t.gradingDeadline?.slice(0, 10) ?? '',
                                  });
                                }}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-[hsl(var(--status-danger-ink))] hover:text-[hsl(var(--status-danger-ink))]"
                                aria-label={`Delete ${t.name}`}
                                onClick={async () => {
                                  const ok = await confirm({
                                    title: `Delete ${t.name}?`,
                                    description: 'Terms referenced by curricula or enrollments cannot be deleted.',
                                    confirmLabel: 'Delete',
                                    destructive: true,
                                  });
                                  if (ok) deleteTermMutation.mutate(t.id);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (termEditing) {
                      updateTermMutation.mutate({ id: termEditing.id, data: termForm });
                    } else {
                      createTermMutation.mutate({ ...termForm, schoolYearId: termsFor.id });
                    }
                  }}
                  className="space-y-3 rounded-md border bg-muted/30 p-3"
                >
                  <p className="text-sm font-medium">
                    {termEditing ? `Edit ${termEditing.name}` : 'Add term'}
                    {termEditing && (
                      <button
                        type="button"
                        className="ml-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setTermEditing(null);
                          setTermForm({ name: '', sequence: String(terms.length + 1), startDate: '', endDate: '', gradingDeadline: '' });
                        }}
                      >
                        <X className="inline h-3 w-3" /> cancel edit
                      </button>
                    )}
                  </p>
                  <div className="grid gap-3 md:grid-cols-[5rem_1fr]">
                    <div>
                      <Label htmlFor="term-seq">Seq</Label>
                      <Input
                        id="term-seq"
                        type="number"
                        min={1}
                        value={termForm.sequence}
                        onChange={(e) => setTermForm({ ...termForm, sequence: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="term-name">Name</Label>
                      <Input
                        id="term-name"
                        value={termForm.name}
                        onChange={(e) => setTermForm({ ...termForm, name: e.target.value })}
                        placeholder="e.g. 1st Quarter, Semester 1"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <Label htmlFor="term-start">Start date</Label>
                      <Input
                        id="term-start"
                        type="date"
                        value={termForm.startDate}
                        onChange={(e) => setTermForm({ ...termForm, startDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="term-end">End date</Label>
                      <Input
                        id="term-end"
                        type="date"
                        value={termForm.endDate}
                        onChange={(e) => setTermForm({ ...termForm, endDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="term-deadline">Grading deadline</Label>
                      <Input
                        id="term-deadline"
                        type="date"
                        value={termForm.gradingDeadline}
                        onChange={(e) => setTermForm({ ...termForm, gradingDeadline: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    {termEditing && (
                      <Button type="button" variant="outline" onClick={() => setTermEditing(null)}>
                        Cancel
                      </Button>
                    )}
                    <Button
                      type="submit"
                      disabled={createTermMutation.isPending || updateTermMutation.isPending}
                    >
                      {termEditing
                        ? updateTermMutation.isPending ? 'Saving…' : 'Save changes'
                        : createTermMutation.isPending ? 'Adding…' : 'Add term'}
                    </Button>
                  </DialogFooter>
                </form>
              </div>
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
          emptyMessage="No school years found."
          emptyDescription="Get started by configuring your first school year."
          emptyAction={
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              <span>Create School Year</span>
            </Button>
          }
        />
      </div>
    </>
  );
}