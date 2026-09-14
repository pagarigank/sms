'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { DataTable } from '@sms/ui';
import { ColumnDef } from '@tanstack/react-table';
import { useToast, useConfirm, Badge, statusToVariant, StatusDot } from '@sms/ui';
import { Plus, Search, BookOpen, Edit, Trash2, Copy, CheckCircle, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@sms/ui';
import { Button } from '@sms/ui';
import { Input } from '@sms/ui';
import { Label } from '@sms/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sms/ui';
import { cn } from '@sms/utils';

interface Curriculum {
  id: string;
  educationLevelId: string;
  gradeLevelId?: string;
  strandId?: string;
  programId?: string;
  schoolYearId: string;
  status: string;
  versionLabel?: string;
  clonedFromCurriculumId?: string;
  clonedAt?: string;
  clonedBy?: string;
  educationLevelName?: string;
  gradeLevelName?: string;
  schoolYearName?: string;
  tenantId: string;
  branchId?: string;
  createdAt: string;
}

interface EducationLevel {
  id: string;
  name: string;
  code: string;
}

interface GradeLevel {
  id: string;
  name: string;
  code: string;
  educationLevelId: string;
}

interface SchoolYear {
  id: string;
  name: string;
  status: string;
}

interface Strand {
  id: string;
  name: string;
  code: string;
}

interface Program {
  id: string;
  name: string;
  code: string;
}

export default function CurriculaPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [searchQuery, setSearchQuery] = useState('');
  const [educationLevelFilter, setEducationLevelFilter] = useState<string>('all');
  const [schoolYearFilter, setSchoolYearFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editingCurriculum, setEditingCurriculum] = useState<Curriculum | null>(null);
  const [form, setForm] = useState({
    educationLevelId: '',
    gradeLevelId: '',
    strandId: '',
    programId: '',
    schoolYearId: '',
    versionLabel: '',
    status: 'draft',
  });

  const { data: curriculaRes, isLoading } = useQuery({
    queryKey: ['curricula', searchQuery, educationLevelFilter, schoolYearFilter],
    queryFn: () => apiClient.academic.listCurricula({
      limit: 100,
      search: searchQuery,
      educationLevelId: educationLevelFilter === 'all' ? undefined : educationLevelFilter,
      schoolYearId: schoolYearFilter === 'all' ? undefined : schoolYearFilter,
    }),
  });

  const { data: educationLevelsRes } = useQuery({
    queryKey: ['education-levels'],
    queryFn: () => apiClient.academic.listEducationLevels(),
  });

  const { data: gradeLevelsRes } = useQuery({
    queryKey: ['grade-levels', educationLevelFilter],
    queryFn: async () => {
      if (educationLevelFilter === 'all') return { data: [] };
      return apiClient.academic.listGradeLevels({ educationLevelId: educationLevelFilter });
    },
    enabled: educationLevelFilter !== 'all',
  });

  const { data: schoolYearsRes } = useQuery({
    queryKey: ['school-years'],
    queryFn: () => apiClient.academic.listSchoolYears({ limit: 100 }),
  });

  const { data: strandsRes } = useQuery({
    queryKey: ['strands'],
    queryFn: () => apiClient.academic.listStrands({ limit: 100 }),
  });

  const { data: programsRes } = useQuery({
    queryKey: ['programs'],
    queryFn: () => apiClient.academic.listPrograms({ limit: 100 }),
  });

  const educationLevels: EducationLevel[] = educationLevelsRes?.data ?? [];
  const gradeLevels: GradeLevel[] = gradeLevelsRes?.data ?? [];
  const schoolYears: SchoolYear[] = schoolYearsRes?.data ?? [];
  const strands: Strand[] = strandsRes?.data ?? [];
  const programs: Program[] = programsRes?.data ?? [];
  const curricula: Curriculum[] = curriculaRes?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiClient.academic.createCurriculum(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curricula'] });
      setShowCreate(false);
      setForm({ educationLevelId: '', gradeLevelId: '', strandId: '', programId: '', schoolYearId: '', versionLabel: '', status: 'draft' });
      toast({ title: 'Curriculum created', description: 'Curriculum has been created successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Curriculum) => apiClient.academic.updateCurriculum(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curricula'] });
      setEditingCurriculum(null);
      toast({ title: 'Curriculum updated', description: 'Curriculum has been updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.academic.deleteCurriculum(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curricula'] });
      toast({ title: 'Curriculum deleted', description: 'Curriculum has been permanently deleted.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const cloneMutation = useMutation({
    mutationFn: (id: string) => apiClient.academic.cloneCurriculum(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curricula'] });
      toast({ title: 'Curriculum cloned', description: 'Curriculum has been cloned successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => apiClient.academic.publishCurriculum(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curricula'] });
      toast({ title: 'Curriculum published', description: 'Curriculum has been published successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleEdit = (curriculum: Curriculum) => {
    setForm({
      educationLevelId: curriculum.educationLevelId,
      gradeLevelId: curriculum.gradeLevelId || '',
      strandId: curriculum.strandId || '',
      programId: curriculum.programId || '',
      schoolYearId: curriculum.schoolYearId,
      versionLabel: curriculum.versionLabel || '',
      status: curriculum.status,
    });
    setEditingCurriculum(curriculum);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCurriculum) {
      updateMutation.mutate({ ...form, id: editingCurriculum.id } as Curriculum);
    } else {
      createMutation.mutate(form);
    }
  };

  const handleEducationLevelChange = (educationLevelId: string) => {
    setForm(prev => ({ ...prev, educationLevelId, gradeLevelId: '', strandId: '', programId: '' }));
  };

  const columns: ColumnDef<any, any>[] = [
    {
      accessorKey: 'versionLabel',
      header: 'Version',
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">{row.original.versionLabel || 'Version 1.0'}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.educationLevelName || row.original.educationLevelId}
              {row.original.gradeLevelName ? ` • ${row.original.gradeLevelName}` : ''}
              {row.original.schoolYearName ? ` • ${row.original.schoolYearName}` : ''}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'educationLevelName',
      header: 'Education Level',
      cell: ({ row }) => row.original.educationLevelName || row.original.educationLevelId,
    },
    {
      accessorKey: 'gradeLevelName',
      header: 'Grade Level',
      cell: ({ row }) => row.original.gradeLevelName || '—',
    },
    {
      accessorKey: 'schoolYearName',
      header: 'School Year',
      cell: ({ row }) => row.original.schoolYearName || row.original.schoolYearId,
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
        const curriculum = row.original;
        return (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(curriculum)}
              className="h-8 w-8 p-0"
              aria-label="Edit curriculum"
            >
              <Edit className="h-4 w-4" />
            </Button>
            {curriculum.status === 'draft' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => publishMutation.mutate(curriculum.id)}
                className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                aria-label="Publish curriculum"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => cloneMutation.mutate(curriculum.id)}
              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
              aria-label="Clone curriculum"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const ok = await confirm({
                  title: `Delete ${curriculum.versionLabel || curriculum.id}?`,
                  description: "This action cannot be undone.",
                  confirmLabel: "Delete",
                  destructive: true,
                });
                if (ok) deleteMutation.mutate(curriculum.id);
              }}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              aria-label="Delete curriculum"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label="Manage subjects"
            >
              <Settings className="h-4 w-4" />
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
            <h1 className="text-3xl font-bold tracking-tight">Curricula</h1>
            <p className="text-muted-foreground">Manage curricula per education level, grade level, and school year</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <span className="flex items-center space-x-1">
              <Plus className="h-4 w-4" />
              <span>Create Curriculum</span>
            </span>
          </Button>
        </div>

        {showCreate && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Curriculum</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="educationLevelId">Education Level</Label>
                    <Select
                      value={form.educationLevelId}
                      onValueChange={(value) => handleEducationLevelChange(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select education level" />
                      </SelectTrigger>
                      <SelectContent>
                        {educationLevels.map((level) => (
                          <SelectItem key={level.id} value={level.id}>
                            {level.name} ({level.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="schoolYearId">School Year</Label>
                    <Select
                      value={form.schoolYearId}
                      onValueChange={(value) => setForm({ ...form, schoolYearId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select school year" />
                      </SelectTrigger>
                      <SelectContent>
                        {schoolYears.map((sy) => (
                          <SelectItem key={sy.id} value={sy.id}>
                            {sy.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="gradeLevelId">Grade Level</Label>
                    <Select
                      value={form.gradeLevelId}
                      onValueChange={(value) => setForm({ ...form, gradeLevelId: value })}
                      disabled={!form.educationLevelId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={form.educationLevelId ? "Select grade level" : "Select education level first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {gradeLevels.map((gl) => (
                          <SelectItem key={gl.id} value={gl.id}>
                            {gl.name} ({gl.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="strandId">Strand (SHS)</Label>
                    <Select
                      value={form.strandId}
                      onValueChange={(value) => setForm({ ...form, strandId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select strand" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {strands.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({s.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="programId">Program (College)</Label>
                    <Select
                      value={form.programId}
                      onValueChange={(value) => setForm({ ...form, programId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {programs.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} ({p.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="versionLabel">Version Label</Label>
                  <Input
                    id="versionLabel"
                    value={form.versionLabel}
                    onChange={(e) => setForm({ ...form, versionLabel: e.target.value })}
                    placeholder="v1.0, 2026 Edition"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) => setForm({ ...form, status: value as 'draft' | 'active' | 'archived' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
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

        {editingCurriculum && (
          <Dialog open={!!editingCurriculum} onOpenChange={(open) => !open && setEditingCurriculum(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Curriculum</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="edit-educationLevelId">Education Level</Label>
                    <Select
                      value={form.educationLevelId}
                      onValueChange={(value) => handleEducationLevelChange(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select education level" />
                      </SelectTrigger>
                      <SelectContent>
                        {educationLevels.map((level) => (
                          <SelectItem key={level.id} value={level.id}>
                            {level.name} ({level.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-schoolYearId">School Year</Label>
                    <Select
                      value={form.schoolYearId}
                      onValueChange={(value) => setForm({ ...form, schoolYearId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select school year" />
                      </SelectTrigger>
                      <SelectContent>
                        {schoolYears.map((sy) => (
                          <SelectItem key={sy.id} value={sy.id}>
                            {sy.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="edit-gradeLevelId">Grade Level</Label>
                    <Select
                      value={form.gradeLevelId}
                      onValueChange={(value) => setForm({ ...form, gradeLevelId: value })}
                      disabled={!form.educationLevelId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={form.educationLevelId ? "Select grade level" : "Select education level first"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {gradeLevels.map((gl) => (
                          <SelectItem key={gl.id} value={gl.id}>
                            {gl.name} ({gl.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-strandId">Strand (SHS)</Label>
                    <Select
                      value={form.strandId}
                      onValueChange={(value) => setForm({ ...form, strandId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select strand" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {strands.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({s.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-programId">Program (College)</Label>
                    <Select
                      value={form.programId}
                      onValueChange={(value) => setForm({ ...form, programId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {programs.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} ({p.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-versionLabel">Version Label</Label>
                  <Input
                    id="edit-versionLabel"
                    value={form.versionLabel}
                    onChange={(e) => setForm({ ...form, versionLabel: e.target.value })}
                    placeholder="v1.0, 2026 Edition"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) => setForm({ ...form, status: value as 'draft' | 'active' | 'archived' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingCurriculum(null)}>Cancel</Button>
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
                placeholder="Search curricula..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={educationLevelFilter}
              onValueChange={(value) => setEducationLevelFilter(value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Education Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Education Levels</SelectItem>
                {educationLevels.map((level) => (
                  <SelectItem key={level.id} value={level.id}>
                    {level.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={schoolYearFilter}
              onValueChange={(value) => setSchoolYearFilter(value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All School Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All School Years</SelectItem>
                {schoolYears.map((sy) => (
                  <SelectItem key={sy.id} value={sy.id}>
                    {sy.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns as any}
          data={curricula}
          isLoading={isLoading}
          emptyMessage="No curricula found. Click 'Create Curriculum' to create your first curriculum."
        />

      </div>
    </>
  );
}