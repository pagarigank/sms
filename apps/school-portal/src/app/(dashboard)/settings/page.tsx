'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import {
  Badge,
  Button,
  DataTable,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusDot,
  statusToVariant,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useConfirm,
  useToast,
} from '@sms/ui';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, ListTree, Braces, Hash, Flag, ScrollText } from 'lucide-react';

/**
 * FR-CFG-2/3/5/7/8 — tenant configuration manager (the school-portal half of
 * the Config Engine; platform-admin's /config is the cross-tenant view).
 * Lookup lists, custom-field definitions, numbering schemes, feature flags
 * and the config audit log, all against the tenant in the header.
 */

const CUSTOM_FIELD_ENTITIES = ['student', 'employee', 'applicant', 'guardian', 'enrollment', 'invoice'];

interface LookupList {
  id: string;
  name: string;
  entityType: string;
  isActive: boolean;
  createdAt?: string;
}
interface LookupItem {
  id: string;
  lookupListId: string;
  value: string;
  label: string;
  sortOrder?: number;
  isActive: boolean;
}
interface CustomField {
  id: string;
  entityType: string;
  fieldKey: string;
  fieldType: string;
  label: string;
  required: boolean;
}
interface NumberingScheme {
  id: string;
  name: string;
  entityType: string;
  format: string;
  counterValue: number;
  isActive: boolean;
}
interface FeatureFlag {
  id: string;
  flagKey: string;
  enabled: boolean;
  rolloutPercentage: number;
}
interface AuditEvent {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorUserId?: string;
  occurredAt: string;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { currentTenantId } = useTenantStore();

