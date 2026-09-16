'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDownUp, Download, Loader2, TrendingUp, Plus } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { Badge, Button, Input, Label, useToast } from '@sms/ui';

interface Decision {
  id: string;
  studentId: string;
  studentName: string | null;
  enrollmentId: string;
  schoolYearId: string;
  gradeLevelId: string;
  fromGrade: string | null;
  targetGradeLevelId: string | null;
  toGrade: string | null;
  decision: string;
  remarks: string | null;
  decidedBy: string | null;
  decidedAt: string;
  isFinalized: boolean;
}

const DECISION_VARIANTS: Record<string, 'success' | 'danger' | 'info' | 'neutral' | 'warning'> = {
  promoted: 'success',
  retained: 'danger',
  graduated: 'info',
  transferred_out: 'neutral',
};

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: Array<Record<string, unknown>>, columns: string[]): string {
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(','), ...rows.map((r) => columns.map((c) => esc(r[c])).join(','))].join('\n');
}

export default function PromotionsPage() {
  const { currentTenantId } = useTenantStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [schoolYearId, setSchoolYearId] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: schoolYears } = useQuery({
    queryKey: ['school-years'],
    queryFn: () => apiClient.academic.listSchoolYears(),
  });
  const syList = useMemo(
    () => (Array.isArray(schoolYears?.data) ? (schoolYears!.data as Array<{ id: string; name: string; isActive?: boolean }>) : []),
    [schoolYears],
  );
  // Default to the ACTIVE school year (fall back to latest listed).
  const effectiveSy =
    schoolYearId || syList.find((sy) => sy.isActive)?.id || syList[syList.length - 1]?.id || '';

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['promotions', currentTenantId, effectiveSy],
    queryFn: () => apiClient.sis.getPromotions({ tenantId: currentTenantId!, schoolYearId: effectiveSy }),
    enabled: !!currentTenantId && !!effectiveSy,
  });

  const decisions = ((report?.data as any[]) ?? []) as Decision[];

  const exportCsv = () => {
    if (decisions.length === 0) return;
    const csv = toCsv(decisions as unknown as Array<Record<string, unknown>>, [
      'studentName', 'fromGrade', 'toGrade', 'decision', 'remarks', 'decidedAt', 'isFinalized',
    ]);
    downloadCsv(`promotions-${effectiveSy}.csv`, csv);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Promotions</h1>
          <p className="text-muted-foreground">Promotion, retention, and graduation decisions for a school year</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={decisions.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Record Decision
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border bg-card p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="text-sm font-medium">School Year</label>
          <select
            value={effectiveSy}
            onChange={(e) => setSchoolYearId(e.target.value)}
            className="flex h-9 rounded-md border bg-background px-3 py-1 text-sm mt-1 min-w-[200px]"
          >
            {syList.length === 0 && <option value="">No school years configured</option>}
            {syList.map((sy) => (
              <option key={sy.id} value={sy.id}>{sy.name}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          Failed to load promotion decisions. Please try again.
        </div>
      ) : decisions.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <ArrowDownUp className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="mt-4 text-muted-foreground">
            No promotion decisions recorded for this school year yet.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
            Record the first decision
          </Button>
        </div>
      ) : (
        <>
          {/* Summary chips */}
          <div className="flex flex-wrap gap-3">
            {Object.entries(
              decisions.reduce<Record<string, number>>((acc, d) => {
                acc[d.decision] = (acc[d.decision] ?? 0) + 1;
                return acc;
              }, {}),
            ).map(([decision, count]) => (
              <div key={decision} className="rounded-lg border bg-card px-4 py-2">
                <p className="text-xs text-muted-foreground capitalize">{decision.replace('_', ' ')}</p>
                <p className="text-xl font-bold">{count}</p>
              </div>
            ))}
            <div className="rounded-lg border bg-card px-4 py-2">
              <p className="text-xs text-muted-foreground">Total decisions</p>
              <p className="text-xl font-bold">{decisions.length}</p>
            </div>
          </div>

          {/* Decisions list */}
          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-muted/50">
              <h3 className="font-semibold">Decision Details</h3>
            </div>
            <div className="divide-y">
              {decisions.map((d) => (
                <div key={d.id} className="p-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{d.studentName ?? d.studentId}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.fromGrade ?? '—'}
                        {d.toGrade ? ` → ${d.toGrade}` : ''}
                        {d.remarks ? ` • ${d.remarks}` : ''}
                        {' • '}
                        {new Date(d.decidedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={DECISION_VARIANTS[d.decision] ?? 'neutral'} className="capitalize">
                      {d.decision.replace('_', ' ')}
                    </Badge>
                    {!d.isFinalized && <Badge variant="warning">draft</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {dialogOpen && (
        <RecordDecisionDialog
          tenantId={currentTenantId!}
          schoolYearId={effectiveSy}
          onClose={() => setDialogOpen(false)}
          onSaved={() => {
            setDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ['promotions'] });
            toast({ title: 'Decision recorded' });
          }}
        />
      )}
    </div>
  );
}

function RecordDecisionDialog({
  tenantId,
  schoolYearId,
  onClose,
  onSaved,
}: {
  tenantId: string;
  schoolYearId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [studentId, setStudentId] = useState('');
  const [enrollmentId, setEnrollmentId] = useState('');
  const [decision, setDecision] = useState('promoted');
  const [targetGradeLevelId, setTargetGradeLevelId] = useState('');
  const [remarks, setRemarks] = useState('');

  // Students + their enrollments in this school year (enrollmentId is NOT NULL
  // on the decision; the picker pairs student → enrollment).
  const { data: students } = useQuery({
    queryKey: ['students', tenantId],
    queryFn: () => apiClient.sis.listStudents({ tenantId }),
    enabled: !!tenantId,
  });
  const studentList = ((students?.data as any[]) ?? []);

  const { data: enrollments } = useQuery({
    queryKey: ['enrollments-for-promotion', tenantId, schoolYearId],
    queryFn: () => apiClient.sis.listEnrollments({ tenantId, schoolYearId }),
    enabled: !!tenantId && !!schoolYearId,
  });
  const enrollmentList = ((enrollments?.data as any[]) ?? []);
  const enrollmentForStudent = (sid: string) =>
    enrollmentList.find((e) => e.studentId === sid && e.schoolYearId === schoolYearId);

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.sis.createPromotion({
        tenantId,
        studentId,
        enrollmentId,
        schoolYearId,
        gradeLevelId: enrollmentForStudent(studentId)?.gradeLevelId ?? '',
        decision,
        targetGradeLevelId: targetGradeLevelId || null,
        remarks: remarks || null,
      }),
    onSuccess: onSaved,
    onError: (e: Error) => {
      // Surface backend validation (e.g. missing enrollment) instead of failing silently.
      alert(e.message);
    },
  });

  const canSubmit = !!studentId && !!enrollmentForStudent(studentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Record Promotion Decision</h2>

        <div className="space-y-1.5">
          <Label>Student</Label>
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm"
          >
            <option value="">Select a student…</option>
            {studentList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.lastName ? `${s.lastName}, ${s.firstName}` : s.firstName}
              </option>
            ))}
          </select>
          {studentId && !enrollmentForStudent(studentId) && (
            <p className="text-xs text-destructive">No enrollment found for this school year — decision requires one.</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Decision</Label>
          <select
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            className="flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm"
          >
            <option value="promoted">Promoted</option>
            <option value="retained">Retained</option>
            <option value="graduated">Graduated</option>
            <option value="transferred_out">Transferred out</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label>Target grade level (promotions only)</Label>
          <Input value={targetGradeLevelId} onChange={(e) => setTargetGradeLevelId(e.target.value)} placeholder="Grade level ID (optional)" />
        </div>

        <div className="space-y-1.5">
          <Label>Remarks</Label>
          <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save decision'}
          </Button>
        </div>
      </div>
    </div>
  );
}
