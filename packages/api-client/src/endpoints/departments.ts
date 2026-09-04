import type { ApiClient } from '../client';
import type { Department } from '../types';

export const departmentEndpoints = (client: ApiClient) => ({
  list: (params?: { tenantId?: string; branchId?: string }) =>
    client.get<Department[]>('/api/v1/departments', params as Record<string, string>),

  get: (id: string) =>
    client.get<Department>(`/api/v1/departments/${id}`),

  create: (data: { name: string; branchId: string; educationLevelIds: string[]; isDefault?: boolean }) =>
    client.post<Department>('/api/v1/departments', data),

  delete: (id: string) =>
    client.delete<void>(`/api/v1/departments/${id}`),
});
