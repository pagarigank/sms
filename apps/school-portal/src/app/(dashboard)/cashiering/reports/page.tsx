'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { BarChart3, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@sms/ui';

export default function CashierReportsPage() {
  const { currentTenantId, currentBranchId } = useTenantStore();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['daily-collection', currentTenantId, currentBranchId, date],
    queryFn: () => apiClient.cashiering.getDailyCollectionReport({
      tenantId: currentTenantId!,
      branchId: currentBranchId!,
      date,
    }),
    enabled: !!currentTenantId && !!currentBranchId && !!date,
  });

  const data = (report?.data as any) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Collection Report"
        description="View payment collection summary by method"
        actions={
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Date:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex h-9 rounded-md border px-3 py-1 text-sm"
            />
          </div>
        }
      />

      {!currentBranchId ? (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          <AlertTriangle className="h-4 w-4" /> Select a branch to view its collection report.
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" /> Failed to load report: {(error as Error).message}
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" />
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-card p-6">
              <p className="text-sm text-muted-foreground">Total Payments</p>
              <p className="text-3xl font-bold">{data.totalPayments}</p>
            </div>
            <div className="rounded-lg border bg-card p-6">
              <p className="text-sm text-muted-foreground">Total Collected</p>
              <p className="text-3xl font-bold">₱{Number(data.totalAmount).toLocaleString()}</p>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Breakdown by Payment Method</h2>
            <div className="space-y-3">
              {Object.entries(data.byMethod as Record<string, { count: number; total: number }> || {}).map(([method, stats]) => (
                <div key={method} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium capitalize">{method}</p>
                      <p className="text-sm text-muted-foreground">{stats.count} payment(s)</p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold">₱{Number(stats.total).toLocaleString()}</span>
                </div>
              ))}
              {Object.keys(data.byMethod || {}).length === 0 && (
                <p className="text-center text-muted-foreground py-4">No payments recorded for this date.</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <p className="text-muted-foreground">No report available for this date.</p>
      )}
    </div>
  );
}
