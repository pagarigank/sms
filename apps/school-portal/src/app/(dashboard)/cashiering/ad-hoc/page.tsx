'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore, useAuthStore } from '@/lib/store';
import { Plus, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@sms/ui';

interface SaleItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
}

export default function AdHocSalePage() {
  const { currentTenantId, currentBranchId } = useTenantStore();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [buyerName, setBuyerName] = useState('');
  const [items, setItems] = useState<SaleItem[]>([{ description: '', quantity: 1, unitPrice: 0, discountAmount: 0 }]);
  const [method, setMethod] = useState('');
  const [successData, setSuccessData] = useState<{ total: number; method: string; orDisplay: string | null } | null>(null);

  const { data: session } = useQuery({
    queryKey: ['cashier-session', currentTenantId, user?.id],
    queryFn: () => apiClient.cashiering.getOpenSession({ tenantId: currentTenantId!, cashierUserId: user?.id || '' }),
    enabled: !!currentTenantId && !!user?.id,
  });

  const currentSession = (session?.data as any) ?? null;

  const { data: methodsRes } = useQuery({
    queryKey: ['payment-methods', currentTenantId],
    queryFn: () => apiClient.cashiering.getPaymentMethods({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });
  const methods = ((methodsRes?.data as any[]) ?? (methodsRes as any) ?? []).filter((m: any) => m.isActive !== false);

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, discountAmount: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof SaleItem, value: string | number) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const totalAmount = items.reduce((sum, item) => {
    return sum + (item.quantity * item.unitPrice) - item.discountAmount;
  }, 0);

  const createSale = useMutation({
    mutationFn: async () => {
      // 1) record the sale, 2) collect the payment (which issues the OR)
      const saleRes: any = await apiClient.cashiering.createAdHocSale({
        tenantId: currentTenantId!,
        branchId: currentBranchId!,
        sessionId: currentSession?.id || '',
        buyerName: buyerName || undefined,
        items: items.filter(i => i.description && i.unitPrice > 0),
      });
      const sale = saleRes?.data ?? saleRes;
      const payRes: any = await apiClient.cashiering.processPayment({
        tenantId: currentTenantId!,
        branchId: currentBranchId!,
        adHocSaleId: sale.id,
        cashierSessionId: currentSession?.id,
        amount: Number(sale.totalAmount),
        method,
        idempotencyKey: `adhoc_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      });
      const payment = payRes?.data ?? payRes;
      return { total: Number(sale.totalAmount), method, orDisplay: payment?.receipt?.orNumberDisplay ?? null };
    },
    onSuccess: (data) => {
      setSuccessData(data);
      queryClient.invalidateQueries({ queryKey: ['cashier-session-summary'] });
      setBuyerName('');
      setItems([{ description: '', quantity: 1, unitPrice: 0, discountAmount: 0 }]);
      setMethod('');
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Failed to record the sale');
    },
  });

  if (successData) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="space-y-4 text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
          <h1 className="text-2xl font-bold text-green-800">Sale Completed</h1>
          <p className="text-muted-foreground">
            ₱{successData.total.toLocaleString()} collected via {successData.method}
          </p>
          {successData.orDisplay && (
            <div className="mx-auto max-w-xs rounded-lg border bg-card p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Official Receipt</p>
              <p className="font-mono text-lg font-bold">{successData.orDisplay}</p>
            </div>
          )}
          <button
            onClick={() => setSuccessData(null)}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            New Sale
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Ad-Hoc Sale" description="Non-tuition sales (uniforms, supplies, etc.)" />

      {!currentSession && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
          <AlertTriangle className="h-4 w-4" />
          No active cashier session for your account. Please open a session on the Cashiering dashboard first.
        </div>
      )}

      <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
        <div>
          <label className="text-sm font-medium">Buyer Name (optional)</label>
          <input
            type="text"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            className="flex h-9 w-full max-w-md rounded-md border px-3 py-1 text-sm mt-1"
            placeholder="Walk-in buyer name"
          />
        </div>

        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2 rounded-lg border p-3">
              <input
                type="text"
                value={item.description}
                onChange={(e) => updateItem(index, 'description', e.target.value)}
                className="flex h-9 flex-1 rounded-md border px-3 py-1 text-sm"
                placeholder="Item description"
              />
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                className="flex h-9 w-16 rounded-md border px-3 py-1 text-sm text-center"
                min="1"
              />
              <input
                type="number"
                value={item.unitPrice || ''}
                onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                className="flex h-9 w-24 rounded-md border px-3 py-1 text-sm"
                placeholder="Price"
              />
              <span className="text-sm font-medium w-24 text-right">
                ₱{((item.quantity * item.unitPrice) - item.discountAmount).toLocaleString()}
              </span>
              {items.length > 1 && (
                <button onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <button onClick={addItem} className="inline-flex items-center text-sm text-primary hover:underline">
          <Plus className="mr-1 h-4 w-4" /> Add Item
        </button>

        <div className="border-t pt-4 space-y-3">
          <div className="max-w-xs">
            <label className="text-sm font-medium">Payment Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="mt-1 flex h-9 w-full rounded-md border px-2 py-1 text-sm"
            >
              <option value="">Select method…</option>
              {methods.map((m: any) => (
                <option key={m.id} value={m.code}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Total: ₱{totalAmount.toLocaleString()}</span>
            <button
              onClick={() => createSale.mutate()}
              disabled={!currentSession || !method || totalAmount <= 0 || createSale.isPending}
              className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {createSale.isPending ? 'Processing...' : 'Record Sale & Collect'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
