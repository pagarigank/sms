import type { ApiClient } from '../client';
import type { User, UserRole, Role, Tenant, PaginatedResponse } from '../types';

export const userEndpoints = (client: ApiClient) => ({
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    tenantId?: string;
  }) =>
    client.get<User[]>('/api/v1/users', params ? {
      page: String(params.page ?? 1),
      limit: String(params.limit ?? 100),
      search: params.search ?? '',
      status: params.status ?? '',
      tenantId: params.tenantId ?? '',
    } : undefined),

  get: (id: string) =>
    client.get<User>(`/api/v1/users/${id}`),

  create: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    tenantId: string;
    roleIds?: string[];
  }) =>
    client.post<User>('/api/v1/users', data),

  update: (id: string, data: Partial<User>) =>
    client.put<User>(`/api/v1/users/${id}`, data),

  suspend: (id: string) =>
    client.post<User>(`/api/v1/users/${id}/suspend`, {}),

  activate: (id: string) =>
    client.post<User>(`/api/v1/users/${id}/activate`, {}),

  unlock: (id: string) =>
    client.post<User>(`/api/v1/users/${id}/unlock`, {}),

  resetPassword: (id: string, newPassword: string) =>
    client.post<User>(`/api/v1/users/${id}/reset-password`, { newPassword }),

  getRoles: (userId: string) =>
    client.get<UserRole[]>(`/api/v1/iam/users/${userId}/roles`),

  assignRoles: (userId: string, roleIds: string[]) =>
    client.put<UserRole[]>(`/api/v1/users/${userId}/roles`, { roleIds }),

  getTenants: () =>
    client.get<Tenant[]>('/api/v1/tenants'),

  listRoles: () =>
    client.get<Role[]>('/api/v1/iam/roles'),

  // Aliased names used by the IAM Users & Roles page
  listUsers: (params?: { tenantId?: string; search?: string; status?: string }) =>
    client.get<User[]>('/api/v1/users', params ? {
      tenantId: params.tenantId ?? '',
      search: params.search ?? '',
      status: params.status ?? '',
    } : undefined),

  createUser: (data: { email: string; password: string; firstName?: string; lastName?: string; middleName?: string; phone?: string; tenantId?: string }) =>
    client.post<User>('/api/v1/users', data),

  updateUser: (id: string, data: Partial<User>) =>
    client.put<User>(`/api/v1/users/${id}`, data),

  suspendUser: (id: string) =>
    client.post<User>(`/api/v1/users/${id}/suspend`, {}),

  activateUser: (id: string) =>
    client.post<User>(`/api/v1/users/${id}/activate`, {}),

  getUserRoles: (userId: string) =>
    client.get<UserRole[]>(`/api/v1/iam/users/${userId}/roles`),
});