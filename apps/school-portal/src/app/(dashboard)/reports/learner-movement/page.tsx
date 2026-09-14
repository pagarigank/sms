'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { ArrowDownUp, Download, Loader2 } from 'lucide-react';
import { Badge } from '@sms/ui';

function toCsv(rows: Array<Record<string, unknown>>, columns: string[]): string {
  const header = columns.join(',');
  const body = rows
    .map((r) => columns.map((c) => JSON.stringify(r[c] ?? '')).join(','))
    .join('\n');
  return `${header}\n${body}`;
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface Decision {
  id: string;
  studentName: string;
  fromGrade: string;
  toGrade: string | null;
  decision: string;
  remarks: string | null;
  decidedAt: string;
  isFinalized: boolean;
}

const DECISION_VARIANTS: Record<string, 'success' | 'danger' | 'info' | 'neutral'> = {
  promoted: 'success',
  retained: 'danger',
  graduated: 'info',
  transferred_out: 'neutral',
};

export default function LearnerMovementReportPage() {
  const { currentTenantId } = useTenantStore();
  const [schoolYearId, setSchoolYearId] = useState('');

  const { data: schoolYears } = useQuery({
    queryKey: ['school-years'],
    queryFn: () => apiClient.academic.listSchoolYears(),
  });
  const syList = useMemo(
    () => (Array.isArray(schoolYears?.data) ? (schoolYears!.data as Array<{ id: string; name: string }>) : []),
    [schoolYears],
  );

  // Default to the most recent school year once loaded
  const effectiveSy = schoolYearId || syList[syList.length - 1]?.id || '';

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['learner-movement', currentTenantId, effectiveSy],
    queryFn: () => apiClient.reporting.getLearnerMovementReport({ tenantId: currentTenantId!, schoolYearId: effectiveSy }),
    enabled: !!currentTenantId && !!effectiveSy,
  });

  const data = (report?.data as any) ?? null;
  const decisions = (data?.decisions ?? []) as Decision[];

  const exportCsv = () => {
    if (decisions.length === 0) return;
    const csv = toCsv(decisions as unknown as Array<Record<string, unknown>>, [
      'studentName', 'fromGrade', 'toGrade', 'decision', 'remarks', 'decidedAt', 'isFinalized',
    ]);
    downloadCsv(`learner-movement-${effectiveSy}.csv`, csv);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learner Movement Report</h1>
          <p className="text-muted-foreground">Promotions, retentions, and graduations for a school year</p>
        </div>
        <button
          onClick={exportCsv}
          disabled={decisions.length === 0}
          className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-40"
        >
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </button>
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
          Failed to load the report. Please try again.
        </div>
      ) : !data || data.total === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <ArrowDownUp className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="mt-4 text-muted-foreground">
            No learner movement recorded for this school year yet.
          </p>
        </div>
      ) : (
        <>
          {/* Summary chips */}
          <div className="flex flex-wrap gap-3">
            {Object.entries(data.byDecision as Record<string, number>).map(([decision, count]) => (
              <div key={decision} className="rounded-lg border bg-card px-4 py-2">
                <p className="text-xs text-muted-foreground capitalize">{decision.replace('_', ' ')}</p>
                <p className="text-xl font-bold">{count}</p>
              </div>
            ))}
            <div className="rounded-lg border bg-card px-4 py-2">
              <p className="text-xs text-muted-foreground">Total decisions</p>
              <p className="text-xl font-bold">{data.total}</p>
            </div>
          </div>

          {/* Decisions table */}
          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-muted/50">
              <h3 className="font-semibold">Movement Details</h3>
            </div>
            <div className="divide-y">
              {decisions.map((d) => (
                <div key={d.id} className="p-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <ArrowDownUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{d.studentName}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.fromGrade}
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
                    {!d.isFinalized && (
                      <Badge variant="warning">draft</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
