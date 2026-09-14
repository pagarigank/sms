'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useStudentStore } from '@/lib/student-store';
import { CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import { Badge } from '@sms/ui';

export default function BillingPage() {
  const { selectedStudentId } = useStudentStore();

  const { data: soa, isLoading } = useQuery({
    queryKey: ['student-soa', selectedStudentId],
    queryFn: () => apiClient.invoices.getSOA(selectedStudentId!),
    enabled: !!selectedStudentId,
  });

  const data = (soa?.data as any) ?? null;

  if (!selectedStudentId) {
    return (
      <div className="flex items-center justify-center p-16">
        <p className="text-gray-500">Select a student to view billing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Statement of Account</h1>
        <p className="text-gray-500">View invoices, payments, and outstanding balance</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" />
        </div>
      ) : data ? (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg border bg-white p-4">
              <p className="text-sm text-gray-500">Total Billed</p>
              <p className="text-2xl font-bold text-gray-900">₱{Number(data.summary?.totalBilled || 0).toLocaleString()}</p>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <p className="text-sm text-gray-500">Total Paid</p>
              <p className="text-2xl font-bold text-green-600">₱{Number(data.summary?.totalPaid || 0).toLocaleString()}</p>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <p className="text-sm text-gray-500">Discounts</p>
              <p className="text-2xl font-bold text-blue-600">₱{Number(data.summary?.totalDiscount || 0).toLocaleString()}</p>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <p className="text-sm text-gray-500">Balance Due</p>
              <p className={`text-2xl font-bold ${Number(data.summary?.totalBalance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ₱{Number(data.summary?.totalBalance || 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Balance Warning */}
          {Number(data.summary?.totalBalance || 0) > 0 && (
            <div className="rounded-lg border bg-red-50 p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="font-medium text-red-800">Outstanding Balance</p>
                <p className="text-sm text-red-600">
                  You have an outstanding balance of ₱{Number(data.summary?.totalBalance).toLocaleString()}.
                  Please settle your balance to avoid service interruptions.
                </p>
              </div>
            </div>
          )}

          {Number(data.summary?.totalBalance || 0) === 0 && data.invoices?.length > 0 && (
            <div className="rounded-lg border bg-green-50 p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium text-green-800">All Paid</p>
                <p className="text-sm text-green-600">Your account is fully settled. Thank you!</p>
              </div>
            </div>
          )}

          {/* Invoice List */}
          <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-900">Invoice History</h3>
            </div>
            <div className="divide-y">
              {data.invoices?.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No invoices found.</div>
              ) : (
                data.invoices?.map((inv: any) => (
                  <div key={inv.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{inv.invoiceNumber || 'Invoice'}</p>
                      <p className="text-xs text-gray-500">
                        Issued {new Date(inv.createdAt).toLocaleDateString()}
                        {inv.dueDate ? ` • Due ${new Date(inv.dueDate).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">₱{Number(inv.totalAmount).toLocaleString()}</p>
                      {Number(inv.balance) > 0 && (
                        <p className="text-xs text-red-600">Balance: ₱{Number(inv.balance).toLocaleString()}</p>
                      )}
                      <div className="flex items-center gap-2">
                        {Number(inv.paidAmount) > 0 && (
                          <span className="text-xs text-green-600">Paid: ₱{Number(inv.paidAmount).toLocaleString()}</span>
                        )}
                        <Badge variant={
                          inv.status === 'paid' ? 'success' :
                          inv.status === 'partial' ? 'info' :
                          inv.status === 'open' ? 'warning' :
                          'neutral'
                        }>
                          {inv.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-lg border bg-white p-8 text-center">
          <CreditCard className="h-12 w-12 text-gray-300 mx-auto" />
          <p className="mt-4 text-gray-500">No billing information available.</p>
        </div>
      )}
    </div>
  );
}
