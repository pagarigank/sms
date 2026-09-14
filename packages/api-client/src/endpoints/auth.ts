import type { ApiClient } from '../client';
import type {
  AuthTokens, ImpersonationGrant, LoginRequest, LoginResponse,
  MfaVerifyRequest, RegisterRequest, MeResponse, User,
} from '../types';

export const authEndpoints = (client: ApiClient) => ({
  login: (data: LoginRequest) =>
    client.post<LoginResponse>('/api/v1/auth/login', data),

  register: (data: RegisterRequest) =>
    client.post<AuthTokens>('/api/v1/auth/register', data),

  refresh: (refreshToken: string) =>
    client.post<AuthTokens>('/api/v1/auth/refresh', { refreshToken }),

  me: () =>
    client.get<MeResponse>('/api/v1/auth/me'),

  tenantLookup: (slug: string) =>
    client.get<{ id: string; name: string; slug: string }>('/api/v1/auth/tenant-lookup', { slug }),

  // === MFA ===
  mfaVerify: (data: MfaVerifyRequest) =>
    client.post<AuthTokens>('/api/v1/auth/mfa/verify', data),

  mfaSetup: () =>
    client.post<{ otpauthUrl: string; secret: string }>('/api/v1/auth/mfa/setup', {}),

  // === Impersonation ===
  // Backend route is GET /auth/impersonate/active (was /auth/impersonation-grants → 404)
  getActiveGrants: () =>
    client.get<ImpersonationGrant[]>('/api/v1/auth/impersonate/active'),

  requestImpersonation: (data: { targetTenantId: string; reason: string }) =>
    client.post<ImpersonationGrant>('/api/v1/auth/impersonate/request', data),

  breakGlass: (data: { targetTenantId: string; reason: string }) =>
    client.post<ImpersonationGrant>('/api/v1/auth/impersonate/break-glass', data),

  getImpersonationToken: (grantId: string) =>
    client.post<{ accessToken: string; refreshToken: string }>(`/api/v1/auth/impersonate/token/${grantId}`, {}),

  endImpersonation: (grantId: string) =>
    client.post<void>(`/api/v1/auth/impersonate/end/${grantId}`, {}),
});
