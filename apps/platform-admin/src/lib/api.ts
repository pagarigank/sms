import { ApiClient } from '@sms/api-client';
import { useAuthStore, useTenantStore } from './store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const apiClient = new ApiClient({
  baseUrl: API_BASE_URL,
  getToken: () => useAuthStore.getState().token,
  // Domain (tenant-scoped) controllers read the x-tenant-id header. Platform
  // admins impersonate a tenant by selecting one — currentTenantId wins over
  // the JWT's tenant (which platform admins may not even have).
  getTenantId: () =>
    useTenantStore.getState().currentTenantId ??
    useAuthStore.getState().user?.tenantId ??
    null,
  onUnauthorized: () => {
    useAuthStore.getState().clearAuth();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  },
});
