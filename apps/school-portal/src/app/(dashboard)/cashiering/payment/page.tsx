'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore, useAuthStore } from '@/lib/store';
import { Receipt, CheckCircle, Loader2, AlertTriangle, Search } from 'lucide-react';
import { Button } from '@sms/ui';
import { Input } from '@sms/ui';
import { Label } from '@sms/ui';

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
  studentName?: string;
  studentId: string;
  totalAmount: string;
  discountAmount: string;
  paidAmount: string;
  balance: string;
  status: string;
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
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [gatewayReference, setGatewayReference] = useState('');
  const [successData, setSuccessData] = useState<ProcessPaymentResult | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  // Session guard — a payment must belong to an open session
  const { data: openSessionRes } = useQuery({
    queryKey: ['cashier-session', currentTenantId, user?.id],
    queryFn: () =>
      apiClient.cashiering.getOpenSession({ tenantId: currentTenantId!, cashierUserId: user?.id || '' }),
    enabled: !!currentTenantId && !!user?.id,
  });
  const session = (openSessionRes as any)?.data ?? null;

  const { data: methodsRes } = useQuery({
    queryKey: ['payment-methods', currentTenantId],
    queryFn: () => apiClient.cashiering.getPaymentMethods({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });
  const methods = listOf<PaymentMethod>(methodsRes).filter((m) => m.isActive !== false);

  const { data: invoicesRes, isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices-for-payment', currentTenantId],
    queryFn: () => apiClient.invoices.listInvoices({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });
  const invoices = useMemo(() => {
    const list = listOf<Invoice>(invoicesRes).filter(
      (inv) => Number(inv.balance) > 0 && inv.status !== 'paid',
    );
    const q = invoiceSearch.trim().toLowerCase();
    if (!q) return list.slice(0, 20);
    return list
      .filter(
        (inv) =>
          (inv.invoiceNumber ?? '').toLowerCase().includes(q) ||
          (inv.studentName ?? '').toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [invoicesRes, invoiceSearch]);

  const selectedInvoice = invoices.find((inv) => inv.id === invoiceId)
    ?? listOf<Invoice>(invoicesRes).find((inv) => inv.id === invoiceId)
    ?? null;

  const payMutation = useMutation({
    mutationFn: () =>
      apiClient.cashiering.processPayment({
        tenantId: currentTenantId!,
        branchId: currentBranchId!,
        invoiceId,
        cashierSessionId: session?.id,
        amount: parseFloat(amount),
        method,
        gatewayReference: gatewayReference || undefined,
        idempotencyKey: `pay_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      }),
    onSuccess: (result) => {
      const data = ((result as any)?.data ?? result) as ProcessPaymentResult;
      setSuccessData(data);
      queryClient.invalidateQueries({ queryKey: ['invoices-for-payment'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['cashier-session-summary'] });
      setInvoiceId('');
      setAmount('');
      setGatewayReference('');
      setMethod('');
    },
    onError: () => {
      // error banner handled below via payMutation.isError / .error
    },
  });

  if (successData) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="space-y-4 text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
          <h1 className="text-2xl font-bold text-green-800">Payment Recorded</h1>
          <p className="text-muted-foreground">
            ₱{Number(successData.amount).toLocaleString()} via {successData.method}
          </p>
          {successData.receipt && (
            <div className="mx-auto max-w-xs rounded-lg border bg-card p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Official Receipt</p>
              <p className="font-mono text-lg font-bold">
                {successData.receipt.orNumberDisplay || `OR-${successData.receipt.orNumber}`}
              </p>
            </div>
          )}
          <Button variant="outline" onClick={() => setSuccessData(null)}>
            Record Another Payment
          </Button>
        </div>
      </div>
    );
  }

  const canSubmit = !!invoiceId && parseFloat(amount) > 0 && !!method && !!session && !payMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Process Payment</h1>
        <p className="text-muted-foreground">Record a payment against an outstanding invoice</p>
      </div>

      {!session && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          <AlertTriangle className="h-4 w-4" />
          No active cashier session for your account. Open a session on the{' '}
          <a href="/cashiering" className="underline">Cashiering dashboard</a> first.
        </div>
      )}

      {payMutation.isError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" /> {(payMutation.error as Error).message}
        </div>
      )}

      <div className="max-w-lg space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <div>
          <Label htmlFor="invoice">Invoice</Label>
          <div className="mt-1 flex gap-2">
            <Input
              id="invoice"
              value={selectedInvoice?.invoiceNumber || invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              placeholder="Search or paste invoice number…"
              readOnly={!!selectedInvoice}
            />
            <Button variant="outline" onClick={() => setShowPicker(!showPicker)}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
          {selectedInvoice && (
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedInvoice.studentName || selectedInvoice.studentId.slice(0, 8)} — balance{' '}
              <span className="font-semibold text-red-600">
                ₱{Number(selectedInvoice.balance).toLocaleString()}
              </span>
            </p>
          )}
          {showPicker && (
            <div className="mt-2 max-h-64 overflow-y-auto rounded-md border">
              {invoicesLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : invoices.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No outstanding invoices found.
                </p>
              ) : (
                invoices.map((inv) => (
                  <button
                    key={inv.id}
                    type="button"
                    className="flex w-full items-center justify-between border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-muted/50"
                    onClick={() => {
                      setInvoiceId(inv.id);
                      setAmount(String(Number(inv.balance)));
                      setShowPicker(false);
                    }}
                  >
                    <span>
                      <span className="font-mono">{inv.invoiceNumber || inv.id.slice(0, 8)}</span>
                      <span className="ml-2 text-muted-foreground">
                        {inv.studentName || inv.studentId.slice(0, 8)}
                      </span>
                    </span>
                    <span className="font-medium text-red-600">
                      ₱{Number(inv.balance).toLocaleString()}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="amount">Amount (₱)</Label>
          <Input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="mt-1"
          />
          {selectedInvoice && parseFloat(amount) > Number(selectedInvoice.balance) && (
            <p className="mt-1 text-xs text-yellow-600">
              Amount exceeds the balance — the invoice will be marked fully paid and the excess stays on the payment.
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="method">Payment Method</Label>
          <select
            id="method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="mt-1 flex h-9 w-full rounded-md border px-2 py-1 text-sm"
          >
            <option value="">Select method…</option>
            {methods.map((m) => (
              <option key={m.id} value={m.code}>
                {m.name}
              </option>
            ))}
          </select>
          {methods.length === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              No payment methods configured yet — ask an administrator to set them up.
            </p>
          )}
        </div>

        {methods.find((m) => m.code === method)?.requiresGatewayRef && (
          <div>
            <Label htmlFor="gatewayRef">Gateway / Reference Number</Label>
            <Input
              id="gatewayRef"
              value={gatewayReference}
              onChange={(e) => setGatewayReference(e.target.value)}
              placeholder="e.g. GCash ref, approval code"
              className="mt-1"
              required
            />
          </div>
        )}

        <Button onClick={() => payMutation.mutate()} disabled={!canSubmit} className="w-full justify-center">
          <Receipt className="mr-2 h-4 w-4" />
          {payMutation.isPending ? 'Processing…' : 'Record Payment'}
        </Button>
        {!session && (
          <p className="text-center text-xs text-muted-foreground">
            An Official Receipt is issued automatically from the branch&apos;s ATP series on payment.
          </p>
        )}
      </div>
    </div>
  );
}
