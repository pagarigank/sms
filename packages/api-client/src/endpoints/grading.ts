import type { ApiClient } from '../client';
import type { GradingSystem, GradeComponent, HonorRollConfig } from '../types';

export const gradingEndpoints = (client: ApiClient) => ({
  // Grading Systems
  listGradingSystems: (params?: { educationLevelId?: string; schoolYearId?: string }) =>
    client.get<GradingSystem[]>('/api/v1/grading/systems', params as Record<string, string>),

  getGradingSystem: (id: string) =>
    client.get<GradingSystem>(`/api/v1/grading/systems/${id}`),

  createGradingSystem: (data: { educationLevelId: string; schoolYearId: string; name: string; type: string; config?: Record<string, unknown> }) =>
    client.post<GradingSystem>('/api/v1/grading/systems', data),

  resolveGradingSystem: (params: { educationLevelId: string; schoolYearId: string; branchId?: string }) =>
    client.get<GradingSystem>('/api/v1/grading/systems/resolve', params as Record<string, string>),

  // Grade Components
  listGradeComponents: (params?: { gradingSystemId?: string }) =>
    client.get<GradeComponent[]>('/api/v1/grading/components', params as Record<string, string>),

  createGradeComponent: (data: { gradingSystemId: string; name: string; weight: number; order: number }) =>
    client.post<GradeComponent>('/api/v1/grading/components', data),

  // Honor Roll
  listHonorRollConfigs: (params?: { educationLevelId?: string; schoolYearId?: string }) =>
    client.get<HonorRollConfig[]>('/api/v1/grading/honor-roll', params as Record<string, string>),

  createHonorRollConfig: (data: { educationLevelId: string; schoolYearId: string; withHonorsThreshold: number; withHighHonorsThreshold: number; withHighestHonorsThreshold: number }) =>
    client.post<HonorRollConfig>('/api/v1/grading/honor-roll', data),
});
