import type { ApiClient } from '../client';

/** Admissions pipeline applicant row (mirrors the backend Applicant entity). */
export interface Applicant {
  id: string;
  tenantId: string;
  branchId?: string | null;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  address?: string | null;
  previousSchool?: string | null;
  gradeLevelAppliedFor?: string | null;
  source?: string | null;
  status: string;
  stageId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Pipeline stage configuration row. */
export interface ApplicantStage {
  id: string;
  tenantId: string;
  branchId?: string | null;
  stageName: string;
  stageCode: string;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
}

/** Kanban payload: configured stages + applicants grouped by stage code. */
export interface AdmissionsPipeline {
  stages: ApplicantStage[];
  pipeline: Record<string, Applicant[]>;
}

export function admissionsEndpoints(client: ApiClient) {
  return {
    // Pipeline Stages
    getStages: (params: { tenantId: string; branchId?: string }) =>
      client.get<ApplicantStage[]>('/api/v1/admissions/stages', params as any),

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
      client.get<AdmissionsPipeline>('/api/v1/admissions/pipeline', params as any),

    // Applicants (G-23) — tenant comes from the x-tenant-id header
    createApplicant: (data: {
      firstName: string;
      lastName: string;
      middleName?: string;
      email?: string;
      phone?: string;
      birthDate?: string;
      gender?: string;
      address?: string;
      previousSchool?: string;
      gradeLevelAppliedFor?: string;
      source?: string;
      notes?: string;
      branchId?: string;
      stageId?: string;
    }) => client.post('/api/v1/admissions/applicants', data),

    listApplicants: (params?: { status?: string }) =>
      client.get<Applicant[]>('/api/v1/admissions/applicants', params as any),

    getApplicant: (id: string) =>
      client.get<Applicant>(`/api/v1/admissions/applicants/${id}`),

    updateApplicant: (id: string, data: any) =>
      client.put(`/api/v1/admissions/applicants/${id}`, data),

    moveApplicantStage: (id: string, stageId: string) =>
      client.put(`/api/v1/admissions/applicants/${id}/stage`, { stageId }),

    convertApplicant: (id: string) =>
      client.post(`/api/v1/admissions/applicants/${id}/convert`),

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
