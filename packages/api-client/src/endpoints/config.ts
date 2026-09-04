import type { ApiClient } from '../client';
import type {
  LookupList, LookupItem, CustomFieldDefinition,
  NumberingScheme, FeatureFlag, AuditEvent
} from '../types';

export const configEndpoints = (client: ApiClient) => ({
  // Lookup Lists
  listLookupLists: (params?: { tenantId?: string }) =>
    client.get<LookupList[]>('/api/v1/config/lookup-lists', params as Record<string, string>),

  createLookupList: (data: { name: string; code: string; description?: string }) =>
    client.post<LookupList>('/api/v1/config/lookup-lists', data),

  // Lookup Items
  listLookupItems: (params?: { listId?: string }) =>
    client.get<LookupItem[]>('/api/v1/config/lookup-items', params as Record<string, string>),

  createLookupItem: (data: { listId: string; value: string; label: string; sortOrder?: number }) =>
    client.post<LookupItem>('/api/v1/config/lookup-items', data),

  // Custom Fields
  listCustomFields: (params?: { entityType?: string }) =>
    client.get<CustomFieldDefinition[]>('/api/v1/config/custom-fields', params as Record<string, string>),

  createCustomField: (data: { entityType: string; fieldName: string; fieldType: string; label: string; isRequired?: boolean }) =>
    client.post<CustomFieldDefinition>('/api/v1/config/custom-fields', data),

  // Audit Events
  listAuditEvents: (params?: { entityType?: string; entityId?: string }) =>
    client.get<AuditEvent[]>('/api/v1/config/audit-events', params as Record<string, string>),
});
