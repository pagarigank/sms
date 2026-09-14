import type { ApiClient } from '../client';
import type { Role, Permission, UserRole, RolePermission } from '../types';

export const iamEndpoints = (client: ApiClient) => ({
  listRoles: (params?: { tenantId?: string; search?: string }) =>
    client.get<Role[]>('/api/v1/iam/roles', params ? {
      tenantId: params.tenantId ?? '',
      search: params.search ?? '',
    } : undefined),

  getRole: (id: string) =>
    client.get<Role>(`/api/v1/iam/roles/${id}`),

  createRole: (data: { name: string; description?: string; isSystem?: boolean; tenantId: string }) =>
    client.post<Role>('/api/v1/iam/roles', data),

  updateRole: (id: string, data: Partial<Role>) =>
    client.put<Role>(`/api/v1/iam/roles/${id}`, data),

  deleteRole: (id: string) =>
    client.delete<void>(`/api/v1/iam/roles/${id}`),

  listPermissions: (params?: { resource?: string }) =>
    client.get<Permission[]>('/api/v1/iam/permissions', params ? { resource: params.resource ?? '' } : undefined),

  getRolePermissions: (roleId: string) =>
    client.get<RolePermission[]>(`/api/v1/iam/roles/${roleId}/permissions`),

  updateRolePermissions: (roleId: string, permissionIds: string[]) =>
    client.put<RolePermission[]>(`/api/v1/iam/roles/${roleId}/permissions`, { permissionIds }),

  getUserRoles: (userId: string) =>
    client.get<UserRole[]>(`/api/v1/iam/users/${userId}/roles`),

  getUserPermissions: (userId: string) =>
    client.get<Permission[]>(`/api/v1/iam/users/${userId}/permissions`),

  assignRoleToUser: (userId: string, roleId: string, tenantId: string, branchId?: string) =>
    client.post<UserRole>('/api/v1/iam/user-roles', { userId, roleId, branchId, tenantId }),

  removeRoleFromUser: (userId: string, roleId: string) =>
    client.delete<void>(`/api/v1/iam/users/${userId}/roles/${roleId}`),

  listUserRoles: (params?: { tenantId?: string; branchId?: string }) =>
    client.get<UserRole[]>('/api/v1/iam/user-roles', params ? {
      tenantId: params.tenantId ?? '',
      branchId: params.branchId ?? '',
    } : undefined),
});