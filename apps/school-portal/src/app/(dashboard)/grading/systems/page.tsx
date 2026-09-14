'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { GradeScaleBand } from '@sms/api-client';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  useToast,
} from '@sms/ui';
import { Plus, Trash2 } from 'lucide-react';

/**
 * Sensible starting point when a school has no scale yet (US-style letter
 * grades). Schools edit bands to match their own scale — e.g. Philippine
 * DepEd descriptors — before saving.
 */
const STARTER_SCALE: GradeScaleBand[] = [
  { label: 'A', min: 90, descriptor: 'Outstanding' },
  { label: 'B', min: 80, descriptor: 'Very good' },
  { label: 'C', min: 70, descriptor: 'Satisfactory' },
  { label: 'D', min: 60, descriptor: 'Needs improvement' },
  { label: 'F', min: null, descriptor: 'Fail' },
];

/** Normalize for storage: numeric bands sorted high→low, catch-all (min: null) last. */
function normalizeBands(bands: GradeScaleBand[]): GradeScaleBand[] {
  const numeric = bands
    .filter((b) => b.label.trim() !== '' && b.min != null)
    .map((b) => ({ ...b, min: Number(b.min) }))
    .sort((a, b) => Number(b.min) - Number(a.min));
  const catchAll = bands.filter((b) => b.label.trim() !== '' && b.min == null);
  return [...numeric, ...catchAll];
}

function ScaleSummary({ bands }: { bands: GradeScaleBand[] }) {
  if (bands.length === 0) {
    return <span className="text-sm text-muted-foreground">Not set</span>;
  }
  const shown = bands.slice(0, 3);
  const rest = bands.length - shown.length;
  return (
    <span className="text-sm text-muted-foreground" title={bands.map((b) => `${b.label}${b.min != null ? ` ≥ ${b.min}` : ' (below)'}`).join(' · ')}>
      {shown.map((b, i) => (
        <span key={`${b.label}-${i}`}>
          {i > 0 && ' · '}
          {b.label} ≥ {b.min ?? '—'}
        </span>
      ))}
      {rest > 0 && ` · +${rest} more`}
    </span>
  );
}

export default function GradingSystemsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ educationLevelId: '', schoolYearId: '', name: '', type: 'numeric' });

  // Scale editor state: which system is open + its working band rows.
  const [editing, setEditing] = useState<{ systemId: string; systemName: string } | null>(null);
  const [bands, setBands] = useState<GradeScaleBand[]>([]);

  const { data: systems, isLoading } = useQuery({
    queryKey: ['grading-systems'],
    queryFn: () => apiClient.grading.listGradingSystems(),
  });

  const { data: levels } = useQuery({ queryKey: ['education-levels'], queryFn: () => apiClient.academic.listEducationLevels() });
  const { data: schoolYears } = useQuery({ queryKey: ['school-years'], queryFn: () => apiClient.academic.listSchoolYears() });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiClient.grading.createGradingSystem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grading-systems'] });
      setShowCreate(false);
    },
  });

  const scaleMutation = useMutation({
    mutationFn: ({ id, scale }: { id: string; scale: GradeScaleBand[] }) =>
      apiClient.grading.updateGradingSystem(id, { config: { gradeScale: scale } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grading-systems'] });
      setEditing(null);
      toast({ title: 'Grade scale saved', description: 'Letter grades in the gradebook now use this scale.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Could not save scale', description: error.message, variant: 'destructive' });
    },
  });

  const openScaleEditor = (systemId: string, systemName: string, current: GradeScaleBand[]) => {
    setEditing({ systemId, systemName });
    setBands(current.length > 0 ? current.map((b) => ({ ...b })) : STARTER_SCALE.map((b) => ({ ...b })));
  };

  const updateBand = (index: number, patch: Partial<GradeScaleBand>) => {
    setBands((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  };

  const saveScale = () => {
    if (!editing) return;
    const normalized = normalizeBands(bands);
    if (normalized.length === 0) {
      toast({ title: 'Add at least one band', description: 'Each band needs a label (e.g. "A").', variant: 'destructive' });
      return;
    }
    scaleMutation.mutate({ id: editing.systemId, scale: normalized });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Grading Systems</h1>
          <p className="text-muted-foreground">Configure grading systems per education level</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Add Grading System</Button>
      </div>

      {showCreate && (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Create Grading System</h2>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium">Education Level</label>
                <select value={form.educationLevelId} onChange={(e) => setForm({ ...form, educationLevelId: e.target.value })} className="mt-1 block w-full rounded-md border px-3 py-2" required>
                  <option value="">Select...</option>
                  {levels?.data?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">School Year</label>
                <select value={form.schoolYearId} onChange={(e) => setForm({ ...form, schoolYearId: e.target.value })} className="mt-1 block w-full rounded-md border px-3 py-2" required>
                  <option value="">Select...</option>
                  {schoolYears?.data?.map((sy) => <option key={sy.id} value={sy.id}>{sy.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 block w-full rounded-md border px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-1 block w-full rounded-md border px-3 py-2">
                  <option value="numeric">Numeric (60-100)</option>
                  <option value="descriptive">Descriptive</option>
                  <option value="gpa">GPA/QPI</option>
                  <option value="pass_fail">Pass/Fail</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-2">
              <button type="submit" disabled={createMutation.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                Create
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-lg border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Active</th>
              <th className="px-4 py-3 text-left font-medium">Grade Scale</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : systems?.data?.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No grading systems found</td></tr>
            ) : (
              systems?.data?.map((gs) => {
                const scale = ((gs.config?.gradeScale ?? []) as GradeScaleBand[]).filter(
                  (b) => b && typeof b.label === 'string'
                );
                return (
                  <tr key={gs.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{gs.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{gs.type}</td>
                    <td className="px-4 py-3">
                      {gs.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <span className="text-muted-foreground">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ScaleSummary bands={scale} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openScaleEditor(gs.id, gs.name, scale)}
                      >
                        Edit Scale
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Grade Scale — {editing?.systemName}</DialogTitle>
            <DialogDescription>
              Bands are checked top-down; a student&apos;s weighted average gets the first band whose
              minimum it meets. Leave one minimum empty as the catch-all failing band.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <div className="grid grid-cols-[6rem_7rem_1fr_2rem] gap-2 text-xs font-medium text-muted-foreground">
              <span>Grade</span>
              <span>Minimum %</span>
              <span>Descriptor (optional)</span>
              <span />
            </div>
            {bands.map((band, i) => (
              <div key={i} className="grid grid-cols-[6rem_7rem_1fr_2rem] items-center gap-2">
                <Input
                  aria-label="Grade label"
                  value={band.label}
                  onChange={(e) => updateBand(i, { label: e.target.value })}
                  placeholder="A"
                />
                <Input
                  aria-label="Minimum percentage"
                  type="number"
                  min={0}
                  max={100}
                  value={band.min ?? ''}
                  onChange={(e) => updateBand(i, { min: e.target.value === '' ? null : Number(e.target.value) })}
                  placeholder="—"
                />
                <Input
                  aria-label="Descriptor"
                  value={band.descriptor ?? ''}
                  onChange={(e) => updateBand(i, { descriptor: e.target.value || undefined })}
                  placeholder="Outstanding"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove band ${band.label || i + 1}`}
                  onClick={() => setBands((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBands((prev) => [...prev, { label: '', min: null }])}
            >
              <Plus className="h-4 w-4" /> Add Band
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveScale} disabled={scaleMutation.isPending}>
              {scaleMutation.isPending ? 'Saving...' : 'Save Scale'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
