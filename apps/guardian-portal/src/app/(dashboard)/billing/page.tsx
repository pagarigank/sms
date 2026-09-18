'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useStudentStore } from '@/lib/student-store';
import { CreditCard, AlertCircle, CheckCircle, Calendar, Receipt, ChevronUp, ChevronDown, CheckSquare, Square } from 'lucide-react';
import { Badge, Button } from '@sms/ui';

export default function BillingPage() {
  const { selectedStudentId } = useStudentStore();
  const [selectedAllocations, setSelectedAllocations] = useState<Record<string, { amount: number; invoiceId: string; type: 'invoice' | 'installment' }>>({});
  
  const { data: soa, isLoading } = useQuery({
    queryKey: ['student-soa', selectedStudentId],
    queryFn: () => apiClient.invoices.getSOA(selectedStudentId!),
    enabled: !!selectedStudentId,
  });

  const data = (soa?.data as any) ?? null;

  // Derived Total
  const totalAmount = useMemo(() => {
    return Object.values(selectedAllocations).reduce((sum, item) => sum + item.amount, 0);
  }, [selectedAllocations]);

  const toggleSelection = (id: string, invoiceId: string, amount: number, type: 'invoice' | 'installment') => {
    setSelectedAllocations(prev => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = { amount, invoiceId, type };
      }
      return next;
    });
  };

  if (!selectedStudentId) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <CreditCard className="h-12 w-12 text-ink-300" />
        <p className="text-ink-200">Select a student to view billing information.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ink-100">Statement of Account</h1>
        <p className="text-ink-200 mt-1">View your balances, installment schedule, and payment history.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-b-2 border-accent rounded-full" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Dashboard Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="surface-card flex flex-col justify-between">
              <p className="text-sm text-ink-200">Total Billed</p>
              <p className="text-2xl font-bold text-ink-100 mt-2">₱{Number(data.summary?.totalBilled || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="surface-card flex flex-col justify-between">
              <p className="text-sm text-ink-200">Total Paid</p>
              <p className="text-2xl font-bold text-[hsl(var(--status-success-ink))] mt-2">₱{Number(data.summary?.totalPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="surface-card flex flex-col justify-between">
              <p className="text-sm text-ink-200">Discounts</p>
              <p className="text-2xl font-bold text-[hsl(var(--status-info-ink))] mt-2">₱{Number(data.summary?.totalDiscount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="surface-card relative overflow-hidden flex flex-col justify-between border-[hsl(var(--status-danger-border))] bg-[hsl(var(--status-danger-surface))]">
              <div className="absolute top-0 right-0 p-3 opacity-20">
                <Receipt className="h-16 w-16 text-[hsl(var(--status-danger-ink))]" />
              </div>
              <p className="text-sm text-ink-200 relative z-10">Balance Due</p>
              <p className={`text-2xl font-bold mt-2 relative z-10 ${Number(data.summary?.totalBalance || 0) > 0 ? 'text-[hsl(var(--status-danger-ink))]' : 'text-[hsl(var(--status-success-ink))]'}`}>
                ₱{Number(data.summary?.totalBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Balance Warning / Success */}
          {Number(data.summary?.totalBalance || 0) > 0 && (
            <div className="rounded-xl border border-[hsl(var(--status-danger-border))] bg-[hsl(var(--status-danger-surface))] p-4 flex items-start gap-4">
              <AlertCircle className="h-5 w-5 mt-0.5 text-[hsl(var(--status-danger-ink))]" />
              <div>
                <p className="font-medium text-[hsl(var(--status-danger-ink))]">Outstanding Balance</p>
                <p className="text-sm text-[hsl(var(--status-danger-ink))] opacity-80 mt-1">
                  You have an outstanding balance of ₱{Number(data.summary?.totalBalance).toLocaleString()}. 
                  Please refer to your installment schedule below and select the items you wish to pay.
                </p>
              </div>
            </div>
          )}

          {Number(data.summary?.totalBalance || 0) === 0 && data.invoices?.length > 0 && (
            <div className="rounded-xl border border-[hsl(var(--status-success-border))] bg-[hsl(var(--status-success-surface))] p-4 flex items-center gap-3 shadow-lg shadow-green-900/20">
              <CheckCircle className="h-5 w-5 text-[hsl(var(--status-success-ink))]" />
              <div>
                <p className="font-medium text-[hsl(var(--status-success-ink))]">All Settled</p>
                <p className="text-sm text-[hsl(var(--status-success-ink))] opacity-80 mt-1">Your account is fully settled for all current invoices. Thank you!</p>
              </div>
            </div>
          )}

          {/* Invoices and Installments */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-ink-100 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-accent" />
              Invoices & Schedules
            </h2>
            
            {data.invoices?.length === 0 ? (
              <div className="surface-card flex flex-col items-center justify-center p-12 space-y-3">
                <Receipt className="h-10 w-10 text-ink-300" />
                <p className="text-ink-200">No invoices found for this student.</p>
              </div>
            ) : (
              data.invoices?.map((inv: any) => {
                const balance = Number(inv.balance);
                const isFullyPaid = balance <= 0;
                const hasInstallments = inv.installments && inv.installments.length > 0;

                return (
                  <div key={inv.id} className="surface-card p-0 overflow-hidden group">
                    {/* Invoice Header */}
                    <div className={`p-5 border-b border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${!isFullyPaid ? 'hover:bg-white/[0.02]' : 'bg-white/[0.01] opacity-75'}`}>
                      <div className="flex items-center gap-4">
                        {!hasInstallments && !isFullyPaid && (
                          <div 
                            className="cursor-pointer"
                            onClick={() => toggleSelection(inv.id, inv.id, balance, 'invoice')}
                          >
                            {selectedAllocations[inv.id] ? (
                              <CheckSquare className="h-6 w-6 text-accent" />
                            ) : (
                              <Square className="h-6 w-6 text-ink-300 group-hover:text-ink-200" />
                            )}
                          </div>
                        )}
                        {isFullyPaid && <CheckCircle className="h-6 w-6 text-green-500" />}
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-ink-100 text-lg">{inv.invoiceNumber || 'Invoice'}</h3>
                            <Badge variant={
                              inv.status === 'paid' ? 'success' :
                              inv.status === 'partial' ? 'info' :
                              inv.status === 'open' ? 'warning' :
                              'neutral'
                            }>
                              {inv.status.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-ink-200 mt-1 flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5" />
                            Issued on {new Date(inv.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-sm text-ink-200">Total Billed</p>
                        <p className="font-bold text-ink-100 text-lg">₱{Number(inv.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        {Number(inv.balance) > 0 && (
                          <p className="text-xs font-medium text-[hsl(var(--status-danger-ink))] mt-0.5">
                            Remaining: ₱{Number(inv.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Installment Schedule */}
                    {hasInstallments ? (
                      <div className="p-5 bg-white/[0.01]">
                        <h4 className="text-sm font-medium text-ink-200 mb-3 uppercase tracking-wider">Installment Schedule</h4>
                        <div className="w-full overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-white/10 text-left">
                                <th className="pb-2 w-12"></th>
                                <th className="pb-2 font-medium text-ink-200">Installment</th>
                                <th className="pb-2 font-medium text-ink-200">Due Date</th>
                                <th className="pb-2 font-medium text-ink-200 text-right">Amount</th>
                                <th className="pb-2 font-medium text-ink-200 text-right pr-4">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {inv.installments.map((inst: any) => {
                                const instBalance = Number(inst.amount) - Number(inst.paidAmount || 0);
                                const isInstPaid = inst.status === 'paid' || instBalance <= 0;
                                
                                return (
                                  <tr key={inst.id} className="hover:bg-white/[0.03] transition-colors group/row">
                                    <td className="py-3">
                                      {!isInstPaid && (
                                        <div 
                                          className="cursor-pointer inline-flex"
                                          onClick={() => toggleSelection(inst.id, inv.id, instBalance, 'installment')}
                                        >
                                          {selectedAllocations[inst.id] ? (
                                            <CheckSquare className="h-5 w-5 text-accent" />
                                          ) : (
                                            <Square className="h-5 w-5 text-ink-300 group-hover/row:text-ink-200" />
                                          )}
                                        </div>
                                      )}
                                    </td>
                                    <td className={`py-3 text-ink-100 ${isInstPaid ? 'opacity-50 line-through' : ''}`}>
                                      Payment {inst.installmentNumber}
                                    </td>
                                    <td className="py-3 text-ink-100">{inst.dueDate ? new Date(inst.dueDate).toLocaleDateString() : 'N/A'}</td>
                                    <td className="py-3 text-right font-medium">
                                      <span className={isInstPaid ? 'text-[hsl(var(--status-success-ink))]' : 'text-ink-100'}>
                                        ₱{instBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    </td>
                                    <td className="py-3 text-right pr-4">
                                      <Badge variant={isInstPaid ? 'success' : 'neutral'}>
                                        {isInstPaid ? 'PAID' : inst.status.toUpperCase()}
                                      </Badge>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 text-center border-t border-white/5">
                        <p className="text-sm text-ink-200 italic">No installment schedule linked to this invoice.</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="surface-card p-12 text-center">
          <CreditCard className="h-12 w-12 text-ink-300 mx-auto" />
          <p className="mt-4 text-ink-200">No billing information available.</p>
        </div>
      )}

      {/* Sticky Action Bar */}
      {totalAmount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="max-w-4xl mx-auto rounded-xl border border-white/10 bg-surface/80 backdrop-blur-xl shadow-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-ink-200">Total Selected for Payment</p>
                <p className="text-2xl font-bold text-accent">₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
            
            <div className="flex flex-col items-center sm:items-end gap-2">
              <Button size="lg" className="w-full sm:w-auto px-12 h-14 text-lg" disabled>
                Pay Now
              </Button>
              <p className="text-xs text-ink-300 text-center sm:text-right flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Online payment gateway is not connected yet - please settle at the cashier's office.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
