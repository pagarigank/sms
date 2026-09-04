import type { ApiClient } from '../client';
import type { Role, Permission, UserRole } from '../types';

export const iamEndpoints = (client: ApiClient) => ({
  listRoles: () =>
    client.get<Role[]>('/api/v1/iam/roles'),

  listPermissions: () =>
    client.get<Permission[]>('/api/v1/iam/permissions'),

  getUserRoles: (userId: string) =>
    client.get<UserRole[]>(`/api/v1/iam/users/${userId}/roles`),

  getUserPermissions: (userId: string) =>
    client.get<Permission[]>(`/api/v1/iam/users/${userId}/permissions`),
});
