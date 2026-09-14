import type { ApiClient } from '../client';
import type {
  LookupList, LookupItem, CustomFieldDefinition,
  NumberingScheme, FeatureFlag, AuditEvent,
  WorkflowDefinition, WorkflowInstance, WorkflowApproval
} from '../types';

export const configEndpoints = (client: ApiClient) => ({
  // Lookup Lists
  listLookupLists: (params?: { tenantId?: string; search?: string }) =>
    client.get<LookupList[]>('/api/v1/config/lookup-lists', params ? {
      tenantId: params.tenantId ?? '',
      search: params.search ?? '',
    } : undefined),

  getLookupList: (id: string) =>
    client.get<LookupList>(`/api/v1/config/lookup-lists/${id}`),

  createLookupList: (data: { name: string; code: string; description?: string }) =>
    client.post<LookupList>('/api/v1/config/lookup-lists', data),

  updateLookupList: (id: string, data: Partial<LookupList>) =>
    client.put<LookupList>(`/api/v1/config/lookup-lists/${id}`, data),

  deleteLookupList: (id: string) =>
    client.delete<void>(`/api/v1/config/lookup-lists/${id}`),

  // Lookup Items — backend route is GET /config/lookup-lists/items?lookupListId=
  listLookupItems: (params?: { listId?: string; search?: string }) =>
    client.get<LookupItem[]>('/api/v1/config/lookup-lists/items', params ? {
      lookupListId: params.listId ?? '',
      search: params.search ?? '',
    } : undefined),

  createLookupItem: (data: { listId: string; value: string; label: string; sortOrder?: number; isActive?: boolean }) =>
    client.post<LookupItem>('/api/v1/config/lookup-items', data),

  updateLookupItem: (id: string, data: Partial<LookupItem>) =>
    client.put<LookupItem>(`/api/v1/config/lookup-items/${id}`, data),

  deleteLookupItem: (id: string) =>
    client.delete<void>(`/api/v1/config/lookup-items/${id}`),

  // Custom Fields
  listCustomFields: (params?: { entityType?: string; search?: string }) =>
    client.get<CustomFieldDefinition[]>('/api/v1/config/custom-fields', params ? {
      entityType: params.entityType ?? '',
      search: params.search ?? '',
    } : undefined),

  getCustomField: (id: string) =>
    client.get<CustomFieldDefinition>(`/api/v1/config/custom-fields/${id}`),

  createCustomField: (data: { entityType: string; fieldName: string; fieldType: string; label: string; isRequired?: boolean; options?: Record<string, unknown>; validationRules?: Record<string, unknown> }) =>
    client.post<CustomFieldDefinition>('/api/v1/config/custom-fields', data),

  updateCustomField: (id: string, data: Partial<CustomFieldDefinition>) =>
    client.put<CustomFieldDefinition>(`/api/v1/config/custom-fields/${id}`, data),

  deleteCustomField: (id: string) =>
    client.delete<void>(`/api/v1/config/custom-fields/${id}`),

  // Numbering Schemes
  listNumberingSchemes: (params?: { entityName?: string; tenantId?: string; branchId?: string }) =>
    client.get<NumberingScheme[]>('/api/v1/config/numbering-schemes', params ? {
      entityName: params.entityName ?? '',
      tenantId: params.tenantId ?? '',
      branchId: params.branchId ?? '',
    } : undefined),

  createNumberingScheme: (data: { entityName: string; prefix: string; padding: number; tenantId: string; branchId?: string }) =>
    client.post<NumberingScheme>('/api/v1/config/numbering-schemes', data),

  updateNumberingScheme: (id: string, data: Partial<NumberingScheme>) =>
    client.put<NumberingScheme>(`/api/v1/config/numbering-schemes/${id}`, data),

  // Feature Flags
  listFeatureFlags: (params?: { tenantId?: string; branchId?: string }) =>
    client.get<FeatureFlag[]>('/api/v1/config/feature-flags', params ? {
      tenantId: params.tenantId ?? '',
      branchId: params.branchId ?? '',
    } : undefined),

  createFeatureFlag: (data: { flagKey: string; name: string; isEnabled?: boolean; config?: Record<string, unknown>; tenantId: string; branchId?: string }) =>
    client.post<FeatureFlag>('/api/v1/config/feature-flags', data),

  updateFeatureFlag: (id: string, data: Partial<FeatureFlag>) =>
    client.put<FeatureFlag>(`/api/v1/config/feature-flags/${id}`, data),

  deleteFeatureFlag: (id: string) =>
    client.delete<void>(`/api/v1/config/feature-flags/${id}`),

  // Workflows
  listWorkflowDefinitions: (params?: { entityType?: string }) =>
    client.get<WorkflowDefinition[]>('/api/v1/config/workflows', params ? { entityType: params.entityType ?? '' } : undefined),

  createWorkflowDefinition: (data: { entityType: string; name: string; steps: unknown[] }) =>
    client.post<WorkflowDefinition>('/api/v1/config/workflows', data),

  updateWorkflowDefinition: (id: string, data: Partial<WorkflowDefinition>) =>
    client.put<WorkflowDefinition>(`/api/v1/config/workflows/${id}`, data),

  listWorkflowInstances: (params?: { entityType?: string; entityId?: string; status?: string }) =>
    client.get<WorkflowInstance[]>('/api/v1/config/workflow-instances', params ? {
      entityType: params.entityType ?? '',
      entityId: params.entityId ?? '',
      status: params.status ?? '',
    } : undefined),

  // Audit Events
  listAuditEvents: (params?: { tenantId?: string; entityType?: string; entityId?: string; page?: number; limit?: number }) => {
    const clean: Record<string, string> = {};
    if (params?.tenantId) clean.tenantId = params.tenantId;
    if (params?.entityType) clean.entityType = params.entityType;
    if (params?.entityId) clean.entityId = params.entityId;
    clean.page = String(params?.page ?? 1);
    clean.limit = String(params?.limit ?? 50);
    return client.get<AuditEvent[]>('/api/v1/config/audit-events', clean);
  },

  getAuditEvent: (id: string) =>
    client.get<AuditEvent>(`/api/v1/config/audit-events/${id}`),
});