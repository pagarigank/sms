import { ApiClient } from '@sms/api-client';
import { useAuthStore } from './store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const apiClient = new ApiClient({
  baseUrl: API_BASE_URL,
  getToken: () => useAuthStore.getState().token,
  getTenantId: () => useAuthStore.getState().user?.tenantId ?? null,
  onUnauthorized: () => {
    useAuthStore.getState().clearAuth();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  },
});
