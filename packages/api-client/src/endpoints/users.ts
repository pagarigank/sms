import type { ApiClient } from '../client';
import type { User } from '../types';

export const userEndpoints = (client: ApiClient) => ({
  get: (id: string) =>
    client.get<User>(`/api/v1/users/${id}`),
});
