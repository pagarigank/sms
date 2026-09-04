import type { ApiClient } from '../client';

export function admissionsEndpoints(client: ApiClient) {
  return {
    // Pipeline Stages
    getStages: (params: { tenantId: string; branchId?: string }) =>
      client.get('/api/v1/admissions/stages', params as any),

    createStage: (data: any) =>
      client.post('/api/v1/admissions/stages', data),

    updateStage: (id: string, data: any) =>
      client.put(`/api/v1/admissions/stages/${id}`, data),

    // Transitions
    getTransitions: (params: { tenantId: string }) =>
      client.get('/api/v1/admissions/transitions', params as any),

    createTransition: (data: any) =>
      client.post('/api/v1/admissions/transitions', data),

    // Pipeline Kanban
    getPipeline: (params: { tenantId: string }) =>
      client.get('/api/v1/admissions/pipeline', params as any),

    // Section Assignment Rules
    getSectionRules: (params: { tenantId: string; sectionId?: string }) =>
      client.get('/api/v1/admissions/section-rules', params as any),

    createSectionRule: (data: any) =>
      client.post('/api/v1/admissions/section-rules', data),

    updateSectionRule: (id: string, data: any) =>
      client.put(`/api/v1/admissions/section-rules/${id}`, data),

    // Bulk Import
    bulkImport: (records: any[]) =>
      client.post('/api/v1/admissions/bulk-import', { records }),
  };
}
