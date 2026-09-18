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
  DialogDescription,
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
import { Plus, Search, BookOpen, Edit, Trash2, Copy, CheckCircle, Settings, X, Loader2 } from 'lucide-react';
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

interface Subject {
  id: string;
  code: string;
  title: string;
}

interface Term {
  id: string;
  name: string;
  sequence: number;
}

interface CurriculumSubject {
  id: string;
  curriculumId: string;
  subjectId: string;
  termId?: string;
  yearLevelId?: string;
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

  // Grade levels for the create/edit dialogs follow the level chosen IN the
  // form (not the table filter) — otherwise the dropdown can be empty or
  // wrong whenever the table is filtered differently from what's being edited.
  const formLevelId = editingCurriculum?.educationLevelId || form.educationLevelId;
  const { data: formGradeLevelsRes } = useQuery({
    queryKey: ['grade-levels', 'for-form', formLevelId],
    queryFn: () => apiClient.academic.listGradeLevels({ educationLevelId: formLevelId!, limit: 100 }),
    enabled: !!formLevelId,
  });
  const dialogGradeLevels: GradeLevel[] = (formGradeLevelsRes?.data ?? []) as GradeLevel[];

  const { data: schoolYearsRes } = useQuery({
    queryKey: ['school-years'],
    queryFn: () => apiClient.academic.listSchoolYears({ limit: 100 }),
  });

