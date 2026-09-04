import type { ApiClient } from '../client';
import type { Branch, PaginatedResponse } from '../types';

export const branchEndpoints = (client: ApiClient) => ({
  list: (params?: { tenantId?: string; page?: number; limit?: number }) =>
    client.get<PaginatedResponse<Branch>>('/api/v1/branches', params as Record<string, string>),

  get: (id: string) =>
    client.get<Branch>(`/api/v1/branches/${id}`),

  create: (data: { name: string; code: string; tenantId: string; address?: string; tin?: string; birBranchCode?: string; levelsOffered?: string[] }) =>
    client.post<Branch>('/api/v1/branches', data),

  update: (id: string, data: Partial<Branch>) =>
    client.put<Branch>(`/api/v1/branches/${id}`, data),

  delete: (id: string) =>
    client.delete<void>(`/api/v1/branches/${id}`),
});
