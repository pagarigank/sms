'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore, useAuthStore } from '@/lib/store';
import { PlayCircle, StopCircle, Receipt, DollarSign, AlertTriangle } from 'lucide-react';
import { useToast, useConfirm, Badge, statusToVariant, StatusDot } from '@sms/ui';

export default function CashieringPage() {
  const { currentTenantId, currentBranchId } = useTenantStore();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showOpenForm, setShowOpenForm] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [openingFloat, setOpeningFloat] = useState('');
  const [closingActual, setClosingActual] = useState('');

  const { data: openSession, isLoading } = useQuery({
    queryKey: ['cashier-session', currentTenantId, user?.id],
    queryFn: () => apiClient.cashiering.getOpenSession({ tenantId: currentTenantId!, cashierUserId: user?.id || '' }),
    enabled: !!currentTenantId && !!user?.id,
  });

  const session = (openSession?.data as any) ?? null;

  const { data: sessionSummary } = useQuery({
    queryKey: ['cashier-session-summary', session?.id],
    queryFn: () => apiClient.cashiering.getSessionSummary(session!.id),
    enabled: !!session?.id,
  });

  const { data: methods } = useQuery({
    queryKey: ['payment-methods', currentTenantId],
    queryFn: () => apiClient.cashiering.getPaymentMethods({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });

  const openMutation = useMutation({
    mutationFn: () => apiClient.cashiering.openSession({
      tenantId: currentTenantId!,
      branchId: currentBranchId!,
      cashierUserId: user!.id,
      openingFloat: parseFloat(openingFloat) || 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashier-session'] });
      setShowOpenForm(false);
      setOpeningFloat('');
      toast({ title: 'Session opened', description: 'You can now process payments.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Cannot open session', description: error.message, variant: 'destructive' });
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => apiClient.cashiering.closeSession(session!.id, {
      closingActual: parseFloat(closingActual) || 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashier-session'] });
      setShowCloseForm(false);
      setClosingActual('');
      toast({ title: 'Session closed', description: 'End-of-day variance has been recorded.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Cannot close session', description: error.message, variant: 'destructive' });
    },
  });

  if (isLoading) return <div className="flex items-center justify-center p-8"><div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" /></div>;

  const summary = (sessionSummary?.data as any) ?? null;

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cashiering</h1>
          <p className="text-muted-foreground">Manage cashier sessions, payments, and receipts</p>
        </div>
        {!session ? (
          <button
            onClick={() => setShowOpenForm(true)}
            className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <PlayCircle className="mr-2 h-4 w-4" /> Open Session
          </button>
        ) : (
          <button
            onClick={() => setShowCloseForm(true)}
            className="inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            <StopCircle className="mr-2 h-4 w-4" /> Close Session
          </button>
        )}
      </div>

      {/* Session Status */}
      {session ? (
        <div className="rounded-lg border bg-green-50 p-4">
          <div className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-semibold text-green-800">Session Active</p>
              <p className="text-sm text-green-600">
                Opened: {new Date(session.openedAt).toLocaleString()} | Float: ₱{Number(session.openingFloat).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-yellow-50 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="font-semibold text-yellow-800">No Active Session</p>
              <p className="text-sm text-yellow-600">Open a session to start processing payments.</p>
            </div>
          </div>
        </div>
      )}

      {/* Session Summary */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Payments</p>
            <p className="text-2xl font-bold">{summary.totalPayments}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Collected</p>
            <p className="text-2xl font-bold">₱{Number(summary.totalAmount).toLocaleString()}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Expected in Drawer</p>
            <p className="text-2xl font-bold">₱{Number(session?.openingFloat || 0) + Number(summary.totalAmount || 0)}</p>
          </div>
        </div>
      )}

      {/* Payment Methods */}
      {methods?.data && (
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-lg font-semibold mb-3">Payment Methods</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {((methods.data as any[]) ?? []).map((m: any) => (
              <div key={m.id} className="flex items-center gap-2 rounded-lg border p-3">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.code}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Payments */}
      {summary?.session && (
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-lg font-semibold mb-3">Payment Breakdown by Method</h2>
          <div className="space-y-2">
            {Object.entries(summary.byMethod as Record<string, { count: number; total: number }> || {}).map(([method, data]) => (
              <div key={method} className="flex items-center justify-between rounded-lg border p-3">
                <span className="font-medium capitalize">{method}</span>
                <div className="text-right">
                  <span className="text-sm text-muted-foreground">{data.count} payment(s)</span>
                  <span className="ml-3 font-semibold">₱{Number(data.total).toLocaleString()}</span>
                </div>
              </div>
            ))}
            {Object.keys(summary.byMethod || {}).length === 0 && (
              <p className="text-muted-foreground text-sm">No payments recorded this session.</p>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {session && (
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/cashiering/payment" className="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
            <Receipt className="h-8 w-8 text-primary" />
            <h3 className="mt-4 font-semibold">Process Payment</h3>
            <p className="text-sm text-muted-foreground mt-1">Record a payment against an invoice</p>
          </Link>
          <Link href="/cashiering/ad-hoc" className="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
            <DollarSign className="h-8 w-8 text-primary" />
            <h3 className="mt-4 font-semibold">Ad-Hoc Sale</h3>
            <p className="text-sm text-muted-foreground mt-1">Non-tuition sales (uniforms, supplies, etc.)</p>
          </Link>
          <Link href="/cashiering/reports" className="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
            <AlertTriangle className="h-8 w-8 text-primary" />
            <h3 className="mt-4 font-semibold">Daily Report</h3>
            <p className="text-sm text-muted-foreground mt-1">View collection and cash position report</p>
          </Link>
        </div>
      )}

      {/* Open Session Modal */}
      {showOpenForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md shadow-xl space-y-4">
            <h2 className="text-lg font-semibold">Open Cashier Session</h2>
            <div>
              <label className="text-sm font-medium">Opening Float (₱)</label>
              <input
                type="number"
                value={openingFloat}
                onChange={(e) => setOpeningFloat(e.target.value)}
                className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1"
                placeholder="0.00"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowOpenForm(false)} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
              <button
                onClick={() => openMutation.mutate()}
                disabled={openMutation.isPending}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {openMutation.isPending ? 'Opening...' : 'Open Session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Session Modal */}
      {showCloseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md shadow-xl space-y-4">
            <h2 className="text-lg font-semibold">Close Cashier Session</h2>
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p>Expected in drawer: <strong>₱{Number(session?.openingFloat || 0) + Number(summary?.totalAmount || 0)}</strong></p>
            </div>
            <div>
              <label className="text-sm font-medium">Actual Cash in Drawer (₱)</label>
              <input
                type="number"
                value={closingActual}
                onChange={(e) => setClosingActual(e.target.value)}
                className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1"
                placeholder="0.00"
              />
            </div>
            {closingActual && (
              <div className={`rounded-lg p-3 text-sm ${parseFloat(closingActual) === Number(session?.openingFloat || 0) + Number(summary?.totalAmount || 0) ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                <p>Variance: <strong>₱{parseFloat(closingActual) - (Number(session?.openingFloat || 0) + Number(summary?.totalAmount || 0))}</strong></p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCloseForm(false)} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
              <button
                onClick={() => closeMutation.mutate()}
                disabled={closeMutation.isPending || !summary}
                title={summary ? undefined : 'Loading session totals…'}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {closeMutation.isPending ? 'Closing...' : 'Close Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
