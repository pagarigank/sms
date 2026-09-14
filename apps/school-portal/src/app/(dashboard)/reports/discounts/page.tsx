'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { BadgePercent, Download, Loader2 } from 'lucide-react';

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

interface TypeRow {
  id: string;
  name: string;
  count: number;
}

export default function DiscountsReportPage() {
  const { currentTenantId } = useTenantStore();

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['discount-report', currentTenantId],
    queryFn: () => apiClient.reporting.getDiscountReport({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });

  const data = (report?.data as any) ?? null;
  const byTypeName = (data?.byTypeName ?? []) as TypeRow[];
  const maxCount = useMemo(() => Math.max(...byTypeName.map((t) => t.count), 1), [byTypeName]);

  const exportCsv = () => {
    if (!byTypeName.length) return;
    const csv = toCsv(byTypeName as unknown as Array<Record<string, unknown>>, ['name', 'count']);
    downloadCsv('discount-utilization.csv', csv);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discount Utilization</h1>
          <p className="text-muted-foreground">Scholarship and discount usage across the tenant</p>
        </div>
        <button
          onClick={exportCsv}
          disabled={!byTypeName.length}
          className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-40"
        >
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          Failed to load the report. Please try again.
        </div>
      ) : !data || data.totalGrants === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <BadgePercent className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="mt-4 text-muted-foreground">No discount grants recorded yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Grants appear here once students are awarded discounts on the Billing → Discounts page.
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Total Grants</p>
              <p className="text-2xl font-bold">{data.totalGrants}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold text-green-600">{data.activeGrants}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{data.pendingGrants}</p>
            </div>
          </div>

          {/* By discount type */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-semibold mb-4">By Discount Type</h3>
            <div className="space-y-3">
              {byTypeName.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <BadgePercent className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate">{t.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-40 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${(t.count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-10 text-right">{t.count}</span>
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
