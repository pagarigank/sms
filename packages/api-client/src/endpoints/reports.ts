import type { ApiClient } from '../client';

export const reportsEndpoints = (client: ApiClient) => ({
  // Backend routes: GET /api/v1/reporting/* (ReportingController)
  getDashboardStats: (params?: { branchId?: string; range?: string }) =>
    client.get<any>('/api/v1/reporting/dashboard', params?.branchId ? { branchId: params.branchId } : undefined),

  getEnrollmentReport: (params?: { branchId?: string; schoolYearId?: string; gradeLevelId?: string }) => {
    const clean: Record<string, string> = {};
    if (params?.branchId) clean.branchId = params.branchId;
    if (params?.schoolYearId) clean.schoolYearId = params.schoolYearId;
    if (params?.gradeLevelId) clean.gradeLevelId = params.gradeLevelId;
    return client.get<any>('/api/v1/reporting/enrollment', Object.keys(clean).length ? clean : undefined);
  },

  getRevenueReport: (params?: { branchId?: string; startDate?: string; endDate?: string }) => {
    const clean: Record<string, string> = {};
    if (params?.branchId) clean.branchId = params.branchId;
    if (params?.startDate) clean.startDate = params.startDate;
    if (params?.endDate) clean.endDate = params.endDate;
    return client.get<any>('/api/v1/reporting/revenue', Object.keys(clean).length ? clean : undefined);
  },

  getArAgingReport: (params?: { branchId?: string }) =>
    client.get<any>('/api/v1/reporting/ar-aging', params?.branchId ? { branchId: params.branchId } : undefined),

  getDiscountReport: () =>
    client.get<any>('/api/v1/reporting/discounts'),

  getLearnerMovementReport: (schoolYearId: string) =>
    client.get<any>('/api/v1/reporting/learner-movement', { schoolYearId }),

  // NOTE: attendance/grades/facility-occupancy reports have no backend
  // routes yet — do NOT add client methods that 404. Backend ReportingController
  // exposes: dashboard, enrollment, revenue, ar-aging, discounts,
  // learner-movement, templates, scheduled.
});
