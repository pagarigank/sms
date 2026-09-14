import type { ApiClient } from '../client';

export function cashieringEndpoints(client: ApiClient) {
  return {
    // === Sessions ===
    openSession: (data: any) =>
      client.post('/api/v1/cashiering/sessions/open', data),

    closeSession: (id: string, data: any) =>
      client.put(`/api/v1/cashiering/sessions/${id}/close`, data),

    getOpenSession: (params: { tenantId: string; cashierUserId: string }) =>
      client.get('/api/v1/cashiering/sessions/open', params as any),

    getSessionSummary: (id: string) =>
      client.get(`/api/v1/cashiering/sessions/${id}/summary`),

    // === OR Numbering ===
    allocateOr: (data: { branchId: string }) =>
      client.post('/api/v1/cashiering/or/allocate', data),

    reserveOrBlock: (data: { sessionId: string; branchId: string; blockSize: number }) =>
      client.post('/api/v1/cashiering/or/reserve-block', data),

    // === Payments ===
    processPayment: (data: any) =>
      client.post('/api/v1/cashiering/payments', data),

    allocatePayment: (id: string, data: { allocations: { invoiceId: string; amountApplied: number }[] }) =>
      client.post(`/api/v1/cashiering/payments/${id}/allocate`, data),

    // === Receipts / Refunds ===
    voidReceipt: (id: string, data: { reason: string; voidedBy: string }) =>
      client.put(`/api/v1/cashiering/receipts/${id}/void`, data),

    createRefund: (data: any) =>
      client.post('/api/v1/cashiering/refunds', data),

    // === Ad-Hoc Sales ===
    createAdHocSale: (data: any) =>
      client.post('/api/v1/cashiering/ad-hoc-sales', data),

    // === Config ===
    getStations: (params: { tenantId: string; branchId?: string }) =>
      client.get('/api/v1/cashiering/stations', params as any),

    getPaymentMethods: (params: { tenantId: string }) =>
      client.get('/api/v1/cashiering/payment-methods', params as any),

    getDenominationSets: (params: { tenantId: string }) =>
      client.get('/api/v1/cashiering/denomination-sets', params as any),

    // === Reports ===
    getDailyCollectionReport: (params: { tenantId: string; branchId: string; date: string }) =>
      client.get('/api/v1/cashiering/reports/daily-collection', params as any),
  };
}
