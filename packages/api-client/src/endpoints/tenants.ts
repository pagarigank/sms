import type { ApiClient } from '../client';
import type { Tenant, PaginatedResponse } from '../types';

export const tenantEndpoints = (client: ApiClient) => ({
  list: (params?: { page?: number; limit?: number }) =>
    client.get<Tenant[]>('/api/v1/tenants', params ? {
      page: String(params.page ?? 1),
      limit: String(params.limit ?? 100),
    } : undefined),

  get: (id: string) =>
    client.get<Tenant>(`/api/v1/tenants/${id}`),

  create: (data: { name: string; slug: string; planId?: string }) =>
    client.post<Tenant>('/api/v1/tenants', data),

  update: (id: string, data: Partial<Tenant>) =>
    client.put<Tenant>(`/api/v1/tenants/${id}`, data),

  delete: (id: string) =>
    client.delete<void>(`/api/v1/tenants/${id}`),
});
