import { ApiClient } from '@sms/api-client';
import { useAuthStore } from './store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const apiClient = new ApiClient({
  baseUrl: API_BASE_URL,
  getToken: () => useAuthStore.getState().token,
  // Backend controllers read x-tenant-id for tenant context (RLS + queries).
  // The JWT carries tenantId; mirror it into the header like the school portal.
  getTenantId: () => useAuthStore.getState().user?.tenantId ?? null,
  onUnauthorized: () => {
    useAuthStore.getState().clearAuth();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  },
});
