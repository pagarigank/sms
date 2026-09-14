import type { ApiClient } from '../client';
import type { Department, EducationLevel, Tenant, Branch } from '../types';

export const departmentEndpoints = (client: ApiClient) => ({
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    tenantId?: string;
    branchId?: string;
  }) =>
    client.get<Department[]>('/api/v1/departments', params ? {
      page: String(params.page ?? 1),
      limit: String(params.limit ?? 100),
      search: params.search ?? '',
      tenantId: params.tenantId ?? '',
      branchId: params.branchId ?? '',
    } : undefined),

  get: (id: string) =>
    client.get<Department>(`/api/v1/departments/${id}`),

  create: (data: {
    name: string;
    code: string;
    tenantId: string;
    branchId: string;
    educationLevelIds?: string[];
    isDefault?: boolean;
    contactEmail?: string;
  }) =>
    client.post<Department>('/api/v1/departments', data),

  update: (id: string, data: Partial<Department>) =>
    client.put<Department>(`/api/v1/departments/${id}`, data),

  delete: (id: string) =>
    client.delete<void>(`/api/v1/departments/${id}`),

  setDefault: (id: string) =>
    client.post<Department>(`/api/v1/departments/${id}/set-default`, {}),

  getEducationLevels: () =>
    client.get<EducationLevel[]>('/api/v1/academic/education-levels'),

  getTenants: () =>
    client.get<Tenant[]>('/api/v1/tenants'),

  getBranches: (tenantId: string) =>
    client.get<Branch[]>(`/api/v1/branches`, { tenantId, limit: '100' }),
});