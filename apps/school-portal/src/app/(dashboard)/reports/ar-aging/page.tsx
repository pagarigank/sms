'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { AlertCircle, Download } from 'lucide-react';
import { PageHeader } from '@sms/ui';

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const AGING_BRACKETS = [
  { key: 'current', label: 'Current', color: 'bg-green-500' },
  { key: 'days30', label: '1-30 Days', color: 'bg-yellow-500' },
  { key: 'days60', label: '31-60 Days', color: 'bg-orange-500' },
  { key: 'days90', label: '61-90 Days', color: 'bg-red-400' },
  { key: 'over90', label: 'Over 90 Days', color: 'bg-red-600' },
];

export default function ARAgingReportPage() {
  const { currentTenantId, currentBranchId } = useTenantStore();

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['ar-aging', currentTenantId, currentBranchId],
    queryFn: () => apiClient.reporting.getARAgingReport({
      tenantId: currentTenantId!,
      branchId: currentBranchId ?? undefined,
    }),
    enabled: !!currentTenantId,
  });

  const data = (report?.data as any) ?? null;
  const maxAging = data?.aging ? Math.max(...Object.values(data.aging as Record<string, number>), 1) : 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="AR Aging Report"
        description="Outstanding balances by age bracket"
        actions={
          <button
            onClick={() => {
              if (!data) return;
              const lines = ['bracket,amount'];
              for (const bracket of AGING_BRACKETS) {
                lines.push(`${bracket.label},${data.aging?.[bracket.key] ?? 0}`);
              }
              lines.push(`Total Outstanding,${data.totalOutstanding ?? 0}`);
              downloadCsv('ar-aging-report.csv', lines.join('\n'));
            }}
            disabled={!data}
            className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-40"
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" />
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="font-medium text-destructive">Failed to load AR aging report</p>
          <p className="text-sm text-muted-foreground mt-1">Try again later or contact support.</p>
        </div>
      ) : data ? (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Outstanding</p>
                  <p className="text-3xl font-bold">₱{data.totalOutstanding?.toLocaleString() ?? 0}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-card p-6">
              <p className="text-sm text-muted-foreground">Open Invoices</p>
              <p className="text-3xl font-bold">{data.invoiceCount ?? 0}</p>
            </div>
          </div>

          {/* Aging Brackets */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-semibold mb-4">Aging Breakdown</h3>
            <div className="space-y-4">
              {AGING_BRACKETS.map((bracket) => {
                const amount = data.aging?.[bracket.key] || 0;
                const percentage = maxAging > 0 ? (amount / maxAging) * 100 : 0;
                return (
                  <div key={bracket.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{bracket.label}</span>
                      <span className="text-sm font-semibold">₱{Number(amount).toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className={`${bracket.color} h-3 rounded-full`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">No AR data available.</p>
        </div>
      )}
    </div>
  );
}