  // === Data ===
  const { data: listsRes, isLoading: listsLoading } = useQuery({
    queryKey: ['cfg-lookup-lists', currentTenantId],
    queryFn: () => apiClient.config.listLookupLists({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });
  const lookupLists: LookupList[] = listsRes?.data ?? [];

  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const { data: itemsRes } = useQuery({
    queryKey: ['cfg-lookup-items', selectedListId],
    queryFn: () => apiClient.config.listLookupItems({ listId: selectedListId! }),
    enabled: !!selectedListId,
  });
  const lookupItems: LookupItem[] = itemsRes?.data ?? [];

  const { data: fieldsRes, isLoading: fieldsLoading } = useQuery({
    queryKey: ['cfg-custom-fields', currentTenantId],
    queryFn: () => apiClient.config.listCustomFields({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });
  const customFields: CustomField[] = fieldsRes?.data ?? [];

  const { data: schemesRes, isLoading: schemesLoading } = useQuery({
    queryKey: ['cfg-numbering', currentTenantId],
    queryFn: () => apiClient.config.listNumberingSchemes({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });
  const schemes: NumberingScheme[] = schemesRes?.data ?? [];

  const { data: flagsRes, isLoading: flagsLoading } = useQuery({
    queryKey: ['cfg-flags', currentTenantId],
    queryFn: () => apiClient.config.listFeatureFlags({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });
  const flags: FeatureFlag[] = flagsRes?.data ?? [];

  const { data: auditRes, isLoading: auditLoading } = useQuery({
    queryKey: ['cfg-audit', currentTenantId],
    queryFn: () => apiClient.config.listAuditEvents({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });
  const auditEvents: AuditEvent[] = auditRes?.data ?? [];

  // === Mutations ===
  const invalidate = (key: string) => queryClient.invalidateQueries({ queryKey: [key] });

  const [newList, setNewList] = useState<{ name: string; entityType: string } | null>(null);
  const createList = useMutation({
    mutationFn: (data: { name: string; entityType: string }) =>
      apiClient.config.createLookupList(data),
    onSuccess: () => {
      invalidate('cfg-lookup-lists');
      setNewList(null);
      toast({ title: 'Lookup list created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const [newItem, setNewItem] = useState<{ value: string; label: string; sortOrder: string } | null>(null);
  const createItem = useMutation({
    mutationFn: (data: { value: string; label: string; sortOrder: number }) =>
      apiClient.config.createLookupItem({ ...data, lookupListId: selectedListId! }),
    onSuccess: () => {
      invalidate('cfg-lookup-items');
      setNewItem(null);
      toast({ title: 'Lookup item added' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteList = useMutation({
    mutationFn: (id: string) => apiClient.config.deleteLookupList(id),
    onSuccess: () => {
      invalidate('cfg-lookup-lists');
      setSelectedListId(null);
      toast({ title: 'Lookup list deleted' });
    },
    onError: (e: Error) => toast({ title: 'Cannot delete', description: e.message, variant: 'destructive' }),
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => apiClient.config.deleteLookupItem(id),
    onSuccess: () => invalidate('cfg-lookup-items'),
    onError: (e: Error) => toast({ title: 'Cannot delete', description: e.message, variant: 'destructive' }),
  });

  const [newField, setNewField] = useState<{
    entityType: string; fieldKey: string; fieldType: string; label: string; required: boolean;
  } | null>(null);
  const createField = useMutation({
    mutationFn: (data: typeof newField) => apiClient.config.createCustomField(data!),
    onSuccess: () => {
      invalidate('cfg-custom-fields');
      setNewField(null);
      toast({ title: 'Custom field created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteField = useMutation({
    mutationFn: (id: string) => apiClient.config.deleteCustomField(id),
    onSuccess: () => invalidate('cfg-custom-fields'),
    onError: (e: Error) => toast({ title: 'Cannot delete', description: e.message, variant: 'destructive' }),
  });

  const [newScheme, setNewScheme] = useState<{ name: string; entityType: string; format: string } | null>(null);
  const createScheme = useMutation({
    mutationFn: (data: typeof newScheme) => apiClient.config.createNumberingScheme(data!),
    onSuccess: () => {
      invalidate('cfg-numbering');
      setNewScheme(null);
      toast({ title: 'Numbering scheme created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateScheme = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NumberingScheme> }) =>
      apiClient.config.updateNumberingScheme(id, data),
    onSuccess: () => {
      invalidate('cfg-numbering');
      setEditScheme(null);
      toast({ title: 'Numbering scheme updated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Inline dialog state for editing a scheme (replaces window.prompt).
  const [editScheme, setEditScheme] = useState<NumberingScheme | null>(null);
  const [schemeForm, setSchemeForm] = useState({ name: '', format: '' });

  const openSchemeEditor = (scheme: NumberingScheme) => {
    setEditScheme(scheme);
    setSchemeForm({ name: scheme.name, format: scheme.format });
  };

  const [newFlag, setNewFlag] = useState<{ flagKey: string; enabled: boolean; rolloutPercentage: string } | null>(null);
  const createFlag = useMutation({
    mutationFn: (data: typeof newFlag) =>
      apiClient.config.createFeatureFlag({
        flagKey: data!.flagKey,
        enabled: data!.enabled,
        rolloutPercentage: Number(data!.rolloutPercentage || 100),
      }),
    onSuccess: () => {
      invalidate('cfg-flags');
      setNewFlag(null);
      toast({ title: 'Feature flag created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateFlag = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FeatureFlag> }) =>
      apiClient.config.updateFeatureFlag(id, data),
    onSuccess: () => invalidate('cfg-flags'),
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteFlag = useMutation({
    mutationFn: (id: string) => apiClient.config.deleteFeatureFlag(id),
    onSuccess: () => invalidate('cfg-flags'),
    onError: (e: Error) => toast({ title: 'Cannot delete', description: e.message, variant: 'destructive' }),
  });

  // === Columns ===
  const listColumns: ColumnDef<any, any>[] = [
    { accessorKey: 'name', header: 'List', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: 'entityType', header: 'Applies to' },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={statusToVariant(row.original.isActive ? 'active' : 'inactive')}>
          <StatusDot />
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => setSelectedListId(row.original.id)}>
            Items
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-[hsl(var(--status-danger-ink))] hover:text-[hsl(var(--status-danger-ink))]"
            onClick={async () => {
              const ok = await confirm({
                title: `Delete ${row.original.name}?`,
                description: 'Lists with items cannot be deleted.',
                confirmLabel: 'Delete',
                destructive: true,
              });
              if (ok) deleteList.mutate(row.original.id);
            }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const fieldColumns: ColumnDef<any, any>[] = [
    { accessorKey: 'label', header: 'Label', cell: ({ row }) => <span className="font-medium">{row.original.label}</span> },
    { accessorKey: 'fieldKey', header: 'Key' },
    { accessorKey: 'entityType', header: 'Entity' },
    { accessorKey: 'fieldType', header: 'Type' },
    { accessorKey: 'required', header: 'Required', cell: ({ row }) => (row.original.required ? 'Yes' : 'No') },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-[hsl(var(--status-danger-ink))] hover:text-[hsl(var(--status-danger-ink))]"
          onClick={async () => {
            const ok = await confirm({
              title: `Delete ${row.original.label}?`,
              description: 'Existing stored values are not removed.',
              confirmLabel: 'Delete',
              destructive: true,
            });
            if (ok) deleteField.mutate(row.original.id);
          }}
        >
          Delete
        </Button>
      ),
    },
  ];

  const schemeColumns: ColumnDef<any, any>[] = [
    { accessorKey: 'name', header: 'Scheme', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: 'entityType', header: 'Entity' },
    { accessorKey: 'format', header: 'Format', cell: ({ row }) => <code className="text-xs">{row.original.format}</code> },
    { accessorKey: 'counterValue', header: 'Counter' },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => openSchemeEditor(row.original as NumberingScheme)}
        >
          Edit
        </Button>
      ),
    },
  ];

  const flagColumns: ColumnDef<any, any>[] = [
    { accessorKey: 'flagKey', header: 'Flag', cell: ({ row }) => <code className="text-xs font-medium">{row.original.flagKey}</code> },
    {
      accessorKey: 'enabled',
      header: 'State',
      cell: ({ row }) => (
        <Badge variant={statusToVariant(row.original.enabled ? 'active' : 'inactive')}>
          <StatusDot />
          {row.original.enabled ? 'On' : 'Off'}
        </Badge>
      ),
    },
    { accessorKey: 'rolloutPercentage', header: 'Rollout', cell: ({ row }) => `${row.original.rolloutPercentage}%` },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateFlag.mutate({ id: row.original.id, data: { enabled: !row.original.enabled } })}
          >
            {row.original.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-[hsl(var(--status-danger-ink))] hover:text-[hsl(var(--status-danger-ink))]"
            onClick={async () => {
              const ok = await confirm({
                title: `Delete flag ${row.original.flagKey}?`,
                description: 'Consumers will treat the flag as disabled.',
                confirmLabel: 'Delete',
                destructive: true,
              });
              if (ok) deleteFlag.mutate(row.original.id);
            }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const auditColumns: ColumnDef<any, any>[] = [
    { accessorKey: 'occurredAt', header: 'When', cell: ({ row }) => new Date(row.original.occurredAt).toLocaleString() },
    { accessorKey: 'action', header: 'Action', cell: ({ row }) => <Badge variant="outline">{row.original.action}</Badge> },
    { accessorKey: 'entityType', header: 'Entity' },
    { accessorKey: 'entityId', header: 'Entity ID', cell: ({ row }) => <code className="text-xs">{String(row.original.entityId).slice(0, 13)}…</code> },
    { accessorKey: 'actorUserId', header: 'Actor', cell: ({ row }) => row.original.actorUserId ? `${String(row.original.actorUserId).slice(0, 8)}…` : 'system' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Lookups, custom fields, numbering, feature flags and the config audit log" />

      <Tabs defaultValue="lookups">
        <TabsList>
          <TabsTrigger value="lookups"><ListTree className="h-4 w-4 mr-2" />Lookups</TabsTrigger>
          <TabsTrigger value="custom-fields"><Braces className="h-4 w-4 mr-2" />Custom Fields</TabsTrigger>
          <TabsTrigger value="numbering"><Hash className="h-4 w-4 mr-2" />Numbering</TabsTrigger>
          <TabsTrigger value="flags"><Flag className="h-4 w-4 mr-2" />Feature Flags</TabsTrigger>
          <TabsTrigger value="audit"><ScrollText className="h-4 w-4 mr-2" />Audit Log</TabsTrigger>
        </TabsList>

        {/* FR-CFG-2: lookup/reference-data manager */}
        <TabsContent value="lookups" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setNewList({ name: '', entityType: 'student' })}>
              <Plus className="h-4 w-4 mr-1" /> New Lookup List
            </Button>
          </div>
          <DataTable
            columns={listColumns as any}
            data={lookupLists}
            isLoading={listsLoading}
            emptyMessage="No lookup lists yet. Create one to hold configurable reference values."
          />

          {selectedListId && (
            <div className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  Items — {lookupLists.find((l) => l.id === selectedListId)?.name ?? ''}
                </h3>
                <Button size="sm" variant="outline" onClick={() => setNewItem({ value: '', label: '', sortOrder: '0' })}>
                  <Plus className="h-4 w-4 mr-1" /> Add item
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {lookupItems.length === 0 && <p className="text-sm text-muted-foreground">No items yet.</p>}
                {lookupItems.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-sm"
                  >
                    {item.label}
                    <button
                      className="text-muted-foreground hover:text-[hsl(var(--status-danger-ink))]"
                      aria-label={`Delete ${item.label}`}
                      onClick={() => deleteItem.mutate(item.id)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* FR-CFG-5: custom fields / EAV manager */}
        <TabsContent value="custom-fields" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() =>
                setNewField({ entityType: 'student', fieldKey: '', fieldType: 'text', label: '', required: false })
              }
            >
              <Plus className="h-4 w-4 mr-1" /> New Custom Field
            </Button>
          </div>
          <DataTable
            columns={fieldColumns as any}
            data={customFields}
            isLoading={fieldsLoading}
            emptyMessage="No custom fields yet. Attach extra fields to students, employees, enrollments or invoices without a schema migration."
          />
        </TabsContent>

        {/* FR-CFG-3: numbering-scheme manager */}
        <TabsContent value="numbering" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Tokens: <code className="text-xs">{'{YYYY}'}</code> <code className="text-xs">{'{SEQ}'}</code>{' '}
              <code className="text-xs">{'{SEQ:4}'}</code> — schemes auto-provision on first use; edit the format to
              take over.
            </p>
            <Button onClick={() => setNewScheme({ name: '', entityType: '', format: '{YYYY}-{SEQ:4}' })}>
              <Plus className="h-4 w-4 mr-1" /> New Scheme
            </Button>
          </div>
          <DataTable
            columns={schemeColumns as any}
            data={schemes}
            isLoading={schemesLoading}
            emptyMessage="No numbering schemes yet — invoice and student numbers auto-provision defaults on first use."
          />
        </TabsContent>

        {/* FR-CFG-8: feature flags */}
        <TabsContent value="flags" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setNewFlag({ flagKey: '', enabled: true, rolloutPercentage: '100' })}>
              <Plus className="h-4 w-4 mr-1" /> New Flag
            </Button>
          </div>
          <DataTable
            columns={flagColumns as any}
            data={flags}
            isLoading={flagsLoading}
            emptyMessage="No feature flags yet. Example: notifications.sms gates SMS dispatch."
          />
        </TabsContent>

        {/* FR-CFG-7: config audit log */}
        <TabsContent value="audit" className="space-y-4">
          <DataTable
            columns={auditColumns as any}
            data={auditEvents}
            isLoading={auditLoading}
            emptyMessage="No config changes recorded yet — lookups, custom fields, numbering, flags and workflow edits are audited here with before/after values."
          />
        </TabsContent>
      </Tabs>

      {/* Create lookup list */}
      <Dialog open={!!newList} onOpenChange={(open) => !open && setNewList(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Lookup List</DialogTitle></DialogHeader>
          <div className="mt-2 space-y-3">
            <div>
              <Label>Name</Label>
              <Input
                value={newList?.name ?? ''}
                onChange={(e) => setNewList({ ...newList!, name: e.target.value })}
                placeholder="e.g. uniform_sizes"
              />
            </div>
            <div>
              <Label>Applies to</Label>
              <Select value={newList?.entityType} onValueChange={(v) => setNewList({ ...newList!, entityType: v })}>
                <SelectTrigger><SelectValue placeholder="Entity" /></SelectTrigger>
                <SelectContent>
                  {CUSTOM_FIELD_ENTITIES.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewList(null)}>Cancel</Button>
              <Button disabled={!newList?.name || createList.isPending} onClick={() => createList.mutate(newList!)}>
                Create
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add lookup item */}
      <Dialog open={!!newItem} onOpenChange={(open) => !open && setNewItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Lookup Item</DialogTitle></DialogHeader>
          <div className="mt-2 space-y-3">
            <div>
              <Label>Value</Label>
              <Input value={newItem?.value ?? ''} onChange={(e) => setNewItem({ ...newItem!, value: e.target.value })} />
            </div>
            <div>
              <Label>Label</Label>
              <Input value={newItem?.label ?? ''} onChange={(e) => setNewItem({ ...newItem!, label: e.target.value })} />
            </div>
            <div>
              <Label>Sort order</Label>
              <Input
                type="number"
                value={newItem?.sortOrder ?? '0'}
                onChange={(e) => setNewItem({ ...newItem!, sortOrder: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewItem(null)}>Cancel</Button>
              <Button
                disabled={!newItem?.value || !newItem?.label || createItem.isPending}
                onClick={() => createItem.mutate({ value: newItem!.value, label: newItem!.label, sortOrder: Number(newItem!.sortOrder || 0) })}
              >
                Add
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* New custom field */}
      <Dialog open={!!newField} onOpenChange={(open) => !open && setNewField(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Custom Field</DialogTitle></DialogHeader>
          <div className="mt-2 space-y-3">
            <div>
              <Label>Applies to</Label>
              <Select value={newField?.entityType} onValueChange={(v) => setNewField({ ...newField!, entityType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CUSTOM_FIELD_ENTITIES.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Field key</Label>
              <Input
                value={newField?.fieldKey ?? ''}
                onChange={(e) => setNewField({ ...newField!, fieldKey: e.target.value })}
                placeholder="e.g. prev_school_address"
              />
            </div>
            <div>
              <Label>Label</Label>
              <Input value={newField?.label ?? ''} onChange={(e) => setNewField({ ...newField!, label: e.target.value })} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={newField?.fieldType} onValueChange={(v) => setNewField({ ...newField!, fieldType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['text', 'number', 'date', 'boolean', 'select'].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newField?.required ?? false}
                onChange={(e) => setNewField({ ...newField!, required: e.target.checked })}
              />
              Required
            </label>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewField(null)}>Cancel</Button>
              <Button
                disabled={!newField?.fieldKey || !newField?.label || createField.isPending}
                onClick={() => createField.mutate(newField!)}
              >
                Create
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* New numbering scheme */}
      <Dialog open={!!newScheme} onOpenChange={(open) => !open && setNewScheme(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Numbering Scheme</DialogTitle></DialogHeader>
          <div className="mt-2 space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={newScheme?.name ?? ''} onChange={(e) => setNewScheme({ ...newScheme!, name: e.target.value })} />
            </div>
            <div>
              <Label>Entity type</Label>
              <Input
                value={newScheme?.entityType ?? ''}
                onChange={(e) => setNewScheme({ ...newScheme!, entityType: e.target.value })}
                placeholder="e.g. document_ref, employee_id"
              />
            </div>
            <div>
              <Label>Format</Label>
              <Input
                value={newScheme?.format ?? ''}
                onChange={(e) => setNewScheme({ ...newScheme!, format: e.target.value })}
                placeholder="{YYYY}-{SEQ:4}"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewScheme(null)}>Cancel</Button>
              <Button
                disabled={!newScheme?.name || !newScheme?.entityType || createScheme.isPending}
                onClick={() => createScheme.mutate(newScheme!)}
              >
                Create
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit numbering scheme */}
      <Dialog open={!!editScheme} onOpenChange={(open) => !open && setEditScheme(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Numbering Scheme — {editScheme?.name}</DialogTitle></DialogHeader>
          <div className="mt-2 space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={schemeForm.name} onChange={(e) => setSchemeForm({ ...schemeForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Format</Label>
              <Input
                value={schemeForm.format}
                onChange={(e) => setSchemeForm({ ...schemeForm, format: e.target.value })}
                placeholder="{YYYY}-{SEQ:4}"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Tokens: {'{YYYY}'} {'{YY}'} {'{MM}'} {'{SEQ}'} {'{SEQ:n}'}. The counter is not reset by an
                edit — changing the format only affects future numbers.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditScheme(null)}>Cancel</Button>
              <Button
                disabled={!schemeForm.name || !schemeForm.format || updateScheme.isPending}
                onClick={() => editScheme && updateScheme.mutate({ id: editScheme.id, data: schemeForm })}
              >
                {updateScheme.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* New feature flag */}
      <Dialog open={!!newFlag} onOpenChange={(open) => !open && setNewFlag(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Feature Flag</DialogTitle></DialogHeader>
          <div className="mt-2 space-y-3">
            <div>
              <Label>Flag key</Label>
              <Input
                value={newFlag?.flagKey ?? ''}
                onChange={(e) => setNewFlag({ ...newFlag!, flagKey: e.target.value })}
                placeholder="e.g. notifications.sms"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newFlag?.enabled ?? true}
                onChange={(e) => setNewFlag({ ...newFlag!, enabled: e.target.checked })}
              />
              Enabled
            </label>
            <div>
              <Label>Rollout %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={newFlag?.rolloutPercentage ?? '100'}
                onChange={(e) => setNewFlag({ ...newFlag!, rolloutPercentage: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewFlag(null)}>Cancel</Button>
              <Button
                disabled={!newFlag?.flagKey || createFlag.isPending}
                onClick={() => createFlag.mutate(newFlag!)}
              >
                Create
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
