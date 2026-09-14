import type { ApiClient } from '../client';
import type { FeeType } from '../types';

export function billingEndpoints(client: ApiClient) {
  return {
    // Fee Types
    listFeeTypes: (params?: { tenantId?: string; limit?: number; search?: string; isActive?: boolean }) =>
      client.get<FeeType[]>('/api/v1/billing/fee-types', params as Record<string, string | number | boolean>),

    getFeeTypes: (params: { tenantId: string; limit?: number; search?: string; isActive?: boolean }) =>
      client.get<FeeType[]>('/api/v1/billing/fee-types', params as Record<string, string | number | boolean>),

    createFeeType: (data: any) =>
      client.post('/api/v1/billing/fee-types', data),

    updateFeeType: (id: string, data: any) =>
      client.put(`/api/v1/billing/fee-types/${id}`, data),

    deleteFeeType: (id: string) =>
      client.delete(`/api/v1/billing/fee-types/${id}`),

    // Fee Structures
    getFeeStructures: (params: { tenantId: string; branchId?: string; schoolYearId?: string; educationLevelId?: string }) =>
      client.get('/api/v1/billing/fee-structures', params as any),

    createFeeStructure: (data: any) =>
      client.post('/api/v1/billing/fee-structures', data),

    getFeeStructureItems: (feeStructureId: string) =>
      client.get(`/api/v1/billing/fee-structures/${feeStructureId}/items`),

    addFeeStructureItem: (feeStructureId: string, data: any) =>
      client.post(`/api/v1/billing/fee-structures/${feeStructureId}/items`, data),

    updateFeeStructureItem: (id: string, data: any) =>
      client.put(`/api/v1/billing/fee-structures/items/${id}`, data),

    deleteFeeStructureItem: (id: string) =>
      client.delete(`/api/v1/billing/fee-structures/items/${id}`),

    resolveFeeStructure: (params: any) =>
      client.get('/api/v1/billing/fee-structures/resolve', params as any),

    // Discount Types
    getDiscountTypes: (params: { tenantId: string }) =>
      client.get('/api/v1/billing/discount-types', params as any),

    createDiscountType: (data: any) =>
      client.post('/api/v1/billing/discount-types', data),

    // Discount Grants
    getDiscountGrants: (params: { tenantId: string; studentId?: string }) =>
      client.get('/api/v1/billing/discount-grants', params as any),

    createDiscountGrant: (data: any) =>
      client.post('/api/v1/billing/discount-grants', data),

    approveDiscountGrant: (id: string) =>
      client.put(`/api/v1/billing/discount-grants/${id}/approve`),

    // Payment Plans
    getPaymentPlans: (params: { tenantId: string }) =>
      client.get('/api/v1/billing/payment-plans', params as any),

    createPaymentPlan: (data: any) =>
      client.post('/api/v1/billing/payment-plans', data),

    // Penalty Rules
    getPenaltyRules: (params: { tenantId: string }) =>
      client.get('/api/v1/billing/penalty-rules', params as any),

    createPenaltyRule: (data: any) =>
      client.post('/api/v1/billing/penalty-rules', data),

    // Withdrawal Policies
    getWithdrawalPolicies: (params: { tenantId: string }) =>
      client.get('/api/v1/billing/withdrawal-policies', params as any),

    createWithdrawalPolicy: (data: any) =>
      client.post('/api/v1/billing/withdrawal-policies', data),
  };
}

export function invoiceEndpoints(client: ApiClient) {
  return {
    listInvoices: (params: { tenantId: string; studentId?: string; enrollmentId?: string; status?: string }) =>
      client.get('/api/v1/invoices', params as any),

    getInvoice: (id: string) =>
      client.get(`/api/v1/invoices/${id}`),

    generateInvoice: (data: any) =>
      client.post('/api/v1/invoices/generate', data),

    applyDiscount: (id: string, data: { discountAmount: number }) =>
      client.put(`/api/v1/invoices/${id}/apply-discount`, data),

    applyPayment: (id: string, data: { amount: number }) =>
      client.put(`/api/v1/invoices/${id}/apply-payment`, data),

    getSOA: (studentId: string) =>
      client.get(`/api/v1/invoices/student/${studentId}/soa`),

    getARAging: (params: { tenantId: string; branchId?: string }) =>
      client.get('/api/v1/invoices/reports/ar-aging', params as any),
  };
}
