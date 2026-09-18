'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { DollarSign, Download } from 'lucide-react';
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

export default function RevenueReportPage() {
  const { currentTenantId, currentBranchId } = useTenantStore();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['revenue-report', currentTenantId, currentBranchId, startDate, endDate],
    queryFn: () => apiClient.reporting.getRevenueReport({
      tenantId: currentTenantId!,
      branchId: currentBranchId ?? undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    enabled: !!currentTenantId,
  });

  const data = (report?.data as any) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue Report"
        description="Revenue by payment method and daily trend"
        actions={
          <button
            onClick={() => {
              if (!data) return;
              const lines = ['section,date_or_method,total'];
              lines.push(`summary,Total Revenue,${data.totalRevenue ?? 0}`);
              for (const row of data.byMethod ?? []) {
                lines.push(`byMethod,${row.method},${row.total}`);
              }
              for (const row of data.dailyTrend ?? []) {
                lines.push(`dailyTrend,${row.date},${row.total}`);
              }
              downloadCsv('revenue-report.csv', lines.join('\n'));
            }}
            disabled={!data}
            className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-40"
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </button>
        }
      />

      {/* Filters */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-4">
          <div>
            <label className="text-sm font-medium">From</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="flex h-9 rounded-md border px-3 py-1 text-sm mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">To</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="flex h-9 rounded-md border px-3 py-1 text-sm mt-1" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" />
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="font-medium text-destructive">Failed to load revenue report</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting the date range or try again later.</p>
        </div>
      ) : data ? (
        <>
          {/* Total Revenue */}
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold">₱{data.totalRevenue?.toLocaleString() ?? 0}</p>
              </div>
            </div>
          </div>

          {/* By Payment Method */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-semibold mb-4">By Payment Method</h3>
            <div className="space-y-3">
              {data.byMethod?.map((row: any) => (
                <div key={row.method} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium capitalize">{row.method}</p>
                      <p className="text-xs text-muted-foreground">{row.count} payment(s)</p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold">₱{Number(row.total).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Trend */}
          {data.dailyTrend?.length > 0 && (
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold mb-4">Daily Trend</h3>
              <div className="space-y-1">
                {data.dailyTrend.map((row: any) => (
                  <div key={row.date} className="flex items-center justify-between py-1 text-sm">
                    <span className="text-muted-foreground">{row.date}</span>
                    <span className="font-medium">₱{Number(row.total).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">No revenue data available for the selected period.</p>
        </div>
      )}
    </div>
  );
}
