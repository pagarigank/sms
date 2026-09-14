import type { ApiClient } from '../client';

export function attendanceEndpoints(client: ApiClient) {
  return {
    // Real roster for the attendance-entry grid (students assigned to the
    // offering's section, with enrollmentId/sectionId for record writes)
    getRoster: (classOfferingId: string) =>
      client.get<any[]>('/api/v1/attendance/roster', { classOfferingId }),

    getRecords: (params: { tenantId: string; classOfferingId: string; date: string }) =>
      client.get('/api/v1/attendance/records', params as any),

    recordAttendance: (data: any) =>
      client.post('/api/v1/attendance/records', data),

    bulkRecordAttendance: (records: any[]) =>
      client.post('/api/v1/attendance/records/bulk', { records }),

    getStudentSummary: (params: { tenantId: string; studentId: string; schoolYearId: string }) =>
      client.get(`/api/v1/attendance/students/${params.studentId}/summary`, { schoolYearId: params.schoolYearId }),

    checkThresholds: (studentId: string) =>
      client.get(`/api/v1/attendance/students/${studentId}/threshold-check`),

    getConfigs: (params: { tenantId: string; branchId?: string }) =>
      client.get('/api/v1/attendance/config', params as any),

    createConfig: (data: any) =>
      client.post('/api/v1/attendance/config', data),

    getExcuses: (params: { tenantId: string; studentId?: string }) =>
      client.get('/api/v1/attendance/excuses', params as any),

    createExcuse: (data: any) =>
      client.post('/api/v1/attendance/excuses', data),

    reviewExcuse: (id: string, data: { status: string; reviewNotes?: string }) =>
      client.put(`/api/v1/attendance/excuses/${id}/review`, data),

    getThresholds: (params: { tenantId: string; branchId?: string }) =>
      client.get('/api/v1/attendance/thresholds', params as any),

    createThreshold: (data: any) =>
      client.post('/api/v1/attendance/thresholds', data),
  };
}
