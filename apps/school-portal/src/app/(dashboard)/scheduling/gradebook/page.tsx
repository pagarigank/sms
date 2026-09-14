'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { Save, Lock } from 'lucide-react';
import type { GradeScaleBand } from '@sms/api-client';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
  Badge,
  TableFooter,
} from '@sms/ui';

/**
 * Per-component column average: first pending edit wins, else saved entries.
 * Only numeric scores count; blank/non-numeric cells are excluded (not zero).
 */
function computeColumnAverages(
  components: string[],
  gradebookData: any[],
  grades: Record<string, Record<string, string>>
): Map<string, number> {
  const sums = new Map<string, { sum: number; n: number }>();
  for (const g of gradebookData) {
    if (typeof g.studentId !== 'string') continue;
    const pending = grades[g.studentId]?.[g.gradeComponentId];
    if (pending != null && pending.trim() !== '') {
      const pct = Number(pending);
      if (Number.isNaN(pct)) continue;
      const cell = sums.get(g.gradeComponentId) ?? { sum: 0, n: 0 };
      cell.sum += pct; cell.n += 1;
      sums.set(g.gradeComponentId, cell);
    } else {
      const pct = g.percentage != null ? Number(g.percentage) : Number(g.rawScore);
      if (pct == null || Number.isNaN(pct)) continue;
      const cell = sums.get(g.gradeComponentId) ?? { sum: 0, n: 0 };
      cell.sum += pct; cell.n += 1;
      sums.set(g.gradeComponentId, cell);
    }
  }
  const out = new Map<string, number>();
  for (const [id, { sum, n }] of sums) { if (n > 0) out.set(id, sum / n); }
  return out;
}

/**
 * Look up the letter band for a weighted average using the resolved grading
 * system's scale (config.gradeScale, ordered high→low; first `min <= avg`
 * wins; a `min: null` band is the catch-all failing band).
 */
function resolveLetterGrade(avg: number, scale: GradeScaleBand[] | undefined): GradeScaleBand | null {
  if (!scale || scale.length === 0) return null;
  return scale.find((band) => band.min == null || avg >= Number(band.min)) ?? null;
}

/**
 * Weighted average for one student.
 *
 * 1. Group entries by grade component (several scores under one component
 *    are averaged first).
 * 2. Per-entry percentage = `percentage`, else `rawScore/maxScore × 100`,
 *    else `rawScore` (treated as a percentage when no max is set).
 * 3. Weighted average = Σ(pct × weight) / Σ(weight) over the components that
 *    have scores — normalizing by graded weights so a missing component does
 *    not deflate the result. Falls back to the plain mean when the grading
 *    system (and therefore weights) could not be resolved.
 */
function computeWeightedAverage(
  studentGrades: any[],
  componentMeta: Map<string, { name: string; weight: number; order: number }>
): { avg: number | null; weighted: boolean } {
  if (studentGrades.length === 0) return { avg: null, weighted: false };

  const byComponent = new Map<string, number[]>();
  for (const g of studentGrades) {
    const raw = Number(g.rawScore);
    const max = g.maxScore != null ? Number(g.maxScore) : null;
    const pct =
      g.percentage != null
        ? Number(g.percentage)
        : max != null && max > 0 && !Number.isNaN(raw)
          ? (raw / max) * 100
          : raw;
    if (Number.isNaN(pct)) continue;
    const list = byComponent.get(g.gradeComponentId) ?? [];
    list.push(pct);
    byComponent.set(g.gradeComponentId, list);
  }
  if (byComponent.size === 0) return { avg: null, weighted: false };

  const componentPcts = [...byComponent.entries()].map(([componentId, pcts]) => ({
    componentId,
    pct: pcts.reduce((a, b) => a + b, 0) / pcts.length,
  }));

  const weightedPairs = componentPcts
    .map(({ componentId, pct }) => ({ pct, weight: componentMeta.get(componentId)?.weight }))
    .filter((x): x is { pct: number; weight: number } =>
      typeof x.weight === 'number' && x.weight > 0
    );

  if (weightedPairs.length > 0) {
    const weightSum = weightedPairs.reduce((s, x) => s + x.weight, 0);
    if (weightSum > 0) {
      return {
        avg: weightedPairs.reduce((s, x) => s + x.pct * x.weight, 0) / weightSum,
        weighted: true,
      };
    }
  }

  return {
    avg: componentPcts.reduce((s, c) => s + c.pct, 0) / componentPcts.length,
    weighted: false,
  };
}

