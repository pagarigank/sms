'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore, useAuthStore } from '@/lib/store';
import { Receipt, CheckCircle, Loader2, AlertTriangle, Search, User, CreditCard, ChevronDown, ChevronUp, Printer, Check, X, Mail } from 'lucide-react';
import { Button, Input, Label, Badge } from '@sms/ui';
import { cn } from '@sms/utils';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  studentNumber: string;
}

interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  requiresGatewayRef: boolean;
  isActive?: boolean;
}

interface ProcessPaymentResult {
  id: string;
  amount: string;
  method: string;
  receipt?: { id: string; orNumberDisplay: string | null; orNumber: string };
}

export default function PaymentEntryPage() {
  const { currentTenantId, currentBranchId } = useTenantStore();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [selectedAllocations, setSelectedAllocations] = useState<Record<string, { amount: number; invoiceId: string; type: 'invoice' | 'installment'; title: string }>>({});
  
  const [method, setMethod] = useState('');
  const [gatewayReference, setGatewayReference] = useState('');
  const [successData, setSuccessData] = useState<ProcessPaymentResult | null>(null);

  // Expanded state for UI
  const [expandedInvoices, setExpandedInvoices] = useState<Record<string, boolean>>({});

  // Session guard
  const { data: openSessionRes } = useQuery({
    queryKey: ['cashier-session', currentTenantId, user?.id],
    queryFn: () => apiClient.cashiering.getOpenSession({ tenantId: currentTenantId!, cashierUserId: user?.id || '' }),
    enabled: !!currentTenantId && !!user?.id,
  });
  const session = (openSessionRes as any)?.data ?? null;

  // Methods
  const { data: methodsRes } = useQuery({
    queryKey: ['payment-methods', currentTenantId],
    queryFn: () => apiClient.cashiering.getPaymentMethods({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });
  const methods: PaymentMethod[] = ((methodsRes as any)?.data ?? []).filter((m: any) => m.isActive !== false);

  // Student Search
  const { data: studentsRes, isLoading: studentsLoading } = useQuery({
    queryKey: ['students-search', currentTenantId, studentSearch],
    queryFn: () => apiClient.sis.listStudents({ tenantId: currentTenantId!, search: studentSearch }),
    enabled: !!currentTenantId && studentSearch.length > 2,
  });
  const students = (studentsRes as any)?.data ?? [];

  // SOA for Selected Student
  const { data: soaRes, isLoading: soaLoading } = useQuery({
    queryKey: ['student-soa', selectedStudent?.id],
    queryFn: () => apiClient.invoices.getSOA(selectedStudent!.id),
    enabled: !!selectedStudent?.id,
  });
  const soa = (soaRes as any)?.data ?? null;

  // Derived Total
  const totalAmount = useMemo(() => {
    return Object.values(selectedAllocations).reduce((sum, item) => sum + item.amount, 0);
  }, [selectedAllocations]);

  const toggleSelection = (id: string, invoiceId: string, amount: number, type: 'invoice' | 'installment', title: string) => {
    setSelectedAllocations(prev => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = { amount, invoiceId, type, title };
      }
      return next;
    });
  };

  const payMutation = useMutation({
    mutationFn: () => {
      const allocations = Object.entries(selectedAllocations).map(([id, alloc]) => ({
        invoiceId: alloc.invoiceId,
        amountApplied: alloc.amount,
        installmentId: alloc.type === 'installment' ? id : undefined,
      }));

      return apiClient.cashiering.processPayment({
        tenantId: currentTenantId!,
        branchId: currentBranchId!,
        allocations,
        cashierSessionId: session?.id,
        amount: totalAmount,
        method,
        gatewayReference: gatewayReference || undefined,
        idempotencyKey: `pay_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      });
    },
    onSuccess: (result) => {
      const data = ((result as any)?.data ?? result) as ProcessPaymentResult;
      setSuccessData(data);
      queryClient.invalidateQueries({ queryKey: ['student-soa', selectedStudent?.id] });
      queryClient.invalidateQueries({ queryKey: ['cashier-session-summary'] });
      setSelectedAllocations({});
      setGatewayReference('');
      setMethod('');
    },
  });

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    setStudentSearch('');
    setSelectedAllocations({});
  };

  if (successData) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-500">
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-card/60 p-8 shadow-2xl backdrop-blur-xl">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          
          <div className="relative z-10 flex flex-col items-center space-y-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500 ring-8 ring-emerald-500/10">
              <CheckCircle className="h-10 w-10" />
            </div>
            
            <div>
              <h1 className="text-3xl font-black tracking-tight text-foreground">Payment Successful</h1>
              <p className="text-muted-foreground mt-2">
                The transaction was processed securely.
              </p>
            </div>

            <div className="w-full rounded-2xl border border-white/10 bg-background/50 p-6 shadow-inner">
              <p className="text-sm font-semibold tracking-widest text-muted-foreground uppercase mb-2">Total Paid</p>
              <p className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-500">
                <span className="text-2xl mr-1 opacity-70">₱</span>
                {Number(successData.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              
              <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 gap-4 text-left text-sm">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Method</p>
                  <p className="font-medium mt-1">{methods.find(m => m.code === successData.method)?.name || successData.method}</p>
                </div>
                {successData.receipt && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider">Receipt No.</p>
                    <p className="font-mono font-bold mt-1 text-primary">
                      {successData.receipt.orNumberDisplay || `OR-${successData.receipt.orNumber}`}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-3 pt-4">
              <Button variant="outline" className="h-12 w-full rounded-xl gap-2 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10">
                <Printer className="h-4 w-4" /> Print Receipt
              </Button>
              <Button onClick={() => setSuccessData(null)} className="h-12 w-full rounded-xl bg-foreground text-background hover:bg-foreground/90">
                New Transaction
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const canSubmit = totalAmount > 0 && !!method && !!session && !payMutation.isPending;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-600">
          Process Payment
        </h1>
        <p className="text-muted-foreground mt-1">
          Select outstanding balances and process payments securely.
        </p>
      </div>

      {!session && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 backdrop-blur-sm shadow-[0_0_15px_rgba(245,158,11,0.1)] flex items-center gap-3 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">
            No active cashier session for your account. Open a session on the{' '}
            <a href="/cashiering" className="underline font-bold hover:text-amber-500">Cashiering dashboard</a> first.
          </p>
        </div>
      )}

      {payMutation.isError && (
        <div className="relative overflow-hidden rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 backdrop-blur-sm shadow-[0_0_15px_rgba(244,63,94,0.1)] flex items-center gap-3 text-rose-600 dark:text-rose-400">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">{(payMutation.error as Error).message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: SOA and Selection */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          <div className="rounded-2xl border bg-card/60 p-1 shadow-sm backdrop-blur-md relative z-20">
            {!selectedStudent ? (
              <div className="p-5">
                <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2 block">Search Student</Label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Search className="h-5 w-5" />
                  </div>
                  <Input 
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Enter student name or ID number..."
                    className="pl-12 h-14 bg-background/50 border-white/10 text-lg rounded-xl shadow-inner focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                  {studentSearch.length > 2 && (
                    <div className="absolute top-full left-0 right-0 mt-2 border border-border/50 rounded-xl shadow-2xl bg-card/95 backdrop-blur-xl max-h-[400px] overflow-y-auto z-50 overflow-hidden divide-y divide-border/50">
                      {studentsLoading ? (
                        <div className="p-6 text-center flex flex-col items-center justify-center gap-3 text-muted-foreground">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" /> 
                          <span className="text-sm font-medium">Searching records...</span>
                        </div>
                      ) : students.length === 0 ? (
                        <div className="p-6 text-center text-sm font-medium text-muted-foreground">No students match your search.</div>
                      ) : (
                        students.map((stu: any) => (
                          <button
                            key={stu.id}
                            className="w-full text-left p-4 hover:bg-primary/5 transition-colors flex items-center gap-4 group"
                            onClick={() => handleStudentSelect(stu)}
                          >
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-indigo-500/20 flex flex-shrink-0 items-center justify-center text-primary font-bold shadow-sm group-hover:scale-105 transition-transform">
                              {stu.firstName.charAt(0)}{stu.lastName.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-base truncate">{stu.lastName}, {stu.firstName}</p>
                              <p className="text-xs text-muted-foreground font-mono mt-0.5">{stu.studentNumber}</p>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <Check className="h-4 w-4" />
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 pl-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
                    {selectedStudent.firstName.charAt(0)}{selectedStudent.lastName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{selectedStudent.lastName}, {selectedStudent.firstName}</h3>
                    <p className="text-sm text-muted-foreground font-mono mt-0.5">ID: {selectedStudent.studentNumber}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(null)} className="rounded-xl hover:bg-rose-500/10 hover:text-rose-500 h-10 px-4">
                  Change Student
                </Button>
              </div>
            )}
          </div>

          {selectedStudent && (
            <div className="rounded-3xl border border-white/10 bg-card/40 overflow-hidden shadow-xl backdrop-blur-md relative z-10">
              <div className="bg-gradient-to-r from-background/80 to-background/40 p-6 border-b border-white/10 flex justify-between items-end">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-primary" /> Statement of Account
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Select the invoices or installments to pay.</p>
                </div>
                {soa && (
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1">Total Outstanding</p>
                    <p className={cn(
                      "text-2xl font-black",
                      Number(soa.summary.totalBalance) > 0 ? "text-amber-500" : "text-emerald-500"
                    )}>
                      ₱{Number(soa.summary.totalBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="p-0 bg-background/30">
                {soaLoading ? (
                  <div className="p-16 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium text-muted-foreground">Retrieving statement records...</p>
                  </div>
                ) : !soa || soa.invoices.length === 0 ? (
                  <div className="p-16 text-center flex flex-col items-center gap-3">
                    <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <CheckCircle className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">All Cleared</p>
                      <p className="text-sm text-muted-foreground">No outstanding invoices found for this student.</p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {soa.invoices.map((inv: any) => {
                      const balance = Number(inv.balance);
                      const isFullyPaid = balance <= 0;
                      const hasInstallments = inv.installments && inv.installments.length > 0;
                      const isExpanded = expandedInvoices[inv.id];

                      return (
                        <div key={inv.id} className={cn(
                          "flex flex-col transition-all duration-300",
                          isFullyPaid ? "opacity-60 bg-muted/20" : "hover:bg-card/60"
                        )}>
                          {/* Invoice Header Row */}
                          <div className="p-5 flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                              {!hasInstallments && !isFullyPaid ? (
                                <button
                                  type="button"
                                  onClick={() => toggleSelection(inv.id, inv.id, balance, 'invoice', inv.invoiceNumber || 'Invoice')}
                                  className={cn(
                                    "h-6 w-6 rounded-md flex items-center justify-center border transition-all flex-shrink-0",
                                    selectedAllocations[inv.id] 
                                      ? "bg-primary border-primary text-primary-foreground shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                                      : "border-muted-foreground/30 hover:border-primary/50 bg-background"
                                  )}
                                >
                                  {selectedAllocations[inv.id] && <Check className="h-4 w-4" />}
                                </button>
                              ) : isFullyPaid ? (
                                <CheckCircle className="h-6 w-6 text-emerald-500 flex-shrink-0" />
                              ) : (
                                <div className="h-6 w-6 flex-shrink-0" /> // Spacer for alignment if it has installments
                              )}
                              <div>
                                <p className="font-bold text-base">{inv.invoiceNumber || 'Invoice'}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Total Billed: ₱{Number(inv.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <p className={cn(
                                  "text-base font-bold",
                                  isFullyPaid ? 'text-emerald-500' : 'text-amber-500'
                                )}>
                                  {isFullyPaid ? 'Fully Paid' : `₱${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} Due`}
                                </p>
                              </div>
                              {hasInstallments && (
                                <Button 
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setExpandedInvoices(prev => ({ ...prev, [inv.id]: !prev[inv.id] }))}
                                  className={cn(
                                    "h-8 rounded-full px-3 text-xs gap-1 border border-border/50 shadow-sm transition-all",
                                    isExpanded ? "bg-primary/10 text-primary border-primary/20" : "bg-background hover:bg-muted"
                                  )}
                                >
                                  {isExpanded ? 'Hide Schedule' : 'View Schedule'}
                                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Installments List */}
                          {hasInstallments && (
                            <div className={cn(
                              "grid transition-all duration-300 ease-in-out",
                              isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                            )}>
                              <div className="overflow-hidden bg-background/50">
                                <div className="px-5 py-3 border-t border-border/30">
                                  <div className="space-y-1">
                                    {inv.installments.map((inst: any) => {
                                      const instBalance = Number(inst.amount) - Number(inst.paidAmount || 0);
                                      const isInstPaid = inst.status === 'paid' || instBalance <= 0;
                                      
                                      return (
                                        <div key={inst.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50">
                                          <div className="flex items-center gap-4">
                                            {!isInstPaid ? (
                                              <button
                                                type="button"
                                                onClick={() => toggleSelection(inst.id, inv.id, instBalance, 'installment', `Payment ${inst.installmentNumber}`)}
                                                className={cn(
                                                  "h-5 w-5 rounded flex items-center justify-center border transition-all flex-shrink-0",
                                                  selectedAllocations[inst.id] 
                                                    ? "bg-primary border-primary text-primary-foreground shadow-[0_0_8px_rgba(59,130,246,0.4)]" 
                                                    : "border-muted-foreground/30 hover:border-primary/50 bg-background"
                                                )}
                                              >
                                                {selectedAllocations[inst.id] && <Check className="h-3.5 w-3.5" />}
                                              </button>
                                            ) : (
                                              <CheckCircle className="h-5 w-5 text-emerald-500 opacity-50 flex-shrink-0" />
                                            )}
                                            <div>
                                              <p className={cn(
                                                "font-medium text-sm",
                                                isInstPaid ? 'text-muted-foreground line-through' : 'text-foreground'
                                              )}>
                                                Payment {inst.installmentNumber}
                                              </p>
                                              {inst.dueDate && (
                                                <p className={cn(
                                                  "text-xs mt-0.5",
                                                  !isInstPaid && new Date(inst.dueDate) < new Date() ? "text-rose-500 font-medium" : "text-muted-foreground"
                                                )}>
                                                  Due {new Date(inst.dueDate).toLocaleDateString()}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <span className={cn(
                                              "font-semibold text-sm",
                                              isInstPaid ? 'text-emerald-500/70' : 'text-foreground'
                                            )}>
                                              ₱{instBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Checkout Cart */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          <div className="rounded-3xl border border-primary/20 bg-card/60 shadow-2xl backdrop-blur-xl sticky top-6 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Cart Header */}
            <div className="bg-gradient-to-br from-primary/10 to-indigo-500/5 p-6 border-b border-primary/10">
              <h3 className="font-bold text-xl flex items-center gap-2 text-foreground">
                <CreditCard className="h-5 w-5 text-primary" /> Checkout Summary
              </h3>
            </div>
            
            {/* Cart Items List */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {Object.values(selectedAllocations).length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center text-center opacity-50">
                  <Receipt className="h-12 w-12 mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium">Your cart is empty.</p>
                  <p className="text-xs mt-1">Select items from the statement to proceed.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.values(selectedAllocations).map((alloc, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 rounded-xl border border-white/5 bg-background/50 shadow-sm animate-in slide-in-from-right-4 duration-300">
                      <div>
                        <p className="font-medium text-sm text-foreground">{alloc.title}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">
                          {alloc.type}
                        </p>
                      </div>
                      <span className="font-bold">₱{alloc.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Cart Footer / Actions */}
            <div className="p-6 bg-background/80 backdrop-blur-md border-t border-border/50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
              <div className="flex justify-between items-end mb-6">
                <span className="font-semibold text-muted-foreground uppercase tracking-widest text-xs">Total Due</span>
                <span className="font-black text-3xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-500">
                  <span className="text-xl mr-1 opacity-70">₱</span>
                  {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="space-y-5">
                <div>
                  <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3 block">Payment Method</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {methods.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMethod(m.code)}
                        className={cn(
                          "px-3 py-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center justify-center gap-1.5",
                          method === m.code 
                            ? "bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(59,130,246,0.2)]" 
                            : "bg-background/50 border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>

                {methods.find((m) => m.code === method)?.requiresGatewayRef && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <Label htmlFor="gatewayRef" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2 block">Reference Number</Label>
                    <Input
                      id="gatewayRef"
                      value={gatewayReference}
                      onChange={(e) => setGatewayReference(e.target.value)}
                      placeholder="e.g. GCash Ref, Cheque No."
                      className="bg-background/50 border-white/10"
                      required
                    />
                  </div>
                )}

                <Button 
                  onClick={() => payMutation.mutate()} 
                  disabled={!canSubmit} 
                  className={cn(
                    "w-full h-14 text-lg font-bold rounded-xl transition-all shadow-xl",
                    canSubmit 
                      ? "bg-gradient-to-r from-primary to-indigo-600 hover:shadow-primary/25 hover:-translate-y-0.5 text-white" 
                      : "opacity-50"
                  )}
                >
                  {payMutation.isPending ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Processing...</span>
                  ) : (
                    'Confirm Payment'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
