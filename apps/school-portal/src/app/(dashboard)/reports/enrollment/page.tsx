'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { Users, Download } from 'lucide-react';

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function EnrollmentReportPage() {
  const { currentTenantId, currentBranchId } = useTenantStore();
  const [schoolYearId, setSchoolYearId] = useState('');

  // School years for the filter dropdown (was a raw UUID text input)
  const { data: schoolYears } = useQuery({
    queryKey: ['school-years'],
    queryFn: () => apiClient.academic.listSchoolYears(),
  });
  const syList = useMemo(
    () => (Array.isArray(schoolYears?.data) ? (schoolYears!.data as Array<{ id: string; name: string }>) : []),
    [schoolYears],
  );

  const { data: report, isLoading } = useQuery({
    queryKey: ['enrollment-report', currentTenantId, currentBranchId, schoolYearId],
    queryFn: () => apiClient.reporting.getEnrollmentReport({
      tenantId: currentTenantId!,
      branchId: currentBranchId ?? undefined,
      schoolYearId: schoolYearId || undefined,
    }),
    enabled: !!currentTenantId,
  });

  const data = (report?.data as any) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enrollment Report</h1>
          <p className="text-muted-foreground">Enrollment summary by status and grade level</p>
        </div>
        <button
          onClick={() => {
            if (!data) return;
            const lines = ['section,name,count'];
            lines.push(`total,Total Enrollments,${data.total ?? 0}`);
            for (const [status, count] of Object.entries(data.byStatus ?? {})) {
              lines.push(`byStatus,${status},${count}`);
            }
            for (const row of data.byGradeLevel ?? []) {
              lines.push(`byGradeLevel,"${row.gradeLevelName ?? row.gradeLevelId ?? 'Unassigned'}",${row.count}`);
            }
            downloadCsv('enrollment-report.csv', lines.join('\n'));
          }}
          disabled={!data}
          className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-40"
        >
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-end gap-4">
          <div>
            <label className="text-sm font-medium">School Year</label>
            <select
              value={schoolYearId}
              onChange={(e) => setSchoolYearId(e.target.value)}
              className="flex h-9 rounded-md border bg-background px-3 py-1 text-sm mt-1 min-w-[200px]"
            >
              <option value="">All school years</option>
              {syList.map((sy) => (
                <option key={sy.id} value={sy.id}>{sy.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" />
        </div>
      ) : data ? (
        <>
          {/* Total */}
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Enrollments</p>
                <p className="text-3xl font-bold">{data.total?.toLocaleString() ?? 0}</p>
              </div>
            </div>
          </div>

          {/* By Status */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-semibold mb-4">By Status</h3>
            <div className="space-y-3">
              {Object.entries(data.byStatus || {}).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${
                      status === 'enrolled' ? 'bg-green-500' :
                      status === 'pending' ? 'bg-yellow-500' :
                      status === 'withdrawn' ? 'bg-red-500' :
                      'bg-gray-500'
                    }`} />
                    <span className="text-sm font-medium capitalize">{status}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${data.total ? ((count as number) / data.total * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-12 text-right">{count as number}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By Grade Level */}
          {data.byGradeLevel?.length > 0 && (
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold mb-4">By Grade Level</h3>
              <div className="space-y-2">
                {data.byGradeLevel.map((row: any) => (
                  <div key={row.gradeLevelId || 'none'} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                    <span className="text-sm">{row.gradeLevelName ?? row.gradeLevelId ?? 'Unassigned'}</span>
                    <span className="text-sm font-semibold">{row.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">No enrollment data available.</p>
        </div>
      )}
    </div>
  );
}
