'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore, useAuthStore } from '@/lib/store';
import { PlayCircle, StopCircle, Receipt, DollarSign, AlertTriangle, CreditCard, PieChart, Activity, X } from 'lucide-react';
import { Badge, Button, Input, Label, PageHeader, useToast } from '@sms/ui';
import { cn } from '@sms/utils';

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

  if (isLoading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>;

  const summary = (sessionSummary?.data as any) ?? null;
  const methodsList = ((methods?.data as any[]) ?? []);

  // Compute cash-only total from summary.byMethod using payment methods with isCash=true
  const cashTotal = useMemo(() => {
    if (!summary?.byMethod || methodsList.length === 0) return 0;
    const cashMethod = methodsList.find((m) => m.isCash === true);
    if (!cashMethod) return 0;
    const cashData = summary.byMethod[cashMethod.code] || summary.byMethod[cashMethod.name] || summary.byMethod[cashMethod.id];
    return cashData?.total || 0;
  }, [summary?.byMethod, methodsList]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <PageHeader
        title="Cashiering"
        description="Manage your daily till, monitor transactions, and process payments."
        actions={
          !session ? (
            <Button
              size="lg"
              onClick={() => setShowOpenForm(true)}
              className="group relative overflow-hidden bg-gradient-to-r from-emerald-500 to-emerald-700 text-white shadow-lg hover:shadow-emerald-500/25 transition-all"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
              <PlayCircle className="mr-2 h-5 w-5 relative z-10" /> 
              <span className="relative z-10 font-semibold tracking-wide">Open Session</span>
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={() => setShowCloseForm(true)}
              className="group relative overflow-hidden bg-gradient-to-r from-rose-500 to-rose-700 text-white shadow-lg hover:shadow-rose-500/25 transition-all"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
              <StopCircle className="mr-2 h-5 w-5 relative z-10" /> 
              <span className="relative z-10 font-semibold tracking-wide">Close Session</span>
            </Button>
          )
        }
      />

      {/* Session Status Banner */}
      {session ? (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 backdrop-blur-sm shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Activity className="h-24 w-24" />
          </div>
          <div className="relative z-10 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 animate-pulse">
              <PlayCircle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-emerald-400">Session Active</h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-emerald-200/80">
                <span>Opened: {new Date(session.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="h-1 w-1 rounded-full bg-emerald-500/50" />
                <span>Float: ₱{Number(session.openingFloat).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 backdrop-blur-sm shadow-[0_0_15px_rgba(245,158,11,0.1)]">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <AlertTriangle className="h-24 w-24" />
          </div>
          <div className="relative z-10 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-amber-400">Drawer Closed</h2>
              <p className="mt-1 text-sm text-amber-200/80">
                Open a new session to begin accepting payments and processing receipts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions (Main focus of dashboard) */}
      <div className="grid gap-6 md:grid-cols-3">
        <Link 
          href={session ? "/cashiering/payment" : "#"} 
          className={cn(
            "group relative overflow-hidden rounded-2xl border bg-card/50 p-6 backdrop-blur-md transition-all duration-300",
            session ? "hover:border-primary/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:-translate-y-1 cursor-pointer" : "opacity-50 cursor-not-allowed pointer-events-none"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative z-10">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Receipt className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">Process Payment</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Accept tuition payments, settle outstanding invoices, and generate official receipts.
            </p>
          </div>
        </Link>
        
        <Link 
          href={session ? "/cashiering/ad-hoc" : "#"} 
          className={cn(
            "group relative overflow-hidden rounded-2xl border bg-card/50 p-6 backdrop-blur-md transition-all duration-300",
            session ? "hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] hover:-translate-y-1 cursor-pointer" : "opacity-50 cursor-not-allowed pointer-events-none"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative z-10">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
              <DollarSign className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">Ad-Hoc Sales</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Process over-the-counter transactions for items like uniforms, books, or miscellaneous fees.
            </p>
          </div>
        </Link>
        
        <Link 
          href={session ? "/cashiering/reports" : "#"} 
          className={cn(
            "group relative overflow-hidden rounded-2xl border bg-card/50 p-6 backdrop-blur-md transition-all duration-300",
            session ? "hover:border-teal-500/50 hover:shadow-[0_0_20px_rgba(20,184,166,0.15)] hover:-translate-y-1 cursor-pointer" : "opacity-50 cursor-not-allowed pointer-events-none"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative z-10">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400">
              <PieChart className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">Daily Report</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Review your end-of-day collection summary, transaction logs, and cash position.
            </p>
          </div>
        </Link>
      </div>

      {/* Session Stats & Methods */}
      {session && summary && (
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Main KPIs */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border bg-card/40 p-5 backdrop-blur-sm">
                <p className="text-sm font-medium text-muted-foreground">Transactions</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{summary.totalPayments}</p>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10">
                  <DollarSign className="h-20 w-20 text-primary" />
                </div>
                <p className="text-sm font-medium text-primary/80">Total Collected</p>
                <p className="mt-2 text-3xl font-bold text-primary">
                  <span className="text-lg opacity-70">₱</span>{Number(summary.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10">
                  <Receipt className="h-20 w-20 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-emerald-500/80">Expected in Drawer</p>
                <p className="mt-2 text-3xl font-bold text-emerald-500">
                  <span className="text-lg opacity-70">₱</span>{Number(Number(session.openingFloat) + cashTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Methods breakdown */}
            <div className="rounded-2xl border bg-card/40 p-6 backdrop-blur-sm">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                Collection by Method
              </h2>
              {Object.keys(summary.byMethod || {}).length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed text-muted-foreground">
                  <Receipt className="mb-2 h-8 w-8 opacity-20" />
                  <p className="text-sm">No payments recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(summary.byMethod as Record<string, { count: number; total: number }>).map(([method, data]) => {
                    const methodObj = methodsList.find(m => m.id === method || m.code === method || m.name.toLowerCase() === method.toLowerCase());
                    const name = methodObj ? methodObj.name : method;
                    
                    return (
                      <div key={method} className="group flex items-center justify-between rounded-xl border border-transparent bg-background/50 p-3 transition-colors hover:border-border hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                            <CreditCard className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium capitalize">{name}</p>
                            <p className="text-xs text-muted-foreground">{data.count} transaction{data.count !== 1 && 's'}</p>
                          </div>
                        </div>
                        <p className="text-right font-bold tracking-tight">
                          ₱{Number(data.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Configured Methods Sidebar */}
          <div className="rounded-2xl border bg-card/40 p-6 backdrop-blur-sm">
            <h2 className="text-lg font-semibold mb-4">Accepted Methods</h2>
            <div className="flex flex-col gap-3">
              {methodsList.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between rounded-xl border bg-background/50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="font-medium text-sm">{m.name}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground uppercase">{m.code}</Badge>
                </div>
              ))}
              {methodsList.length === 0 && (
                <p className="text-sm text-muted-foreground">No payment methods configured.</p>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Open Session Modal */}
      {showOpenForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity" onClick={() => setShowOpenForm(false)} />
          <div className="relative w-full max-w-md scale-100 overflow-hidden rounded-2xl border border-border/50 bg-card p-6 shadow-2xl transition-all">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <PlayCircle className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold">Open Session</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowOpenForm(false)} className="h-8 w-8 rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="openingFloat" className="text-muted-foreground">Starting Cash Float (Drawer Base)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
                  <Input
                    id="openingFloat"
                    type="number"
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(e.target.value)}
                    className="pl-8 text-lg font-medium"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Enter the total cash amount currently in the drawer.</p>
              </div>
              
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-border/50">
                <Button variant="outline" onClick={() => setShowOpenForm(false)}>Cancel</Button>
                <Button
                  onClick={() => openMutation.mutate()}
                  disabled={openMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-32"
                >
                  {openMutation.isPending ? 'Opening...' : 'Start Session'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Close Session Modal */}
      {showCloseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity" onClick={() => setShowCloseForm(false)} />
          <div className="relative w-full max-w-md scale-100 overflow-hidden rounded-2xl border border-border/50 bg-card p-6 shadow-2xl transition-all">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
                  <StopCircle className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold">Close Session</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowCloseForm(false)} className="h-8 w-8 rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-5">
              <div className="rounded-xl bg-muted/50 p-4 border border-border/50 flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Expected Drawer Total:</span>
                <span className="text-xl font-bold">
                  ₱{Number(Number(session?.openingFloat || 0) + Number(summary?.totalAmount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="closingActual" className="text-muted-foreground">Actual Cash Count</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
                  <Input
                    id="closingActual"
                    type="number"
                    value={closingActual}
                    onChange={(e) => setClosingActual(e.target.value)}
                    className="pl-8 text-lg font-medium"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>
              
              {closingActual && (
                <div className={cn(
                  "rounded-xl p-4 border flex justify-between items-center transition-colors",
                  parseFloat(closingActual) === Number(session?.openingFloat || 0) + Number(summary?.totalAmount || 0) 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                    : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                )}>
                  <span className="text-sm font-medium">Variance (Over/Short):</span>
                  <span className="font-bold">
                    ₱{(parseFloat(closingActual) - (Number(session?.openingFloat || 0) + Number(summary?.totalAmount || 0))).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-border/50">
                <Button variant="outline" onClick={() => setShowCloseForm(false)}>Cancel</Button>
                <Button
                  onClick={() => closeMutation.mutate()}
                  disabled={closeMutation.isPending || !summary || !closingActual}
                  className="bg-rose-600 hover:bg-rose-700 text-white min-w-32"
                >
                  {closeMutation.isPending ? 'Closing...' : 'Close Drawer'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
