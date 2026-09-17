'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Wand2, BookOpen, GraduationCap, CheckCircle2 } from 'lucide-react';
import {
  PageHeader,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  DataTable,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Label,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  useToast,
  Badge,
} from '@sms/ui';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';

// DepEd grading type metadata
const GRADING_TYPES = [
  { value: 'numeric',            label: 'Numeric (0–100)',              badge: 'info',    description: 'Traditional numeric grading with transmutation table (DO 8 s.2015).' },
  { value: 'numeric_zero_based', label: 'Numeric Zero-Based',           badge: 'info',    description: 'Raw percentage IS the grade — no transmutation table (DO 015 s.2026, G4–G12).' },
  { value: 'descriptive_ks1',    label: 'Descriptive KS1 (Kinder–G3)', badge: 'warning', description: 'Qualitative descriptors only — no numeric grade issued (DO 015 s.2026).' },
  { value: 'gpa',                label: 'GPA (1.0–5.0)',                badge: 'neutral', description: 'College-style GPA grading scale.' },
  { value: 'pass_fail',          label: 'Pass / Fail',                  badge: 'neutral', description: 'Binary pass or fail assessment.' },
];

const DEPED_TIERS = [
  { value: 'kindergarten', label: 'Kindergarten',      description: 'Beginning / Developing / Consistent',              icon: '🐣' },
  { value: 'grades1to3',   label: 'Grades 1–3',        description: 'Emerging → Advancing (5-point descriptors)',       icon: '📚' },
  { value: 'grades4to10',  label: 'Grades 4–10',       description: 'WW 25% + PT 50% + QA 25%, 3 terms, zero-based',   icon: '🎓' },
  { value: 'grades11to12', label: 'Grades 11–12 (SHS)', description: 'WW 25% + PT 50% + QA 25%, 3 terms, zero-based',  icon: '🏫' },
];

