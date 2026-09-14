import type { ApiClient } from '../client';
import type { Tenant, PaginatedResponse, TenantPlan } from '../types';

export const tenantEndpoints = (client: ApiClient) => ({
  list: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    client.get<Tenant[]>('/api/v1/tenants', params ? {
      page: String(params.page ?? 1),
      limit: String(params.limit ?? 100),
      search: params.search ?? '',
      status: params.status ?? '',
    } : undefined),

  get: (id: string) =>
    client.get<Tenant>(`/api/v1/tenants/${id}`),

  create: (data: { name: string; slug: string; planId?: string }) =>
    client.post<Tenant>('/api/v1/tenants', data),

  update: (id: string, data: Partial<Tenant>) =>
    client.put<Tenant>(`/api/v1/tenants/${id}`, data),

  delete: (id: string) =>
    client.delete<void>(`/api/v1/tenants/${id}`),

  suspend: (id: string) =>
    client.post<Tenant>(`/api/v1/tenants/${id}/suspend`, {}),

  activate: (id: string) =>
    client.post<Tenant>(`/api/v1/tenants/${id}/activate`, {}),

  listPlans: () =>
    client.get<TenantPlan[]>('/api/v1/tenants/plans'),
});