export default function GradebookPage() {
  const { currentTenantId } = useTenantStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [grades, setGrades] = useState<Record<string, Record<string, string>>>({});

  const { data: offerings } = useQuery({
    queryKey: ['offerings', currentTenantId],
    queryFn: () => apiClient.scheduling.listOfferings({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });

  const { data: schoolYears } = useQuery({
    queryKey: ['school-years', 'gradebook'],
    queryFn: () => apiClient.academic.listSchoolYears({ limit: 50 }),
  });
  const activeSchoolYearId = (schoolYears?.data as unknown as { id: string; status: string }[] | undefined)?.find((sy) => sy.status === 'active')?.id
    ?? (schoolYears?.data as unknown as { id: string }[] | undefined)?.[0]?.id
    ?? '';

  const { data: terms } = useQuery({
    queryKey: ['terms', activeSchoolYearId],
    queryFn: () => apiClient.academic.listTerms(activeSchoolYearId),
    enabled: !!activeSchoolYearId,
  });

  const { data: gradebook, isLoading } = useQuery({
    queryKey: ['gradebook', currentTenantId, selectedClass],
    queryFn: () => apiClient.grading.getGradebook({ tenantId: currentTenantId!, classOfferingId: selectedClass }),
    enabled: !!currentTenantId && !!selectedClass,
  });

  const offeringsList = (offerings?.data as any[]) ?? [];
  const termsList = (terms?.data as unknown as { id: string; name: string }[] | undefined) ?? [];

  // --- Grade component name resolution ------------------------------------
  // Chain: offering → section (gradeLevelId) → grade level (educationLevelId)
  // → resolveGradingSystem → listGradeComponents. Any missing link falls
  // back to showing truncated component IDs.
  const selectedOffering = offeringsList.find((o) => o.id === selectedClass);

  const { data: sectionsRes } = useQuery({
    queryKey: ['sections', 'gradebook', currentTenantId],
    queryFn: () => apiClient.sis.listSections({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId && !!selectedOffering?.sectionId,
  });
  const selectedSection = ((sectionsRes?.data as any[]) ?? []).find(
    (s) => s.id === selectedOffering?.sectionId
  );

  const { data: gradeLevelsRes } = useQuery({
    queryKey: ['grade-levels', 'gradebook'],
    queryFn: () => apiClient.academic.listGradeLevels({ limit: 200 }),
    enabled: !!selectedSection?.gradeLevelId,
  });
  const selectedGradeLevel = ((gradeLevelsRes?.data as any[]) ?? []).find(
    (gl) => gl.id === selectedSection?.gradeLevelId
  );

  const educationLevelId: string = selectedGradeLevel?.educationLevelId ?? '';
  const offeringSchoolYearId: string = selectedOffering?.schoolYearId ?? '';

  const { data: resolvedSystem } = useQuery({
    queryKey: ['grading-system-resolved', educationLevelId, offeringSchoolYearId, selectedSection?.branchId ?? ''],
    queryFn: () =>
      apiClient.grading.resolveGradingSystem({
        educationLevelId,
        schoolYearId: offeringSchoolYearId,
        branchId: selectedSection?.branchId ?? undefined,
      }),
    enabled: !!educationLevelId && !!offeringSchoolYearId,
    retry: false,
  });
  const gradingSystemId: string = (resolvedSystem?.data as any)?.id ?? '';

  const { data: componentsRes } = useQuery({
    queryKey: ['grade-components', gradingSystemId],
    queryFn: () => apiClient.grading.listGradeComponents(gradingSystemId),
    enabled: !!gradingSystemId,
  });

  /** componentId → { name, weight, order } from the resolved grading system. */
  const componentMeta = new Map<string, { name: string; weight: number; order: number }>(
    ((componentsRes?.data as any[]) ?? []).map((c: any) => [c.id, { name: c.name, weight: Number(c.weight), order: Number(c.order ?? 0) }])
  );

  /** Letter bands from config.gradeScale (high→low); empty when unset. */
  const gradeScale = (((resolvedSystem?.data as any)?.config?.gradeScale ?? []) as GradeScaleBand[])
    .filter((b) => b && typeof b.label === 'string' && b.label.trim() !== '' && (b.min == null || !Number.isNaN(Number(b.min))));

  const saveGrades = useMutation({
    mutationFn: () => {
      const entries = Object.entries(grades).flatMap(([studentId, components]) =>
        Object.entries(components).map(([componentId, score]) => ({
          studentId,
          classOfferingId: selectedClass,
          gradeComponentId: componentId,
          rawScore: parseFloat(score) || 0,
        }))
      );
      return apiClient.grading.bulkEnterGrades({ entries });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gradebook'] });
      setGrades({});
      toast({ title: 'Grades saved', description: 'All entered scores have been recorded.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Could not save grades', description: error.message, variant: 'destructive' });
    },
  });

  const finalizeGrades = useMutation({
    mutationFn: () => apiClient.grading.finalizeGrades({ classOfferingId: selectedClass, termId: selectedTerm }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gradebook'] });
      toast({ title: 'Grades finalized', description: 'The gradebook is now locked for this term.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Could not finalize', description: error.message, variant: 'destructive' });
    },
  });

  const gradebookData = (gradebook?.data as any[]) ?? [];
  const students = [...new Set(gradebookData.map((g: any) => g.studentId))];
  // Order component columns by the grading system's defined order;
  // unknown/stale component IDs sort last by name.
  const components = [...new Set(gradebookData.map((g: any) => g.gradeComponentId))].sort((a, b) => {
    const ca = componentMeta.get(a);
    const cb = componentMeta.get(b);
    const oa = ca?.order ?? Number.MAX_SAFE_INTEGER;
    const ob = cb?.order ?? Number.MAX_SAFE_INTEGER;
    return oa !== ob ? oa - ob : (ca?.name ?? a).localeCompare(cb?.name ?? b);
  });

  const pendingCount = Object.values(grades).reduce((n, comps) => n + Object.keys(comps).length, 0);
  const columnAverages = computeColumnAverages(components, gradebookData, grades);

  // Class-wide weighted average over per-student weighted averages (only
  // students with at least one score). Updates live with pending edits too.
  const classAverage = (() => {
    let sum = 0; let n = 0;
    for (const sid of students) {
      const { avg } = computeWeightedAverage(
        gradebookData.filter((g: any) => g.studentId === sid),
        componentMeta
      );
      if (avg != null) { sum += avg; n += 1; }
    }
    return n > 0 ? sum / n : null;
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gradebook</h1>
          <p className="text-muted-foreground">
            Enter and manage student grades
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex translate-y-0.5 items-center rounded-full bg-[hsl(var(--accent-subtle))] px-2 py-0.5 text-xs font-medium text-[hsl(var(--accent))]">
                {pendingCount} unsaved {pendingCount === 1 ? 'score' : 'scores'}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => finalizeGrades.mutate()}
            disabled={!selectedClass || !selectedTerm || finalizeGrades.isPending}
          >
            <Lock className="h-4 w-4" /> Finalize
          </Button>
          <Button
            onClick={() => saveGrades.mutate()}
            disabled={!selectedClass || saveGrades.isPending}
          >
            <Save className="h-4 w-4" /> {saveGrades.isPending ? 'Saving...' : 'Save Grades'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="gradebook-class">Class/Offering</Label>
          <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setGrades({}); }}>
            <SelectTrigger id="gradebook-class" className="mt-1 sm:max-w-sm">
              <SelectValue placeholder="Select class..." />
            </SelectTrigger>
            <SelectContent>
              {offeringsList.map((o: any) => (
                <SelectItem key={o.id} value={o.id}>{o.subjectId} - {o.sectionId}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="gradebook-term">Term</Label>
          <Select value={selectedTerm} onValueChange={setSelectedTerm}>
            <SelectTrigger id="gradebook-term" className="mt-1 sm:max-w-sm">
              <SelectValue placeholder="Select term..." />
            </SelectTrigger>
            <SelectContent>
              {termsList.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedClass && (
        <div className="rounded-lg border bg-card shadow-sm overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader className="sticky top-0 z-10 bg-[hsl(var(--surface-muted))] shadow-[0_1px_0_0_hsl(var(--border))]">
              <TableRow className="border-b hover:bg-transparent">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--ink-300))]">
                  Student
                </TableHead>
                {components.map((c) => {
                  const meta = componentMeta.get(c);
                  const label = meta ? `${meta.name}${meta.weight ? ` (${meta.weight}%)` : ''}` : c.slice(0, 8);
                  return (
                    <TableHead
                      key={c}
                      className="text-center text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--ink-300))]"
                      title={meta ? `${meta.name} · weight ${meta.weight}% · ${c}` : c}
                    >
                      {label}
                    </TableHead>
                  );
                })}
                <TableHead className="text-center text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--ink-300))]">
                  Average{gradeScale.length > 0 ? ' / Grade' : ''}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={components.length + 2} className="p-8 text-center text-muted-foreground">
                    Loading gradebook...
                  </TableCell>
                </TableRow>
              ) : (
                students.map((studentId) => {
                  const studentGrades = gradebookData.filter((g: any) => g.studentId === studentId);
                  const { avg, weighted } = computeWeightedAverage(studentGrades, componentMeta);

                  return (
                    <TableRow key={studentId} className="border-b last:border-0">
                      <TableCell className="font-medium text-[hsl(var(--foreground))]">
                        <span className="font-mono text-xs">{studentId.slice(0, 8)}</span>
                      </TableCell>                      {components.map((componentId) => {
                        const existing = studentGrades.find((g: any) => g.gradeComponentId === componentId);
                        // Controlled value: pending edit wins, else the saved score.
                        // Control (instead of defaultValue) is what keeps the letter
                        // chip live while the teacher types.
                        const pending = grades[studentId]?.[componentId];
                        const score = pending ?? (existing?.rawScore != null ? String(existing.rawScore) : '');
                        const pct = Number(score);
                        const cellBand =
                          score.trim() !== '' && !Number.isNaN(pct) ? resolveLetterGrade(pct, gradeScale) : null;
                        return (
                          <TableCell key={componentId} className="text-center">
                            <div className="inline-flex flex-col items-center gap-0.5">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                aria-label={`Score for student ${studentId.slice(0, 8)}, component ${componentMeta.get(componentId)?.name ?? componentId.slice(0, 8)}`}
                                className="w-20 px-2 py-1 text-center text-sm"
                                value={score}
                                onChange={(e) => {
                                  setGrades((prev) => ({
                                    ...prev,
                                    [studentId]: { ...(prev[studentId] ?? {}), [componentId]: e.target.value },
                                  }));
                                }}
                              />
                              {cellBand && (
                                <Badge
                                  variant={cellBand.min == null ? 'danger' : 'accent'}
                                  className="px-1.5 py-0 text-[10px] font-semibold"
                                  title={`${componentMeta.get(componentId)?.name ?? componentId}: ${score}% → ${cellBand.label}${cellBand.descriptor ? ` — ${cellBand.descriptor}` : ''}`}
                                >
                                  {cellBand.label}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center font-medium text-[hsl(var(--foreground))]">
                        {avg != null ? (
                          (() => {
                            const band = resolveLetterGrade(avg, gradeScale);
                            return (
                              <span
                                className="inline-flex items-center justify-center gap-1.5"
                                title={
                                  (weighted
                                    ? 'Weighted by grading-system component weights'
                                    : 'Simple mean (no component weights resolved)') +
                                  (band?.descriptor ? ` — ${band.descriptor}` : '')
                                }
                              >
                                {avg.toFixed(1)}%
                                {band && (
                                  <Badge
                                    variant={band.min == null ? 'danger' : 'accent'}
                                    className="px-1.5 py-0 text-[10px] font-semibold"
                                  >
                                    {band.label}
                                  </Badge>
                                )}
                              </span>
                            );
                          })()
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
              {!isLoading && students.length === 0 && (
                <TableRow>
                  <TableCell colSpan={components.length + 2} className="p-8 text-center text-muted-foreground">
                    No grades recorded yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {!isLoading && students.length > 0 && (
              <TableFooter>
                <TableRow className="hover:bg-transparent">
                  <TableCell className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--ink-300))]">
                    Class Average
                  </TableCell>
                  {components.map((componentId) => {
                    const colAvg = columnAverages.get(componentId);
                    const band = colAvg != null ? resolveLetterGrade(colAvg, gradeScale) : null;
                    return (
                      <TableCell key={componentId} className="text-center">
                        {colAvg != null ? (
                          <span
                            className="inline-flex items-center gap-1"
                            title={`Class average for ${componentMeta.get(componentId)?.name ?? componentId}: ${colAvg.toFixed(1)}%${band ? ` (${band.label})` : ''}${colAvg < 75 ? ' — below typical mastery; component may be too difficult' : ''}`}
                          >
                            {colAvg.toFixed(1)}%
                            {band && (
                              <Badge
                                variant={band.min == null ? 'danger' : 'accent'}
                                className="px-1.5 py-0 text-[10px] font-semibold"
                              >
                                {band.label}
                              </Badge>
                            )}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center">
                    {classAverage != null ? (
                      <span
                        className="inline-flex items-center gap-1"
                        title={`Class-wide weighted average${gradeScale.length > 0 ? '' : ' (no scale configured)'}`}
                      >
                        {classAverage.toFixed(1)}%
                        {(() => {
                          const band = resolveLetterGrade(classAverage, gradeScale);
                          return band ? (
                            <Badge
                              variant={band.min == null ? 'danger' : 'accent'}
                              className="px-1.5 py-0 text-[10px] font-semibold"
                            >
                              {band.label}
                            </Badge>
                          ) : null;
                        })()}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      )}
    </div>
  );
}