  // All grade levels for name resolution (needed even when the table is
  // filtered to one education level — a curriculum row may reference a
  // grade level from a different level than the filter).
  const { data: allGradeLevelsRes } = useQuery({
    queryKey: ['grade-levels', 'all'],
    queryFn: () => apiClient.academic.listGradeLevels({ limit: 200 }),
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
  const schoolYears: SchoolYear[] = schoolYearsRes?.data ?? [];
  const strands: Strand[] = strandsRes?.data ?? [];
  const programs: Program[] = programsRes?.data ?? [];
  const curricula: Curriculum[] = curriculaRes?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (data: {
      educationLevelId: string;
      schoolYearId: string;
      gradeLevelId?: string;
      strandId?: string;
      programId?: string;
      versionLabel?: string;
      status?: string;
    }) => apiClient.academic.createCurriculum(data),
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

  // === Curriculum subjects manager (FR-ACA-5) ===
  // Opens from the row actions "Manage subjects" button: lists the subjects
  // mapped to the curriculum, lets the registrar add more (with term +
  // prerequisite) and remove mistakes — the publish check requires every
  // subject to carry an effective grading system, so this editor is where
  // that data gets entered.
  const [subjectsFor, setSubjectsFor] = useState<Curriculum | null>(null);
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newSubjectTermId, setNewSubjectTermId] = useState('');
  const [newSubjectYearLevelId, setNewSubjectYearLevelId] = useState('');

  const { data: currSubjectsRes, isLoading: currSubjectsLoading } = useQuery({
    queryKey: ['curriculum-subjects', subjectsFor?.id],
    queryFn: () => apiClient.academic.listCurriculumSubjects(subjectsFor!.id),
    enabled: !!subjectsFor,
  });
  const curriculumSubjects: CurriculumSubject[] = currSubjectsRes?.data ?? [];

  const { data: allSubjectsRes } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => apiClient.academic.listSubjects({ limit: 200 }),
  });
  const allSubjects: Subject[] = allSubjectsRes?.data ?? [];

  const { data: curriculumTermsRes } = useQuery({
    queryKey: ['terms', subjectsFor?.schoolYearId],
    queryFn: () => apiClient.academic.listTerms(subjectsFor!.schoolYearId),
    enabled: !!subjectsFor,
  });
  const curriculumTerms: Term[] = curriculumTermsRes?.data ?? [];

  const { data: currYearLevelsRes } = useQuery({
    queryKey: ['grade-levels', subjectsFor?.educationLevelId],
    queryFn: () => apiClient.academic.listGradeLevels({ educationLevelId: subjectsFor!.educationLevelId, limit: 100 }),
    enabled: !!subjectsFor && !!subjectsFor.programId,
  });
  const curriculumYearLevels: GradeLevel[] = (currYearLevelsRes?.data ?? []) as GradeLevel[];

  const subjectName = (id: string) => {
    const s = allSubjects.find((x) => x.id === id);
    return s ? `${s.code} — ${s.title}` : id.slice(0, 8);
  };
  const termName = (id?: string) => curriculumTerms.find((t) => t.id === id)?.name ?? '—';
  const yearLevelName = (id?: string) => {
    if (!id) return '';
    return curriculumYearLevels.find((gl) => gl.id === id)?.name ?? 'Unknown Year';
  };

  // Name resolvers for the curricula table (FR-ACA-3 display).
  // The backend returns only ID fields; we enrich from the lookup lists the
  // page already loads.
  const educationLevelName = (id: string) =>
    educationLevels.find((e) => e.id === id)?.name ?? id;
  const gradeLevelNameForCurricula = (id: string) =>
    (allGradeLevelsRes?.data ?? []).find((g: GradeLevel) => g.id === id)?.name ?? id;
  const schoolYearNameForCurricula = (id: string) =>
    schoolYears.find((s) => s.id === id)?.name ?? id;

  const enrichedCurricula: (Curriculum & { educationLevelName?: string; gradeLevelName?: string; schoolYearName?: string })[] =
    curricula.map((c) => ({
      ...c,
      educationLevelName: educationLevelName(c.educationLevelId),
      gradeLevelName: c.gradeLevelId ? gradeLevelNameForCurricula(c.gradeLevelId) : undefined,
      schoolYearName: schoolYearNameForCurricula(c.schoolYearId),
    }));

  const addSubjectMutation = useMutation({
    mutationFn: (data: { curriculumId: string; subjectId: string; termId?: string; yearLevelId?: string }) =>
      apiClient.academic.createCurriculumSubject({
        ...data,
        termId: data.termId || undefined,
        yearLevelId: data.yearLevelId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum-subjects'] });
      setNewSubjectId('');
      setNewSubjectTermId('');
      setNewSubjectYearLevelId('');
      toast({ title: 'Subject added to curriculum' });
    },
    onError: (error: Error) =>
      toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const removeSubjectMutation = useMutation({
    mutationFn: (id: string) => apiClient.academic.deleteCurriculumSubject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum-subjects'] });
      toast({ title: 'Subject removed' });
    },
    onError: (error: Error) =>
      toast({ title: 'Error', description: error.message, variant: 'destructive' }),
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
    const payload = {
      ...form,
      gradeLevelId: form.gradeLevelId || undefined,
      strandId: form.strandId || undefined,
      programId: form.programId || undefined,
    };
    if (editingCurriculum) {
      updateMutation.mutate({ ...payload, id: editingCurriculum.id } as Curriculum);
    } else {
      createMutation.mutate(payload);
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
      cell: ({ row }) => educationLevelName(row.original.educationLevelId),
    },
    {
      accessorKey: 'gradeLevelName',
      header: 'Grade Level',
      cell: ({ row }) => row.original.gradeLevelName || '—',
    },
    {
      accessorKey: 'schoolYearName',
      header: 'School Year',
      cell: ({ row }) => schoolYearNameForCurricula(row.original.schoolYearId),
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
              title="Manage subjects in this curriculum"
              onClick={() => {
                setNewSubjectId('');
                setNewSubjectTermId('');
                setNewSubjectYearLevelId('');
                setSubjectsFor(curriculum);
              }}
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
        <PageHeader
            title="Curricula"
            description="Manage curricula per education level, grade level, and school year"
            actions={
              <Button onClick={() => setShowCreate(true)}>
                <span className="flex items-center space-x-1">
                  <Plus className="h-4 w-4" />
                  <span>Create Curriculum</span>
                </span>
              </Button>
            }
          />

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
                        {dialogGradeLevels.map((gl) => (
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
                        {dialogGradeLevels.map((gl) => (
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
          data={enrichedCurricula}
          isLoading={isLoading}
          emptyMessage="No curricula found."
          emptyDescription="Get started by creating your first curriculum for this academic year."
          emptyAction={
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              <span>Create Curriculum</span>
            </Button>
          }
        />

        {/* FR-ACA-5: curriculum-subjects manager */}
        <Dialog open={!!subjectsFor} onOpenChange={(open) => !open && setSubjectsFor(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Subjects — {subjectsFor?.versionLabel || subjectsFor?.gradeLevelName || 'Curriculum'}
              </DialogTitle>
              <DialogDescription>
                Subjects mapped to this curriculum, with the term they are taken in. Publishing
                requires each subject to have an effective grading system configured.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
              {currSubjectsLoading ? (
                <p className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading subjects…
                </p>
              ) : curriculumSubjects.length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground">
                  No subjects mapped yet — add them below.
                </p>
              ) : (
                curriculumSubjects.map((cs) => (
                  <div
                    key={cs.id}
                    className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{subjectName(cs.subjectId)}</p>
                      <p className="text-xs text-muted-foreground">
                        {cs.yearLevelId && <span>{yearLevelName(cs.yearLevelId)} • </span>}
                        Term: {termName(cs.termId)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-[hsl(var(--status-danger-ink))] hover:text-[hsl(var(--status-danger-ink))]"
                      aria-label={`Remove ${subjectName(cs.subjectId)}`}
                      onClick={() => removeSubjectMutation.mutate(cs.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!subjectsFor || !newSubjectId) return;
                addSubjectMutation.mutate({
                  curriculumId: subjectsFor.id,
                  subjectId: newSubjectId,
                  termId: newSubjectTermId || undefined,
                  yearLevelId: newSubjectYearLevelId || undefined,
                });
              }}
              className="space-y-3 rounded-md border bg-muted/30 p-3"
            >
              <div>
                <Label htmlFor="cs-subject">Subject</Label>
                <Select value={newSubjectId} onValueChange={setNewSubjectId}>
                  <SelectTrigger id="cs-subject">
                    <SelectValue placeholder="Select subject…" />
                  </SelectTrigger>
                  <SelectContent>
                    {allSubjects
                      .filter((s) => !curriculumSubjects.some((cs) => cs.subjectId === s.id))
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.code} — {s.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {subjectsFor?.programId && (
                <div>
                  <Label htmlFor="cs-year-level">Year Level</Label>
                  <Select value={newSubjectYearLevelId} onValueChange={setNewSubjectYearLevelId}>
                    <SelectTrigger id="cs-year-level">
                      <SelectValue placeholder="Select year level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No specific year level</SelectItem>
                      {curriculumYearLevels.map((gl) => (
                        <SelectItem key={gl.id} value={gl.id}>
                          {gl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="cs-term">Term (optional)</Label>
                <Select value={newSubjectTermId} onValueChange={setNewSubjectTermId}>
                  <SelectTrigger id="cs-term">
                    <SelectValue placeholder="No specific term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No specific term</SelectItem>
                    {curriculumTerms.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSubjectsFor(null)}>
                  Done
                </Button>
                <Button type="submit" disabled={!newSubjectId || addSubjectMutation.isPending}>
                  {addSubjectMutation.isPending ? 'Adding…' : 'Add subject'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </>
  );
}