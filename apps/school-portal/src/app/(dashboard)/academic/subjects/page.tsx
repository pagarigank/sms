'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { DataTable } from '@sms/ui';
import { ColumnDef } from '@tanstack/react-table';
import { useToast, useConfirm, Badge, statusToVariant, StatusDot } from '@sms/ui';
import { Plus, Search, BookOpen, Edit, Trash2, GraduationCap, CheckCircle, Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@sms/ui';
import { Button } from '@sms/ui';
import { Input } from '@sms/ui';
import { Label } from '@sms/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sms/ui';
import { Checkbox } from '@sms/ui';
import { cn } from '@sms/utils';

interface Subject {
  id: string;
  code: string;
  title: string;
  units: number;
  hoursPerWeek?: number;
  isCore: boolean;
  isElective: boolean;
  learningArea?: string;
  tenantId: string;
  createdAt: string;
}

export default function SubjectsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'core' | 'elective'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [form, setForm] = useState({
    code: '',
    title: '',
    units: 0,
    hoursPerWeek: 0,
    isCore: true,
    isElective: false,
    learningArea: '',
  });

  const { data: subjectsRes, isLoading } = useQuery({
    queryKey: ['subjects', searchQuery, typeFilter],
    queryFn: () => apiClient.academic.listSubjects({
      limit: 100,
      search: searchQuery,
      isCore: typeFilter === 'all' ? undefined : typeFilter === 'core',
    }),
  });

  const subjects: Subject[] = subjectsRes?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiClient.academic.createSubject({
      ...data,
      units: data.units,
      hoursPerWeek: data.hoursPerWeek || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setShowCreate(false);
      setForm({ code: '', title: '', units: 0, hoursPerWeek: 0, isCore: true, isElective: false, learningArea: '' });
      toast({ title: 'Subject created', description: 'Subject has been created successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Subject) => apiClient.academic.updateSubject(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setEditingSubject(null);
      toast({ title: 'Subject updated', description: 'Subject has been updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.academic.deleteSubject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast({ title: 'Subject deleted', description: 'Subject has been permanently deleted.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleEdit = (subject: Subject) => {
    setForm({
      code: subject.code,
      title: subject.title,
      units: subject.units,
      hoursPerWeek: subject.hoursPerWeek || 0,
      isCore: subject.isCore,
      isElective: subject.isElective,
      learningArea: subject.learningArea || '',
    });
    setEditingSubject(subject);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const unitsValue = form.units;
    const hoursValue = form.hoursPerWeek;
    if (editingSubject) {
      updateMutation.mutate({ ...form, id: editingSubject.id, units: unitsValue, hoursPerWeek: hoursValue } as Subject);
    } else {
      createMutation.mutate({ ...form, units: unitsValue, hoursPerWeek: hoursValue });
    }
  };

  const columns: ColumnDef<any, any>[] = [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => <span className="font-mono font-medium">{row.original.code}</span>,
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">{row.original.title}</p>
            <p className="text-xs text-muted-foreground">{row.original.learningArea || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'units',
      header: 'Units',
      cell: ({ row }) => <span className="font-medium">{row.original.units}</span>,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => {
        if (row.original.isCore && row.original.isElective) return (
          <Badge variant="accent">Core &amp; Elective</Badge>
        );
        if (row.original.isCore) return (
          <Badge variant="info">Core</Badge>
        );
        if (row.original.isElective) return (
          <Badge variant="secondary">Elective</Badge>
        );
        return <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: 'learningArea',
      header: 'Learning Area',
      cell: ({ row }) => row.original.learningArea || '—',
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      header: 'Actions',
      cell: ({ row }) => {
        const subject = row.original;
        return (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(subject)}
              className="h-8 w-8 p-0"
              aria-label="Edit subject"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const ok = await confirm({
                  title: `Delete ${subject.title}?`,
                  description: "This action cannot be undone.",
                  confirmLabel: "Delete",
                  destructive: true,
                });
                if (ok) deleteMutation.mutate(subject.id);
              }}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              aria-label="Delete subject"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label="View in curriculum"
              title="See which curricula include this subject"
              onClick={() => router.push('/academic/curricula')}
            >
              <BookOpen className="h-4 w-4" />
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
            <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
            <p className="text-muted-foreground">Manage subject/course catalog</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <span className="flex items-center space-x-1">
              <Plus className="h-4 w-4" />
              <span>Add Subject</span>
            </span>
          </Button>
        </div>

        {showCreate && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Subject</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="code">Code</Label>
                    <Input
                      id="code"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      placeholder="MATH101, ENGL101"
                      maxLength={20}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="College Algebra"
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="units">Units</Label>
                    <Input
                      id="units"
                      type="number"
                      step="0.5"
                      value={form.units}
                      onChange={(e) => setForm({ ...form, units: parseFloat(e.target.value) || 0 })}
                      placeholder="3"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="hoursPerWeek">Hours/Week</Label>
                    <Input
                      id="hoursPerWeek"
                      type="number"
                      step="0.5"
                      value={form.hoursPerWeek}
                      onChange={(e) => setForm({ ...form, hoursPerWeek: parseFloat(e.target.value) || 0 })}
                      placeholder="3"
                    />
                  </div>
                  <div>
                    <Label htmlFor="learningArea">Learning Area</Label>
                    <Input
                      id="learningArea"
                      value={form.learningArea}
                      onChange={(e) => setForm({ ...form, learningArea: e.target.value })}
                      placeholder="Mathematics, English, Science"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={form.isCore}
                      onCheckedChange={(checked) =>
                        setForm({ ...form, isCore: checked, isElective: !checked })
                      }
                    />
                    <span className="text-sm">Core Subject</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={form.isElective}
                      onCheckedChange={(checked) =>
                        setForm({ ...form, isElective: checked, isCore: !checked })
                      }
                    />
                    <span className="text-sm">Elective</span>
                  </label>
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

        {editingSubject && (
          <Dialog open={!!editingSubject} onOpenChange={(open) => !open && setEditingSubject(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit Subject</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="edit-code">Code</Label>
                    <Input
                      id="edit-code"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-title">Title</Label>
                    <Input
                      id="edit-title"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="edit-units">Units</Label>
                    <Input
                      id="edit-units"
                      type="number"
                      step="0.5"
                      value={form.units}
                      onChange={(e) => setForm({ ...form, units: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-hoursPerWeek">Hours/Week</Label>
                    <Input
                      id="edit-hoursPerWeek"
                      type="number"
                      step="0.5"
                      value={form.hoursPerWeek}
                      onChange={(e) => setForm({ ...form, hoursPerWeek: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-learningArea">Learning Area</Label>
                    <Input
                      id="edit-learningArea"
                      value={form.learningArea}
                      onChange={(e) => setForm({ ...form, learningArea: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={form.isCore}
                      onCheckedChange={(checked) =>
                        setForm({ ...form, isCore: checked, isElective: !checked })
                      }
                    />
                    <span className="text-sm">Core Subject</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={form.isElective}
                      onCheckedChange={(checked) =>
                        setForm({ ...form, isElective: checked, isCore: !checked })
                      }
                    />
                    <span className="text-sm">Elective</span>
                  </label>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingSubject(null)}>Cancel</Button>
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
                placeholder="Search subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value as 'all' | 'core' | 'elective')}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="core">Core</SelectItem>
                <SelectItem value="elective">Elective</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns as any}
          data={subjects}
          isLoading={isLoading}
          emptyMessage="No subjects found."
          emptyDescription="Get started by adding subjects to your academic catalog."
          emptyAction={
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              <span>Create Subject</span>
            </Button>
          }
        />

      </div>
    </>
  );
}