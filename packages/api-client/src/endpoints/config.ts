import type { ApiClient } from '../client';
import type {
  LookupList, LookupItem, CustomFieldDefinition,
  NumberingScheme, FeatureFlag, AuditEvent,
  WorkflowDefinition, WorkflowInstance, WorkflowApproval
} from '../types';

export const configEndpoints = (client: ApiClient) => ({
  // Lookup Lists — backend list endpoint takes no params beyond the tenant header
  listLookupLists: (params?: { tenantId?: string }) =>
    client.get<LookupList[]>('/api/v1/config/lookup-lists', params?.tenantId ? { tenantId: params.tenantId } : undefined),

  getLookupList: (id: string) =>
    client.get<LookupList>(`/api/v1/config/lookup-lists/${id}`),

  createLookupList: (data: { name: string; entityType: string; isActive?: boolean }) =>
    client.post<LookupList>('/api/v1/config/lookup-lists', data),

  updateLookupList: (id: string, data: Partial<LookupList>) =>
    client.put<LookupList>(`/api/v1/config/lookup-lists/${id}`, data),

  deleteLookupList: (id: string) =>
    client.delete<void>(`/api/v1/config/lookup-lists/${id}`),

  // Lookup Items — backend route is GET /config/lookup-lists/items?lookupListId=
  listLookupItems: (params?: { listId?: string; search?: string }) =>
    client.get<LookupItem[]>('/api/v1/config/lookup-lists/items', params?.listId ? { lookupListId: params.listId } : undefined),

  createLookupItem: (data: { lookupListId: string; value: string; label: string; sortOrder?: number; isActive?: boolean }) =>
    client.post<LookupItem>('/api/v1/config/lookup-items', data),

  updateLookupItem: (id: string, data: Partial<LookupItem>) =>
    client.put<LookupItem>(`/api/v1/config/lookup-items/${id}`, data),

  deleteLookupItem: (id: string) =>
    client.delete<void>(`/api/v1/config/lookup-items/${id}`),

  // Custom Fields — entity fields are fieldKey/required (not fieldName/isRequired)
  listCustomFields: (params?: { entityType?: string; tenantId?: string }) =>
    client.get<CustomFieldDefinition[]>('/api/v1/config/custom-fields', params?.entityType ? { entityType: params.entityType } : undefined),

  getCustomField: (id: string) =>
    client.get<CustomFieldDefinition>(`/api/v1/config/custom-fields/${id}`),

  createCustomField: (data: { entityType: string; fieldKey: string; fieldType: string; label: string; required?: boolean; options?: any[]; validationRules?: Record<string, unknown> }) =>
    client.post<CustomFieldDefinition>('/api/v1/config/custom-fields', data),

  updateCustomField: (id: string, data: Partial<CustomFieldDefinition>) =>
    client.put<CustomFieldDefinition>(`/api/v1/config/custom-fields/${id}`, data),

  deleteCustomField: (id: string) =>
    client.delete<void>(`/api/v1/config/custom-fields/${id}`),

  // Numbering Schemes — entity fields are name/entityType/format/counterValue
  listNumberingSchemes: (params?: { entityName?: string; tenantId?: string; branchId?: string }) =>
    client.get<NumberingScheme[]>('/api/v1/config/numbering-schemes', params?.tenantId ? { tenantId: params.tenantId } : undefined),

  createNumberingScheme: (data: { name: string; entityType: string; format: string; branchId?: string }) =>
    client.post<NumberingScheme>('/api/v1/config/numbering-schemes', data),

  updateNumberingScheme: (id: string, data: Partial<NumberingScheme>) =>
    client.put<NumberingScheme>(`/api/v1/config/numbering-schemes/${id}`, data),

  // Feature Flags — entity fields are flagKey/enabled/rolloutPercentage
  listFeatureFlags: (params?: { tenantId?: string; branchId?: string }) =>
    client.get<FeatureFlag[]>('/api/v1/config/feature-flags', params?.tenantId ? { tenantId: params.tenantId } : undefined),

  createFeatureFlag: (data: { flagKey: string; enabled?: boolean; rolloutPercentage?: number; branchId?: string }) =>
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

  // Audit Events — backend takes tenant header + entityType/entityId filters
  listAuditEvents: (params?: { tenantId?: string; entityType?: string; entityId?: string }) => {
    const clean: Record<string, string> = {};
    if (params?.tenantId) clean.tenantId = params.tenantId;
    if (params?.entityType) clean.entityType = params.entityType;
    if (params?.entityId) clean.entityId = params.entityId;
    return client.get<AuditEvent[]>('/api/v1/config/audit-events', Object.keys(clean).length ? clean : undefined);
  },

  getAuditEvent: (id: string) =>
    client.get<AuditEvent>(`/api/v1/config/audit-events/${id}`),
});