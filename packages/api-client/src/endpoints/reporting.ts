import type { ApiClient } from '../client';

export function reportingEndpoints(client: ApiClient) {
  return {
    // === Dashboard ===
    getDashboardStats: (params: { tenantId: string; branchId?: string; range?: string }) =>
      client.get('/api/v1/reporting/dashboard', params as any),

    // === Reports ===
    getEnrollmentReport: (params: { tenantId: string; schoolYearId?: string; branchId?: string; gradeLevelId?: string }) =>
      client.get('/api/v1/reporting/enrollment', params as any),

    getRevenueReport: (params: { tenantId: string; startDate?: string; endDate?: string; branchId?: string }) =>
      client.get('/api/v1/reporting/revenue', params as any),

    getARAgingReport: (params: { tenantId: string; branchId?: string }) =>
      client.get('/api/v1/reporting/ar-aging', params as any),

    getDiscountReport: (params: { tenantId: string }) =>
      client.get('/api/v1/reporting/discounts', params as any),

    getLearnerMovementReport: (params: { tenantId: string; schoolYearId: string }) =>
      client.get('/api/v1/reporting/learner-movement', params as any),

    // === Templates ===
    getReportTemplates: (params: { tenantId: string }) =>
      client.get('/api/v1/reporting/templates', params as any),

    createReportTemplate: (data: any) =>
      client.post('/api/v1/reporting/templates', data),

    // === Scheduled Reports ===
    getScheduledReports: (params: { tenantId: string }) =>
      client.get('/api/v1/reporting/scheduled', params as any),

    createScheduledReport: (data: any) =>
      client.post('/api/v1/reporting/scheduled', data),

    toggleScheduledReport: (id: string, data: { isActive: boolean }) =>
      client.put(`/api/v1/reporting/scheduled/${id}/toggle`, data),

    runScheduledReport: (id: string) =>
      client.post<{ dispatched: number; summary: string }>(`/api/v1/reporting/scheduled/${id}/run`),
  };
}
