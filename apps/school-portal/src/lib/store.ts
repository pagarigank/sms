import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@sms/api-client';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  setAuth: (user: User, token: string, refreshToken: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      setAuth: (user, token, refreshToken) => set({ user, token, refreshToken }),
      clearAuth: () => set({ user: null, token: null, refreshToken: null }),
      isAuthenticated: () => !!get().token,
    }),
    { name: 'school-portal-auth' }
  )
);

interface TenantState {
  currentTenantId: string | null;
  currentBranchId: string | null;
  setCurrentTenant: (tenantId: string | null) => void;
  setCurrentBranch: (branchId: string | null) => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      currentTenantId: null,
      currentBranchId: null,
      setCurrentTenant: (tenantId) => set({ currentTenantId: tenantId, currentBranchId: null }),
      setCurrentBranch: (branchId) => set({ currentBranchId: branchId }),
    }),
    { name: 'school-portal-tenant' }
  )
);
