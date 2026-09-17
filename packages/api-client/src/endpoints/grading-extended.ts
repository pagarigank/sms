import type { ApiClient } from '../client';

export function gradingExtendedEndpoints(client: ApiClient) {
  return {
    getGradebook: (params: { tenantId: string; classOfferingId: string }) =>
      client.get(`/api/v1/grading/class/${params.classOfferingId}/gradebook`),

    enterGrade: (data: {
      classOfferingId: string;
      termId: string;
      studentId: string;
      gradeComponentId: string;
      rawScore?: number;
      percentage?: number;
      descriptiveGrade?: string;
      gradingMode?: string;
    }) =>
      client.post('/api/v1/grading/entries', data),

    bulkEnterGrades: (body: { 
      entries: Array<{
        classOfferingId: string;
        termId: string;
        studentId: string;
        gradeComponentId: string;
        rawScore?: number;
        percentage?: number;
        descriptiveGrade?: string;
        gradingMode?: string;
      }>
    }) =>
      client.post('/api/v1/grading/entries/bulk', body),

    finalizeGrades: (params: { classOfferingId: string; termId: string }) =>
      client.post(`/api/v1/grading/class/${params.classOfferingId}/finalize?termId=${encodeURIComponent(params.termId)}`, null),

    getStudentGrades: (params: { tenantId: string; studentId: string; termId?: string }) =>
      client.get(`/api/v1/grading/students/${params.studentId}`, params as any),

    getChangeRequests: (params: { tenantId: string; classOfferingId?: string }) =>
      client.get('/api/v1/grading/change-requests', params as any),

    createChangeRequest: (data: any) =>
      client.post('/api/v1/grading/change-requests', data),

    approveChangeRequest: (id: string) =>
      client.put(`/api/v1/grading/change-requests/${id}/approve`),

    rejectChangeRequest: (id: string, data: { reason?: string }) =>
      client.put(`/api/v1/grading/change-requests/${id}/reject`, data),

    getPermanentRecord: (params: { tenantId: string; studentId: string; schoolYearId: string }) =>
      client.get('/api/v1/grading/permanent-records', params as any),

    createPermanentRecord: (data: any) =>
      client.post('/api/v1/grading/permanent-records', data),

    finalizePermanentRecord: (id: string) =>
      client.put(`/api/v1/grading/permanent-records/${id}/finalize`),

    generateForm137: (params: { tenantId: string; studentId: string; schoolYearId: string }) =>
      client.get('/api/v1/grading/permanent-records/form137', params as any),

    generateTOR: (params: { tenantId: string; studentId: string }) =>
      client.get('/api/v1/grading/permanent-records/tor', params as any),
  };
}
