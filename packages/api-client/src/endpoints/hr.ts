import type { ApiClient } from '../client';

export function hrEndpoints(client: ApiClient) {
  return {
    // === Employees ===
    getEmployees: (params: { tenantId: string; branchId?: string }) =>
      client.get('/api/v1/hr/employees', params as any),

    getEmployee: (id: string) =>
      client.get(`/api/v1/hr/employees/${id}`),

    createEmployee: (data: any) =>
      client.post('/api/v1/hr/employees', data),

    updateEmployee: (id: string, data: any) =>
      client.put(`/api/v1/hr/employees/${id}`, data),

    deactivateEmployee: (id: string) =>
      client.delete(`/api/v1/hr/employees/${id}`),

    // === Teaching Loads ===
    getTeachingLoads: (params: { tenantId: string; employeeId?: string; termId?: string; schoolYearId?: string }) =>
      client.get('/api/v1/hr/teaching-loads', params as any),

    assignTeachingLoad: (data: any) =>
      client.post('/api/v1/hr/teaching-loads', data),

    removeTeachingLoad: (id: string) =>
      client.delete(`/api/v1/hr/teaching-loads/${id}`),

    getFacultySummary: (params: { tenantId: string; employeeId: string; termId: string }) =>
      client.get('/api/v1/hr/teaching-loads/faculty-summary', params as any),

    // === DTR ===
    getDtrRecords: (params: { tenantId: string; employeeId?: string; startDate?: string; endDate?: string }) =>
      client.get('/api/v1/hr/dtr', params as any),

    recordDtr: (data: any) =>
      client.post('/api/v1/hr/dtr', data),

    getDtrSummary: (params: { tenantId: string; employeeId: string; month: string }) =>
      client.get('/api/v1/hr/dtr/summary', params as any),
  };
}
