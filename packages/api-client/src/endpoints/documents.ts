import type { ApiClient } from '../client';

export function documentsEndpoints(client: ApiClient) {
  return {
    // === Templates ===
    getTemplates: (params: { tenantId: string; documentType?: string }) =>
      client.get('/api/v1/documents/templates', params as any),

    createTemplate: (data: any) =>
      client.post('/api/v1/documents/templates', data),

    updateTemplate: (id: string, data: any) =>
      client.put(`/api/v1/documents/templates/${id}`, data),

    // === Requests ===
    getRequests: (params: { tenantId: string; studentId?: string; status?: string }) =>
      client.get('/api/v1/documents/requests', params as any),

    createRequest: (data: any) =>
      client.post('/api/v1/documents/requests', data),

    updateRequestStatus: (id: string, status: string) =>
      client.put(`/api/v1/documents/requests/${id}/status`, { status }),

    approveRequest: (id: string, data: { releasedBy: string }) =>
      client.put(`/api/v1/documents/requests/${id}/approve`, data),

    // === Generated Documents ===
    generateDocument: (data: any) =>
      client.post('/api/v1/documents/generate', data),

    getGeneratedDocs: (params: { tenantId: string; studentId?: string }) =>
      client.get('/api/v1/documents/generated', params as any),

    verifyDocument: (code: string) =>
      client.get(`/api/v1/documents/verify/${code}`),

    voidDocument: (id: string) =>
      client.put(`/api/v1/documents/generated/${id}/void`),
  };
}
