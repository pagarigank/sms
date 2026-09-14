'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { FileText, Search, Loader2, AlertTriangle, Receipt, X } from 'lucide-react';
import { Button } from '@sms/ui';
import { Input } from '@sms/ui';
import { Label } from '@sms/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@sms/ui';
import { useToast, useConfirm, Badge, statusToVariant, StatusDot } from '@sms/ui';

/** Backend endpoints may return a bare array, an ApiResponse wrapper, or a paginated envelope. */
function listOf<T>(res: unknown): T[] {
  if (res == null) return [];
  if (Array.isArray(res)) return res as T[];
  const r = res as any;
  if (Array.isArray(r.data)) return r.data as T[];
  if (Array.isArray(r.data?.data)) return r.data.data as T[];
  return [];
}

interface Invoice {
  id: string;
  invoiceNumber?: string;
  studentId: string;
  studentName?: string;
  totalAmount: string;
  discountAmount: string;
  paidAmount: string;
  balance: string;
  status: string;
  dueDate?: string;
  createdAt: string;
}

interface Enrollment {
  id: string;
  studentId: string;
  schoolYearId: string;
  status: string;
}

export default function InvoicesPage() {
  const { currentTenantId } = useTenantStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showGenerate, setShowGenerate] = useState(false);
  const [payTarget, setPayTarget] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [soaStudent, setSoaStudent] = useState<{ id: string; name: string } | null>(null);
  const [genForm, setGenForm] = useState({ enrollmentId: '' });

  const { data: invoices, isLoading, error } = useQuery({
    queryKey: ['invoices', currentTenantId, statusFilter],
    queryFn: () => apiClient.invoices.listInvoices({ tenantId: currentTenantId!, status: statusFilter || undefined }),
    enabled: !!currentTenantId,
  });

  const { data: aging } = useQuery({
    queryKey: ['ar-aging', currentTenantId],
    queryFn: () => apiClient.invoices.getARAging({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });

  const { data: studentsRes } = useQuery({
    queryKey: ['students-for-invoices', currentTenantId],
    queryFn: () => apiClient.sis.listStudents({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });

  const { data: enrollmentsRes } = useQuery({
    queryKey: ['enrollments-for-invoices', currentTenantId],
    queryFn: () => apiClient.sis.listEnrollments({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId && showGenerate,
  });

  const { data: syRes } = useQuery({
    queryKey: ['school-years', currentTenantId],
    queryFn: () => apiClient.academic.listSchoolYears(),
    enabled: !!currentTenantId,
  });

  const students = listOf<{ id: string; firstName: string; lastName: string }>(studentsRes);
  const enrollments = listOf<Enrollment>(enrollmentsRes);
  const schoolYears = listOf<{ id: string; name: string }>(syRes);

  const studentName = (id: string) => {
    const s = students.find((x) => x.id === id);
    return s ? `${s.lastName}, ${s.firstName}` : `Student ${id.slice(0, 8)}`;
  };

  const invoiceList = listOf<Invoice>(invoices);
  const agingData = (aging as any) ?? {};

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invoiceList;
    return invoiceList.filter(
      (inv) =>
        (inv.invoiceNumber ?? '').toLowerCase().includes(q) ||
        (inv.studentName ?? '').toLowerCase().includes(q) ||
        studentName(inv.studentId).toLowerCase().includes(q),
    );
  }, [invoiceList, search, students]);

  const generateMutation = useMutation({
    mutationFn: (enrollmentId: string) => {
      const enr = enrollments.find((e) => e.id === enrollmentId);
      if (!enr) throw new Error('Enrollment not found');
      return apiClient.invoices.generateInvoice({
        tenantId: currentTenantId,
        enrollmentId,
        studentId: enr.studentId,
        branchId: (enr as any).branchId,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowGenerate(false);
      setGenForm({ enrollmentId: '' });
      toast({ title: 'Invoice generated', description: 'Fees assessed from the resolved fee structure.' });
    },
    onError: (error: Error) => toast({ title: 'Cannot generate invoice', description: error.message, variant: 'destructive' }),
  });

  const payMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      apiClient.invoices.applyPayment(id, { amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['ar-aging'] });
      setPayTarget(null);
      setPayAmount('');
      toast({ title: 'Payment recorded' });
    },
    onError: (error: Error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const isLoadingData = isLoading;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
            <p className="text-muted-foreground">Manage invoices and statements of account</p>
          </div>
          <Button onClick={() => setShowGenerate(true)}>
            <FileText className="mr-2 h-4 w-4" /> Generate Invoice
          </Button>
        </div>

        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4" /> Failed to load invoices: {(error as Error).message}
          </div>
        ) : isLoadingData ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* AR Aging Summary */}
            {agingData.aging && (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                {[
                  { label: 'Current', value: agingData.aging.current, color: 'text-green-600' },
                  { label: '1-30 Days', value: agingData.aging.days30, color: 'text-yellow-600' },
                  { label: '31-60 Days', value: agingData.aging.days60, color: 'text-orange-600' },
                  { label: '61-90 Days', value: agingData.aging.days90, color: 'text-red-500' },
                  { label: 'Over 90 Days', value: agingData.aging.over90, color: 'text-red-700' },
                ].map((bucket) => (
                  <div key={bucket.label} className="rounded-lg border bg-card p-4 shadow-sm text-center">
                    <p className="text-sm text-muted-foreground">{bucket.label}</p>
                    <p className={`mt-1 text-xl font-bold ${bucket.color}`}>₱{(bucket.value ?? 0).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Filters */}
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  placeholder="Search invoice # or student…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex h-9 w-full max-w-sm rounded-md border px-3 py-1 text-sm"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-9 rounded-md border px-3 py-1 text-sm"
              >
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            {/* Invoice Table */}
            <div className="rounded-lg border bg-card shadow-sm">
              <div className="p-4">
                {filtered.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">
                    {invoiceList.length === 0
                      ? 'No invoices yet. Generate one from an enrollment, or enroll a student to auto-assess fees.'
                      : 'No invoices match your search.'}
                  </p>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-muted-foreground">
                        <th className="pb-3 font-medium">Invoice #</th>
                        <th className="pb-3 font-medium">Student</th>
                        <th className="pb-3 font-medium">Total</th>
                        <th className="pb-3 font-medium">Discount</th>
                        <th className="pb-3 font-medium">Paid</th>
                        <th className="pb-3 font-medium">Balance</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((inv) => (
                        <tr key={inv.id} className="border-b last:border-0">
                          <td className="py-3 font-mono text-sm">{inv.invoiceNumber || '—'}</td>
                          <td className="py-3 font-medium">{inv.studentName || studentName(inv.studentId)}</td>
                          <td className="py-3">₱{Number(inv.totalAmount).toLocaleString()}</td>
                          <td className="py-3 text-green-600">-₱{Number(inv.discountAmount).toLocaleString()}</td>
                          <td className="py-3 text-blue-600">₱{Number(inv.paidAmount).toLocaleString()}</td>
                          <td className="py-3 font-medium">
                            <span className={Number(inv.balance) > 0 ? 'text-red-600' : 'text-green-600'}>
                              ₱{Number(inv.balance).toLocaleString()}
                            </span>
                          </td>
                          <td className="py-3">
                            <Badge variant={statusToVariant(inv.status)}>
                              <StatusDot />
                              {inv.status}
                            </Badge>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8"
                                onClick={() => setSoaStudent({ id: inv.studentId, name: inv.studentName || studentName(inv.studentId) })}
                              >
                                <Receipt className="mr-1 h-3.5 w-3.5" /> SOA
                              </Button>
                              {Number(inv.balance) > 0 && inv.status !== 'paid' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8"
                                  onClick={() => {
                                    setPayTarget(inv);
                                    setPayAmount(String(Number(inv.balance)));
                                  }}
                                >
                                  Record Payment
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}

        {/* Generate invoice dialog */}
        <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Generate Invoice from Enrollment</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                generateMutation.mutate(genForm.enrollmentId);
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="gen-enrollment">Enrollment</Label>
                <select
                  id="gen-enrollment"
                  value={genForm.enrollmentId}
                  onChange={(e) => setGenForm({ enrollmentId: e.target.value })}
                  className="flex h-9 w-full rounded-md border px-2 py-1 text-sm"
                  required
                >
                  <option value="">Select enrollment…</option>
                  {enrollments.map((e) => {
                    const sy = schoolYears.find((s) => s.id === e.schoolYearId)?.name ?? 'Unknown SY';
                    const label = `${studentName(e.studentId)} — ${sy}`;
                    return (
                      <option key={e.id} value={e.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                <p className="mt-2 text-xs text-muted-foreground">
                  Fees are assessed from the fee structure resolved for the enrollment&apos;s branch, level, and program.
                  Approved discount grants are applied automatically.
                </p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowGenerate(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={generateMutation.isPending}>
                  {generateMutation.isPending ? 'Generating…' : 'Generate'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Record payment dialog */}
        <Dialog open={!!payTarget} onOpenChange={(open) => !open && setPayTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>
            {payTarget && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  payMutation.mutate({ id: payTarget.id, amount: parseFloat(payAmount) || 0 });
                }}
                className="space-y-4"
              >
                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  <p className="font-medium">{payTarget.invoiceNumber || 'Invoice'}</p>
                  <p className="text-muted-foreground">
                    Balance: ₱{Number(payTarget.balance).toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label htmlFor="pay-amount">Amount (₱)</Label>
                  <Input
                    id="pay-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setPayTarget(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={payMutation.isPending}>
                    {payMutation.isPending ? 'Recording…' : 'Record Payment'}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* SOA drawer */}
        {soaStudent && <SoaDrawer student={soaStudent} onClose={() => setSoaStudent(null)} />}

      </div>
    </>
  );
}

function SoaDrawer({ student, onClose }: { student: { id: string; name: string }; onClose: () => void }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['soa', student.id],
    queryFn: () => apiClient.invoices.getSOA(student.id),
  });

  const soa = data as any;
  const invoices = ((soa?.invoices as any[]) ?? []).map((i) => ({
    ...i,
    studentName: student.name,
  }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="h-full w-full max-w-lg overflow-y-auto bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">Statement of Account</h2>
            <p className="text-sm text-muted-foreground">{student.name}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Failed to load SOA: {(error as Error).message}
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Total Billed</p>
                <p className="font-bold">₱{Number(soa?.summary?.totalBilled ?? 0).toLocaleString()}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Total Paid</p>
                <p className="font-bold text-blue-600">₱{Number(soa?.summary?.totalPaid ?? 0).toLocaleString()}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Total Discounts</p>
                <p className="font-bold text-green-600">₱{Number(soa?.summary?.totalDiscount ?? 0).toLocaleString()}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Outstanding Balance</p>
                <p className={`font-bold ${Number(soa?.summary?.totalBalance ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ₱{Number(soa?.summary?.totalBalance ?? 0).toLocaleString()}
                </p>
              </div>
            </div>

            {invoices.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">No invoices for this student.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-2 font-medium">Invoice #</th>
                    <th className="pb-2 font-medium">Total</th>
                    <th className="pb-2 font-medium">Paid</th>
                    <th className="pb-2 font-medium">Balance</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv: any) => (
                    <tr key={inv.id} className="border-b last:border-0">
                      <td className="py-2 font-mono text-xs">{inv.invoiceNumber || '—'}</td>
                      <td className="py-2">₱{Number(inv.totalAmount).toLocaleString()}</td>
                      <td className="py-2 text-blue-600">₱{Number(inv.paidAmount).toLocaleString()}</td>
                      <td className="py-2">₱{Number(inv.balance).toLocaleString()}</td>
                      <td className="py-2 text-xs capitalize">{inv.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
