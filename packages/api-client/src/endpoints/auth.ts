import type { ApiClient } from '../client';
import type { AuthTokens, LoginRequest, RegisterRequest, User } from '../types';

export const authEndpoints = (client: ApiClient) => ({
  login: (data: LoginRequest) =>
    client.post<AuthTokens>('/api/v1/auth/login', data),

  register: (data: RegisterRequest) =>
    client.post<AuthTokens>('/api/v1/auth/register', data),

  refresh: (refreshToken: string) =>
    client.post<AuthTokens>('/api/v1/auth/refresh', { refreshToken }),

  me: () =>
    client.get<User>('/api/v1/auth/me'),
});
