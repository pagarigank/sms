'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export default function ConfigPage() {
  const { data: lookupLists } = useQuery({
    queryKey: ['config-lookup-lists'],
    queryFn: () => apiClient.config.listLookupLists(),
  });

  const { data: customFields } = useQuery({
    queryKey: ['config-custom-fields'],
    queryFn: () => apiClient.config.listCustomFields(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Config Engine</h1>
        <p className="text-muted-foreground">Manage lookup lists, custom fields, and numbering schemes</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Lookup Lists</h2>
          <p className="text-sm text-muted-foreground">Configurable reference data lists</p>
          <div className="mt-4 space-y-2">
            {lookupLists?.data?.map((list) => (
              <div key={list.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <span className="font-medium">{list.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">({list.code})</span>
                </div>
              </div>
            )) ?? (
              <p className="text-sm text-muted-foreground">No lookup lists configured</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Custom Fields</h2>
          <p className="text-sm text-muted-foreground">EAV fields attached to entities</p>
          <div className="mt-4 space-y-2">
            {customFields?.data?.map((field) => (
              <div key={field.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <span className="font-medium">{field.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({field.entityType} → {field.fieldType})
                  </span>
                </div>
              </div>
            )) ?? (
              <p className="text-sm text-muted-foreground">No custom fields configured</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Audit Log</h2>
        <p className="text-sm text-muted-foreground">Recent configuration changes</p>
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">Audit events will appear here as configurations are modified.</p>
        </div>
      </div>
    </div>
  );
}
