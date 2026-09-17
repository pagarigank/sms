'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { DataTable } from '@sms/ui';
import { ColumnDef } from '@tanstack/react-table';
import { useToast, Badge, statusToVariant } from '@sms/ui';
import { Plus, Hash, List, FileText, BarChart3, Wrench, Building2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@sms/ui';
import { Button } from '@sms/ui';
import { Input } from '@sms/ui';
import { Label } from '@sms/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sms/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sms/ui';

// Rows come straight from the api-client types (aligned with the backend
// entities); only the lookup-list view needs a client-side item count.
type LookupListView = import('@sms/api-client').LookupList & { itemCount: number };
type CustomFieldView = import('@sms/api-client').CustomFieldDefinition;
type NumberingSchemeView = import('@sms/api-client').NumberingScheme;
type FeatureFlagView = import('@sms/api-client').FeatureFlag;

interface AuditEvent {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorUserId?: string;
  occurredAt: string;
}

interface Tenant {
  id: string;
  name: string;
}

// All /config endpoints are tenant-scoped (x-tenant-id header). A platform
// admin must select which tenant's configuration to manage before any data
// loads — otherwise every query would run without a tenant context.
function useSelectedTenant(tenants: Tenant[] | undefined) {
  const currentTenantId = useTenantStore((s) => s.currentTenantId);
  const setCurrentTenant = useTenantStore((s) => s.setCurrentTenant);

  const selectedTenantId =
    currentTenantId ?? (tenants && tenants.length > 0 ? tenants[0].id : null);

  return { selectedTenantId, setSelectedTenantId: setCurrentTenant };
}

export default function ConfigPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('lookups');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: tenantsRes } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => apiClient.tenants.list({ limit: 100 }),
  });
  const tenants: Tenant[] = tenantsRes?.data ?? [];
  const { selectedTenantId, setSelectedTenantId } = useSelectedTenant(tenants);

  const tenantParams = selectedTenantId ? { tenantId: selectedTenantId } : undefined;
  const enabled = Boolean(selectedTenantId);

  // === Queries (all tenant-scoped via the x-tenant-id header) ===
  const { data: lookupListsRes, isLoading: lookupsLoading } = useQuery({
    queryKey: ['config-lookup-lists', selectedTenantId],
    queryFn: () => apiClient.config.listLookupLists(tenantParams),
    enabled,
  });

  const { data: customFieldsRes, isLoading: fieldsLoading } = useQuery({
    queryKey: ['config-custom-fields', selectedTenantId],
    queryFn: () => apiClient.config.listCustomFields({}),
    enabled,
  });

  const { data: numberingRes, isLoading: numberingLoading } = useQuery({
    queryKey: ['config-numbering-schemes', selectedTenantId],
    queryFn: () => apiClient.config.listNumberingSchemes(tenantParams),
    enabled,
  });

  const { data: flagsRes, isLoading: flagsLoading } = useQuery({
    queryKey: ['config-feature-flags', selectedTenantId],
    queryFn: () => apiClient.config.listFeatureFlags(tenantParams),
    enabled,
  });

  const { data: auditRes, isLoading: auditLoading } = useQuery({
    queryKey: ['config-audit-events', selectedTenantId],
    queryFn: () => apiClient.config.listAuditEvents({ tenantId: selectedTenantId! }),
    enabled,
  });

  const { data: lookupItemsRes } = useQuery({
    queryKey: ['config-lookup-items', selectedTenantId],
    queryFn: () => apiClient.config.listLookupItems({}),
    enabled,
  });

  // Item counts per lookup list (client-side reduce over the flat item list)
  const itemCountByList = new Map<string, number>();
  for (const item of lookupItemsRes?.data ?? []) {
    itemCountByList.set(item.lookupListId, (itemCountByList.get(item.lookupListId) ?? 0) + 1);
  }

  const lookupLists: LookupListView[] = (lookupListsRes?.data ?? []).map((l) => ({
    ...l,
    itemCount: itemCountByList.get(l.id) ?? 0,
  }));
  const customFields: CustomFieldView[] = customFieldsRes?.data ?? [];
  const numberingSchemes: NumberingSchemeView[] = numberingRes?.data ?? [];
  const featureFlags: FeatureFlagView[] = flagsRes?.data ?? [];
  const auditEvents: AuditEvent[] = auditRes?.data ?? [];

  const invalidate = (key: string) =>
    queryClient.invalidateQueries({ queryKey: [key, selectedTenantId] });

  // === Mutations ===
  const createLookupList = useMutation({
    mutationFn: (data: { name: string; entityType: string }) =>
      apiClient.config.createLookupList(data),
    onSuccess: () => {
      invalidate('config-lookup-lists');
      toast({ title: 'Lookup list created' });
      setNewLookup(null);
    },
    onError: (error: Error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const createCustomField = useMutation({
    mutationFn: (data: { entityType: string; fieldKey: string; label: string; fieldType: string; required: boolean }) =>
      apiClient.config.createCustomField(data),
    onSuccess: () => {
      invalidate('config-custom-fields');
      toast({ title: 'Custom field created' });
      setNewField(null);
    },
    onError: (error: Error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const createNumberingScheme = useMutation({
    mutationFn: (data: { name: string; entityType: string; format: string }) =>
      apiClient.config.createNumberingScheme(data),
    onSuccess: () => {
      invalidate('config-numbering-schemes');
      toast({ title: 'Numbering scheme created' });
      setNewScheme(null);
    },
    onError: (error: Error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const createFeatureFlag = useMutation({
    mutationFn: (data: { flagKey: string; enabled: boolean }) =>
      apiClient.config.createFeatureFlag(data),
    onSuccess: () => {
      invalidate('config-feature-flags');
      toast({ title: 'Feature flag created' });
      setNewFlag(null);
    },
    onError: (error: Error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const toggleFeatureFlag = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiClient.config.updateFeatureFlag(id, { enabled }),
    onSuccess: () => invalidate('config-feature-flags'),
    onError: (error: Error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  // === Dialog state ===
  const [newLookup, setNewLookup] = useState<{ name: string; entityType: string } | null>(null);
  const [newField, setNewField] = useState<{
    entityType: string; fieldKey: string; label: string; fieldType: string; required: boolean;
  } | null>(null);
  const [newScheme, setNewScheme] = useState<{ name: string; entityType: string; format: string } | null>(null);
  const [newFlag, setNewFlag] = useState<{ flagKey: string } | null>(null);

  const q = searchQuery.trim().toLowerCase();
  const filteredLookups = q ? lookupLists.filter((l) => `${l.name} ${l.entityType}`.toLowerCase().includes(q)) : lookupLists;
  const filteredFields = q ? customFields.filter((f) => `${f.label} ${f.fieldKey} ${f.entityType}`.toLowerCase().includes(q)) : customFields;

  const lookupColumns: ColumnDef<any, any>[] = [
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><List className="h-4 w-4 text-primary" /></span><div><p className="font-medium">{row.original.name}</p><p className="text-xs text-muted-foreground">{row.original.entityType}</p></div></div> },
    { accessorKey: 'isActive', header: 'Status', cell: ({ row }) => <Badge variant={statusToVariant(row.original.isActive)}>{row.original.isActive ? 'Active' : 'Inactive'}</Badge> },
    { accessorKey: 'itemCount', header: 'Items', cell: ({ row }) => <span className="font-medium">{row.original.itemCount}</span> },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ row }) => row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString() : '—' },
  ];

  const customFieldColumns: ColumnDef<any, any>[] = [
    { accessorKey: 'label', header: 'Label', cell: ({ row }) => <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><FileText className="h-4 w-4 text-primary" /></span><div><p className="font-medium">{row.original.label}</p><p className="text-xs text-muted-foreground">{row.original.fieldKey}</p></div></div> },
    { accessorKey: 'entityType', header: 'Entity', cell: ({ row }) => <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">{row.original.entityType}</span> },
    { accessorKey: 'fieldType', header: 'Type', cell: ({ row }) => <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">{row.original.fieldType}</span> },
    { accessorKey: 'required', header: 'Required', cell: ({ row }) => row.original.required ? <span className="text-green-600">Yes</span> : <span className="text-muted-foreground">No</span> },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ row }) => row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString() : '—' },
  ];

  const numberingColumns: ColumnDef<any, any>[] = [
    { accessorKey: 'name', header: 'Scheme', cell: ({ row }) => <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><Hash className="h-4 w-4 text-primary" /></span><div><p className="font-medium">{row.original.name}</p><p className="text-xs text-muted-foreground">{row.original.entityType}</p></div></div> },
    { accessorKey: 'format', header: 'Format', cell: ({ row }) => <span className="font-mono text-xs">{row.original.format}</span> },
    { accessorKey: 'counterValue', header: 'Counter', cell: ({ row }) => <span className="font-mono">{row.original.counterValue}</span> },
    { accessorKey: 'isActive', header: 'Status', cell: ({ row }) => <Badge variant={statusToVariant(row.original.isActive)}>{row.original.isActive ? 'Active' : 'Inactive'}</Badge> },
    { accessorKey: 'branchId', header: 'Scope', cell: ({ row }) => row.original.branchId ? 'Branch-scoped' : <span className="text-muted-foreground">Tenant-wide</span> },
  ];

  const featureColumns: ColumnDef<any, any>[] = [
    { accessorKey: 'flagKey', header: 'Feature', cell: ({ row }) => <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><Wrench className="h-4 w-4 text-primary" /></span><div><p className="font-medium">{row.original.flagKey}</p><p className="text-xs text-muted-foreground">{row.original.rolloutPercentage ?? 100}% rollout</p></div></div> },
    { accessorKey: 'enabled', header: 'Status', cell: ({ row }) => (
      <button
        className="focus:outline-none"
        onClick={() => toggleFeatureFlag.mutate({ id: row.original.id, enabled: !row.original.enabled })}
        title="Toggle"
      >
        <Badge variant={statusToVariant(row.original.enabled)}>{row.original.enabled ? 'Enabled' : 'Disabled'}</Badge>
      </button>
    ) },
    { accessorKey: 'branchId', header: 'Scope', cell: ({ row }) => row.original.branchId ? <Badge variant="info">Branch</Badge> : <Badge variant="neutral">Tenant</Badge> },
  ];

  const auditColumns: ColumnDef<any, any>[] = [
    { accessorKey: 'entityType', header: 'Entity', cell: ({ row }) => <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">{row.original.entityType}</span> },
    { accessorKey: 'entityId', header: 'Entity ID', cell: ({ row }) => <span className="font-mono text-xs">{row.original.entityId}</span> },
    { accessorKey: 'action', header: 'Action', cell: ({ row }) => <Badge variant={statusToVariant(row.original.action)}>{row.original.action}</Badge> },
    { accessorKey: 'actorUserId', header: 'Actor', cell: ({ row }) => <span className="font-mono text-xs">{row.original.actorUserId || 'System'}</span> },
    { accessorKey: 'occurredAt', header: 'Timestamp', cell: ({ row }) => new Date(row.original.occurredAt).toLocaleString() },
  ];

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Config Engine</h1>
            <p className="text-muted-foreground">Manage lookup lists, custom fields, numbering schemes, and feature flags</p>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedTenantId ?? ''} onValueChange={(v) => setSelectedTenantId(v)}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Select a tenant…" /></SelectTrigger>
              <SelectContent>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!selectedTenantId ? (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            Select a tenant to manage its configuration.
          </div>
        ) : (

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="lookups"><List className="h-4 w-4 mr-2" />Lookup Lists</TabsTrigger>
            <TabsTrigger value="custom-fields"><FileText className="h-4 w-4 mr-2" />Custom Fields</TabsTrigger>
            <TabsTrigger value="numbering"><Hash className="h-4 w-4 mr-2" />Numbering Schemes</TabsTrigger>
            <TabsTrigger value="features"><Wrench className="h-4 w-4 mr-2" />Feature Flags</TabsTrigger>
            <TabsTrigger value="audit"><BarChart3 className="h-4 w-4 mr-2" />Audit Log</TabsTrigger>
          </TabsList>

          {/* Lookup Lists Tab */}
          <TabsContent value="lookups" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Lookup Lists</h2>
                <p className="text-sm text-muted-foreground">Configurable reference data lists used across the platform</p>
              </div>
              <Dialog open={newLookup !== null} onOpenChange={(open) => setNewLookup(open ? { name: '', entityType: '' } : null)}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" />New List</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New Lookup List</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Name</Label><Input value={newLookup?.name ?? ''} onChange={(e) => setNewLookup({ ...(newLookup ?? { name: '', entityType: '' }), name: e.target.value })} /></div>
                    <div><Label>Entity type</Label><Input value={newLookup?.entityType ?? ''} onChange={(e) => setNewLookup({ ...(newLookup ?? { name: '', entityType: '' }), entityType: e.target.value })} placeholder="snake_case, e.g. scholarship_type" /></div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setNewLookup(null)}>Cancel</Button>
                    <Button
                      disabled={!newLookup?.name || !newLookup?.entityType || createLookupList.isPending}
                      onClick={() => createLookupList.mutate({
                        name: newLookup!.name,
                        entityType: newLookup!.entityType,
                      })}
                    >Create</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <DataTable columns={lookupColumns as any} data={filteredLookups} emptyMessage={lookupsLoading ? 'Loading…' : 'No lookup lists configured'} />
          </TabsContent>

          {/* Custom Fields Tab */}
          <TabsContent value="custom-fields" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Custom Fields</h2>
                <p className="text-sm text-muted-foreground">EAV fields attached to Student, Employee, Enrollment, or Invoice entities</p>
              </div>
              <Dialog open={newField !== null} onOpenChange={(open) => setNewField(open ? { entityType: 'student', fieldKey: '', label: '', fieldType: 'text', required: false } : null)}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" />New Field</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New Custom Field</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Entity</Label>
                      <Select value={newField?.entityType ?? 'student'} onValueChange={(v) => setNewField({ ...(newField ?? { entityType: 'student', fieldKey: '', label: '', fieldType: 'text', required: false }), entityType: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="enrollment">Enrollment</SelectItem>
                          <SelectItem value="invoice">Invoice</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Field key</Label><Input value={newField?.fieldKey ?? ''} onChange={(e) => setNewField({ ...(newField ?? { entityType: 'student', fieldKey: '', label: '', fieldType: 'text', required: false }), fieldKey: e.target.value })} placeholder="snake_case" /></div>
                    <div><Label>Label</Label><Input value={newField?.label ?? ''} onChange={(e) => setNewField({ ...(newField ?? { entityType: 'student', fieldKey: '', label: '', fieldType: 'text', required: false }), label: e.target.value })} /></div>
                    <div>
                      <Label>Type</Label>
                      <Select value={newField?.fieldType ?? 'text'} onValueChange={(v) => setNewField({ ...(newField ?? { entityType: 'student', fieldKey: '', label: '', fieldType: 'text', required: false }), fieldType: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="select">Select</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={newField?.required ?? false} onChange={(e) => setNewField({ ...(newField ?? { entityType: 'student', fieldKey: '', label: '', fieldType: 'text', required: false }), required: e.target.checked })} />
                      Required
                    </label>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setNewField(null)}>Cancel</Button>
                    <Button
                      disabled={!newField?.fieldKey || !newField?.label || createCustomField.isPending}
                      onClick={() => createCustomField.mutate({
                        entityType: newField!.entityType,
                        fieldKey: newField!.fieldKey,
                        label: newField!.label,
                        fieldType: newField!.fieldType,
                        required: newField!.required,
                      })}
                    >Create</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <DataTable columns={customFieldColumns as any} data={filteredFields} emptyMessage={fieldsLoading ? 'Loading…' : 'No custom fields configured'} />
          </TabsContent>

          {/* Numbering Schemes Tab */}
          <TabsContent value="numbering" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Numbering Schemes</h2>
                <p className="text-sm text-muted-foreground">Auto-number formats for student numbers, OR/SI series, document references</p>
              </div>
              <Dialog open={newScheme !== null} onOpenChange={(open) => setNewScheme(open ? { name: '', entityType: '', format: '' } : null)}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" />New Scheme</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New Numbering Scheme</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Name</Label><Input value={newScheme?.name ?? ''} onChange={(e) => setNewScheme({ ...(newScheme ?? { name: '', entityType: '', format: '' }), name: e.target.value })} placeholder="e.g. Official Receipt Series" /></div>
                    <div><Label>Entity type</Label><Input value={newScheme?.entityType ?? ''} onChange={(e) => setNewScheme({ ...(newScheme ?? { name: '', entityType: '', format: '' }), entityType: e.target.value })} placeholder="e.g. official_receipt" /></div>
                    <div><Label>Format</Label><Input value={newScheme?.format ?? ''} onChange={(e) => setNewScheme({ ...(newScheme ?? { name: '', entityType: '', format: '' }), format: e.target.value })} placeholder="e.g. OR-{SEQ:7}" /></div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setNewScheme(null)}>Cancel</Button>
                    <Button
                      disabled={!newScheme?.name || !newScheme?.entityType || !newScheme?.format || createNumberingScheme.isPending}
                      onClick={() => createNumberingScheme.mutate({
                        name: newScheme!.name,
                        entityType: newScheme!.entityType,
                        format: newScheme!.format,
                      })}
                    >Create</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <DataTable columns={numberingColumns as any} data={numberingSchemes} emptyMessage={numberingLoading ? 'Loading…' : 'No numbering schemes configured'} />
          </TabsContent>

          {/* Feature Flags Tab */}
          <TabsContent value="features" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Feature Flags</h2>
                <p className="text-sm text-muted-foreground">Per-tenant/branch feature toggles for gradual rollouts</p>
              </div>
              <Dialog open={newFlag !== null} onOpenChange={(open) => setNewFlag(open ? { flagKey: '' } : null)}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" />New Flag</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New Feature Flag</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Flag key</Label><Input value={newFlag?.flagKey ?? ''} onChange={(e) => setNewFlag({ ...(newFlag ?? { flagKey: '' }), flagKey: e.target.value })} placeholder="snake_case, e.g. offline_pos" /></div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setNewFlag(null)}>Cancel</Button>
                    <Button
                      disabled={!newFlag?.flagKey || createFeatureFlag.isPending}
                      onClick={() => createFeatureFlag.mutate({
                        flagKey: newFlag!.flagKey,
                        enabled: false,
                      })}
                    >Create</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <DataTable columns={featureColumns as any} data={featureFlags} emptyMessage={flagsLoading ? 'Loading…' : 'No feature flags configured'} />
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Audit Log</h2>
                <p className="text-sm text-muted-foreground">Configuration changes audit trail</p>
              </div>
              <Input placeholder="Filter by entity…" className="w-64" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <DataTable columns={auditColumns as any} data={auditEvents} emptyMessage={auditLoading ? 'Loading…' : 'No audit events recorded'} />
          </TabsContent>
        </Tabs>
        )}

      </div>
    </>
  );
}