export default function GradingSystemsPage() {
  const currentTenantId = useTenantStore((s) => s.currentTenantId);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('numeric');
  const [educationLevelId, setEducationLevelId] = useState('');
  const [schoolYearId, setSchoolYearId] = useState('');

  // Preset State
  const [selectedTier, setSelectedTier] = useState('');
  const [presetEducationLevelId, setPresetEducationLevelId] = useState('');
  const [presetSchoolYearId, setPresetSchoolYearId] = useState('');

  const { data: systemsRes, isLoading } = useQuery({
    queryKey: ['grading-systems', currentTenantId],
    queryFn: () => apiClient.grading.listGradingSystems(),
    enabled: !!currentTenantId,
  });

  const { data: edLevelsRes } = useQuery({
    queryKey: ['education-levels', currentTenantId],
    queryFn: () => apiClient.academic.listEducationLevels(),
    enabled: !!currentTenantId,
  });

  const { data: syRes } = useQuery({
    queryKey: ['school-years', currentTenantId],
    queryFn: () => apiClient.academic.listSchoolYears(),
    enabled: !!currentTenantId,
  });

  const { data: presetsRes } = useQuery({
    queryKey: ['grading-presets'],
    queryFn: () => apiClient.grading.getPresets(),
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      editingId
        ? apiClient.grading.updateGradingSystem(editingId, data)
        : apiClient.grading.createGradingSystem(data),
    onSuccess: () => {
      toast({ title: 'Grading System saved', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['grading-systems'] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast({ title: 'Error saving grading system', description: err.message, variant: 'destructive' });
    },
  });

  const seedMutation = useMutation({
    mutationFn: (data: any) => apiClient.grading.seedDepEdSystem(data),
    onSuccess: (res: any) => {
      const sysName = res?.data?.system?.name ?? 'Grading system';
      toast({ title: `"${sysName}" seeded from DepEd preset!`, variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['grading-systems'] });
      setIsPresetModalOpen(false);
      setSelectedTier('');
      setPresetEducationLevelId('');
      setPresetSchoolYearId('');
    },
    onError: (err: any) => {
      toast({ title: 'Error seeding preset', description: err.message, variant: 'destructive' });
    },
  });

  const systems = (systemsRes?.data ?? []) as any[];
  const educationLevels = (edLevelsRes?.data ?? []) as any[];
  const schoolYears = (syRes?.data ?? []) as any[];

  const handleOpenModal = (sys?: any) => {
    if (sys) {
      setEditingId(sys.id);
      setName(sys.name);
      setType(sys.type);
      setEducationLevelId(sys.educationLevelId);
      setSchoolYearId(sys.schoolYearId);
    } else {
      setEditingId(null);
      setName('');
      setType('numeric');
      setEducationLevelId('');
      setSchoolYearId('');
    }
    setIsModalOpen(true);
  };

  const getTypeInfo = (typeVal: string) => GRADING_TYPES.find(t => t.value === typeVal);

  const columns = [
    { header: 'Name', accessorKey: 'name' },
    {
      header: 'Type',
      accessorKey: 'type',
      cell: ({ row }: any) => {
        const info = getTypeInfo(row.original.type);
        return (
          <Badge variant={(info?.badge as any) ?? 'neutral'}>
            {info?.label ?? row.original.type}
          </Badge>
        );
      },
    },
    {
      header: 'Education Level',
      accessorKey: 'educationLevelId',
      cell: ({ row }: any) => {
        const lv = educationLevels.find((e: any) => e.id === row.original.educationLevelId);
        return lv?.name ?? '—';
      },
    },
    {
      header: 'School Year',
      accessorKey: 'schoolYearId',
      cell: ({ row }: any) => {
        const sy = schoolYears.find((s: any) => s.id === row.original.schoolYearId);
        return sy?.name ?? '—';
      },
    },
    {
      header: 'Terms',
      accessorKey: 'config',
      cell: ({ row }: any) => {
        const terms = row.original.config?.terms;
        return terms ? `${terms} terms` : '—';
      },
    },
    {
      header: 'Policy',
      accessorKey: 'config',
      id: 'policy',
      cell: ({ row }: any) => {
        const ref = row.original.config?.policyRef;
        return ref ? <span className="text-xs font-mono text-muted-foreground">{ref}</span> : '—';
      },
    },
    {
      header: 'Status',
      accessorKey: 'isActive',
      cell: ({ row }: any) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${row.original.isActive ? 'bg-[hsl(var(--status-success-bg))] text-[hsl(var(--status-success-ink))]' : 'bg-muted text-muted-foreground'}`}>
          {row.original.isActive ? 'Active' : 'Archived'}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }: any) => (
        <Button variant="ghost" size="sm" onClick={() => handleOpenModal(row.original)}>
          <Edit2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grading Systems"
        description="Configure grading systems per education level. Apply DepEd DO 015 s.2026 presets for Key Stage 1 (descriptive) or Grades 4–12 (zero-based numeric)."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsPresetModalOpen(true)}>
              <Wand2 className="mr-2 h-4 w-4" />
              Use DepEd Preset
            </Button>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" /> New Grading System
            </Button>
          </div>
        }
      />

      {/* DepEd Info Banner */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-start gap-3 text-sm">
        <BookOpen className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-300">DepEd Order 015, s. 2026 — Three-Term Assessment System</p>
          <p className="text-blue-200/80">
            <strong>Kinder–Grade 3:</strong> Descriptive qualitative grading (no numerical grades or honor roll). &nbsp;
            <strong>Grades 4–12:</strong> Zero-based numeric (raw percentage = grade, no transmutation table). &nbsp;
            School year is now divided into <strong>3 terms</strong> per DepEd Order 009 s.2026.
          </p>
        </div>
      </div>

      <Card className="glass-panel">
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={systems}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* DepEd Preset Modal */}
      <Dialog open={isPresetModalOpen} onOpenChange={setIsPresetModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-accent" />
              Apply DepEd Standard Preset (DO 015, s.2026)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            <p className="text-sm text-muted-foreground">
              Select a grade tier to automatically create the correct grading system with the official DepEd components, weights, and descriptor sets.
            </p>

            {/* Tier Selector Cards */}
            <div className="grid grid-cols-2 gap-3">
              {DEPED_TIERS.map(tier => (
                <button
                  key={tier.value}
                  type="button"
                  onClick={() => setSelectedTier(tier.value)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    selectedTier === tier.value
                      ? 'border-accent bg-accent/10 ring-2 ring-accent/30'
                      : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{tier.icon}</span>
                    <div>
                      <p className="font-semibold text-sm">{tier.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{tier.description}</p>
                    </div>
                  </div>
                  {selectedTier === tier.value && (
                    <CheckCircle2 className="mt-2 h-4 w-4 text-accent" />
                  )}
                </button>
              ))}
            </div>

            {selectedTier && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Education Level</Label>
                  <Select value={presetEducationLevelId} onValueChange={setPresetEducationLevelId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level..." />
                    </SelectTrigger>
                    <SelectContent>
                      {educationLevels.map((l: any) => (
                        <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>School Year</Label>
                  <Select value={presetSchoolYearId} onValueChange={setPresetSchoolYearId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year..." />
                    </SelectTrigger>
                    <SelectContent>
                      {schoolYears.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPresetModalOpen(false)}>Cancel</Button>
            <Button
              disabled={!selectedTier || !presetEducationLevelId || !presetSchoolYearId || seedMutation.isPending}
              onClick={() => seedMutation.mutate({ tier: selectedTier, educationLevelId: presetEducationLevelId, schoolYearId: presetSchoolYearId })}
            >
              <Wand2 className="mr-2 h-4 w-4" />
              {seedMutation.isPending ? 'Creating...' : 'Create Grading System'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Grading System' : 'New Grading System'}</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate({ name, type, educationLevelId, schoolYearId });
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-2">
              <Label>Name</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. DepEd K-12 Standard 2026" />
            </div>

            <div className="space-y-2">
              <Label>Grading Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {GRADING_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div>
                        <span>{t.label}</span>
                        <p className="text-xs text-muted-foreground">{t.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {type === 'descriptive_ks1' && (
                <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-3 py-2">
                  ⚠️ KS1 Descriptive — No numeric scores or transmutation table will be used. Grade entry will show descriptor dropdowns instead.
                </p>
              )}
              {type === 'numeric_zero_based' && (
                <p className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-3 py-2">
                  ℹ️ Zero-Based — Raw percentage score (score ÷ max × 100) is the term grade. No transmutation applied.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Education Level</Label>
              <Select value={educationLevelId} onValueChange={setEducationLevelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select education level..." />
                </SelectTrigger>
                <SelectContent>
                  {educationLevels.map((l: any) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>School Year</Label>
              <Select value={schoolYearId} onValueChange={setSchoolYearId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select school year..." />
                </SelectTrigger>
                <SelectContent>
                  {schoolYears.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editingId ? 'Save Changes' : 'Create System'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
