'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { DataTable } from '@sms/ui';
import { ColumnDef } from '@tanstack/react-table';
import { useToast, useConfirm, Badge, statusToVariant, StatusDot } from '@sms/ui';
import { Plus, Search, Settings, Key, Hash, List, FileText, BarChart3, Bell, Shield, Wrench } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@sms/ui';
import { Button } from '@sms/ui';
import { Input } from '@sms/ui';
import { Label } from '@sms/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sms/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sms/ui';

interface LookupList {
  id: string;
  name: string;
  code: string;
  description?: string;
  tenantId: string;
  itemCount: number;
  createdAt: string;
}

interface LookupItem {
  id: string;
  listId: string;
  value: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
}

interface CustomField {
  id: string;
  entityType: string;
  fieldName: string;
  label: string;
  fieldType: string;
  isRequired: boolean;
  options?: Record<string, unknown>;
  validationRules?: Record<string, unknown>;
  tenantId: string;
  createdAt: string;
}

interface NumberingScheme {
  id: string;
  entityName: string;
  prefix: string;
  currentSequence: number;
  padding: number;
  tenantId: string;
  branchId?: string;
}

interface FeatureFlag {
  id: string;
  flagKey: string;
  name: string;
  isEnabled: boolean;
  config?: Record<string, unknown>;
  tenantId: string;
  branchId?: string;
}

interface AuditEvent {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorUserId?: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  occurredAt: string;
}

export default function ConfigPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('lookups');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for demonstration - would be replaced with actual API calls
  const mockLookupLists: LookupList[] = [
    { id: '1', name: 'Room Types', code: 'room_types', description: 'Types of rooms in facilities', tenantId: 'tenant-1', itemCount: 9, createdAt: '2024-01-15' },
    { id: '2', name: 'Document Types', code: 'document_types', description: 'Types of documents', tenantId: 'tenant-1', itemCount: 7, createdAt: '2024-01-15' },
    { id: '3', name: 'Relationship Types', code: 'relationship_types', description: 'Guardian-student relationships', tenantId: 'tenant-1', itemCount: 12, createdAt: '2024-01-15' },
    { id: '4', name: 'Fee Types', code: 'fee_types', description: 'Types of fees', tenantId: 'tenant-1', itemCount: 15, createdAt: '2024-01-16' },
    { id: '5', name: 'Discount Types', code: 'discount_types', description: 'Types of discounts/scholarships', tenantId: 'tenant-1', itemCount: 8, createdAt: '2024-01-16' },
    { id: '6', name: 'Hold Types', code: 'hold_types', description: 'Enrollment hold types', tenantId: 'tenant-1', itemCount: 5, createdAt: '2024-01-17' },
    { id: '7', name: 'Payment Methods', code: 'payment_methods', description: 'Accepted payment methods', tenantId: 'tenant-1', itemCount: 7, createdAt: '2024-01-17' },
    { id: '8', name: 'Asset Types', code: 'asset_types', description: 'Room asset types', tenantId: 'tenant-1', itemCount: 6, createdAt: '2024-01-18' },
    { id: '9', name: 'Employment Status', code: 'employment_status', description: 'Employee employment statuses', tenantId: 'tenant-1', itemCount: 5, createdAt: '2024-01-18' },
    { id: '10', name: 'Incident Types', code: 'incident_types', description: 'Behavior incident types', tenantId: 'tenant-1', itemCount: 8, createdAt: '2024-01-18' },
  ];

  const mockCustomFields: CustomField[] = [
    { id: '1', entityType: 'student', fieldName: 'ethnicity', label: 'Ethnicity', fieldType: 'select', isRequired: false, options: { options: ['Filipino', 'Chinese', 'American', 'Other'] }, tenantId: 'tenant-1', createdAt: '2024-02-01' },
    { id: '2', entityType: 'employee', fieldName: 'licenseNumber', label: 'Professional License #', fieldType: 'text', isRequired: false, tenantId: 'tenant-1', createdAt: '2024-02-02' },
    { id: '3', entityType: 'enrollment', fieldName: 'shsStrand', label: 'SHS Strand', fieldType: 'select', isRequired: true, options: { options: ['STEM', 'ABM', 'HUMSS', 'GAS', 'TVL'] }, tenantId: 'tenant-1', createdAt: '2024-02-03' },
    { id: '4', entityType: 'invoice', fieldName: 'purchaseOrder', label: 'Purchase Order #', fieldType: 'text', isRequired: false, tenantId: 'tenant-1', createdAt: '2024-02-04' },
  ];

  const mockNumberingSchemes: NumberingScheme[] = [
    { id: '1', entityName: 'student', prefix: 'STU', currentSequence: 1247, padding: 6, tenantId: 'tenant-1', branchId: undefined },
    { id: '2', entityName: 'invoice', prefix: 'INV', currentSequence: 342, padding: 6, tenantId: 'tenant-1', branchId: undefined },
    { id: '3', entityName: 'official_receipt', prefix: 'OR', currentSequence: 89, padding: 7, tenantId: 'tenant-1', branchId: 'branch-1' },
  ];

  const mockFeatureFlags: FeatureFlag[] = [
    { id: '1', flagKey: 'college_module', name: 'College Module', isEnabled: true, config: { maxPrograms: 20 }, tenantId: 'tenant-1', branchId: undefined },
    { id: '2', flagKey: 'offline_pos', name: 'Offline POS', isEnabled: false, config: { blockSize: 50 }, tenantId: 'tenant-1', branchId: undefined },
    { id: '3', flagKey: 'reporting_advanced', name: 'Advanced Reporting', isEnabled: true, config: {}, tenantId: 'tenant-1', branchId: undefined },
    { id: '4', flagKey: 'guardian_portal', name: 'Guardian Portal', isEnabled: true, config: { allowRegistration: true }, tenantId: 'tenant-1', branchId: undefined },
    { id: '5', flagKey: 'mobile_app', name: 'Mobile App Access', isEnabled: false, config: {}, tenantId: 'tenant-1', branchId: undefined },
  ];

  const mockAuditEvents: AuditEvent[] = [
    { id: '1', entityType: 'lookup_list', entityId: '1', action: 'create', actorUserId: 'user-1', afterState: { name: 'Room Types', code: 'room_types' }, occurredAt: '2024-01-15T10:30:00Z' },
    { id: '2', entityType: 'custom_field', entityId: '3', action: 'update', actorUserId: 'user-2', beforeState: { fieldName: 'shsStrand' }, afterState: { fieldName: 'shsStrand', isRequired: true }, occurredAt: '2024-02-03T14:22:00Z' },
    { id: '3', entityType: 'feature_flag', entityId: '2', action: 'update', actorUserId: 'user-1', beforeState: { isEnabled: false }, afterState: { isEnabled: true }, occurredAt: '2024-02-10T09:15:00Z' },
    { id: '4', entityType: 'numbering_scheme', entityId: '3', action: 'create', actorUserId: 'user-3', afterState: { entityName: 'official_receipt', prefix: 'OR' }, occurredAt: '2024-02-15T11:00:00Z' },
    { id: '5', entityType: 'lookup_item', entityId: 'item-5', action: 'delete', actorUserId: 'user-1', beforeState: { value: 'old_value' }, occurredAt: '2024-02-20T16:45:00Z' },
  ];

  const lookupColumns: ColumnDef<any, any>[] = [
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><List className="h-4 w-4 text-primary" /></span><div><p className="font-medium">{row.original.name}</p><p className="text-xs text-muted-foreground">{row.original.code}</p></div></div> },
    { accessorKey: 'description', header: 'Description' },
    { accessorKey: 'itemCount', header: 'Items', cell: ({ row }) => <span className="font-medium">{row.original.itemCount}</span> },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString() },
  ];

  const customFieldColumns: ColumnDef<any, any>[] = [
    { accessorKey: 'label', header: 'Label', cell: ({ row }) => <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><FileText className="h-4 w-4 text-primary" /></span><div><p className="font-medium">{row.original.label}</p><p className="text-xs text-muted-foreground">{row.original.fieldName}</p></div></div> },
    { accessorKey: 'entityType', header: 'Entity', cell: ({ row }) => <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">{row.original.entityType}</span> },
    { accessorKey: 'fieldType', header: 'Type', cell: ({ row }) => <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">{row.original.fieldType}</span> },
    { accessorKey: 'isRequired', header: 'Required', cell: ({ row }) => row.original.isRequired ? <span className="text-green-600">Yes</span> : <span className="text-muted-foreground">No</span> },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString() },
  ];

  const numberingColumns: ColumnDef<any, any>[] = [
    { accessorKey: 'entityName', header: 'Entity', cell: ({ row }) => <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><Hash className="h-4 w-4 text-primary" /></span><div><p className="font-medium">{row.original.entityName}</p><p className="text-xs text-muted-foreground">{row.original.prefix}{String(row.original.currentSequence).padStart(row.original.padding, '0')}</p></div></div> },
    { accessorKey: 'prefix', header: 'Prefix' },
    { accessorKey: 'currentSequence', header: 'Current #', cell: ({ row }) => <span className="font-mono">{row.original.prefix}{String(row.original.currentSequence).padStart(row.original.padding, '0')}</span> },
    { accessorKey: 'padding', header: 'Padding' },
    { accessorKey: 'branchId', header: 'Branch', cell: ({ row }) => row.original.branchId ? `Branch-scoped` : <span className="text-muted-foreground">Tenant-wide</span> },
  ];

  const featureColumns: ColumnDef<any, any>[] = [
    { accessorKey: 'name', header: 'Feature', cell: ({ row }) => <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><Wrench className="h-4 w-4 text-primary" /></span><div><p className="font-medium">{row.original.name}</p><p className="text-xs text-muted-foreground">{row.original.flagKey}</p></div></div> },
    { accessorKey: 'isEnabled', header: 'Status', cell: ({ row }) => <Badge variant={statusToVariant(row.original.isEnabled)}>{row.original.isEnabled ? 'Enabled' : 'Disabled'}</Badge> },
    { accessorKey: 'config', header: 'Config', cell: ({ row }) => <pre className="text-xs text-muted-foreground max-w-xs overflow-auto">{JSON.stringify(row.original.config || {}, null, 2)}</pre> },
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
        </div>

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
              <Button><Plus className="h-4 w-4 mr-2" />New List</Button>
            </div>
            <DataTable columns={lookupColumns as any} data={mockLookupLists} emptyMessage="No lookup lists configured" />
          </TabsContent>

          {/* Custom Fields Tab */}
          <TabsContent value="custom-fields" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Custom Fields</h2>
                <p className="text-sm text-muted-foreground">EAV fields attached to Student, Employee, Enrollment, or Invoice entities</p>
              </div>
              <Button><Plus className="h-4 w-4 mr-2" />New Field</Button>
            </div>
            <DataTable columns={customFieldColumns as any} data={mockCustomFields} emptyMessage="No custom fields configured" />
          </TabsContent>

          {/* Numbering Schemes Tab */}
          <TabsContent value="numbering" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Numbering Schemes</h2>
                <p className="text-sm text-muted-foreground">Auto-number formats for student numbers, OR/SI series, document references</p>
              </div>
              <Button><Plus className="h-4 w-4 mr-2" />New Scheme</Button>
            </div>
            <DataTable columns={numberingColumns as any} data={mockNumberingSchemes} emptyMessage="No numbering schemes configured" />
          </TabsContent>

          {/* Feature Flags Tab */}
          <TabsContent value="features" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Feature Flags</h2>
                <p className="text-sm text-muted-foreground">Per-tenant/branch feature toggles for gradual rollouts</p>
              </div>
              <Button><Plus className="h-4 w-4 mr-2" />New Flag</Button>
            </div>
            <DataTable columns={featureColumns as any} data={mockFeatureFlags} emptyMessage="No feature flags configured" />
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Audit Log</h2>
                <p className="text-sm text-muted-foreground">Configuration changes audit trail</p>
              </div>
              <div className="flex gap-2">
                <Input placeholder="Search..." className="w-64" />
                <Select>
                  <SelectTrigger className="w-40"><SelectValue placeholder="All Actions" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="create">Create</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger className="w-40"><SelectValue placeholder="All Entities" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="lookup_list">Lookup List</SelectItem>
                    <SelectItem value="custom_field">Custom Field</SelectItem>
                    <SelectItem value="feature_flag">Feature Flag</SelectItem>
                    <SelectItem value="numbering_scheme">Numbering Scheme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-lg border bg-card shadow-sm">
              <div className="p-4 border-b">
                <div className="flex items-center gap-2">
                  <Input placeholder="Search audit events..." className="w-64" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium">Entity</th>
                      <th className="px-3 py-2 text-left font-medium">ID</th>
                      <th className="px-3 py-2 text-left font-medium">Action</th>
                      <th className="px-3 py-2 text-left font-medium">Actor</th>
                      <th className="px-3 py-2 text-left font-medium">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockAuditEvents.map((event) => (
                      <tr key={event.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="px-3 py-2"><span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">{event.entityType}</span></td>
                        <td className="px-3 py-2 font-mono text-xs">{event.entityId}</td>
                        <td className="px-3 py-2"><Badge variant={statusToVariant(event.action)}>{event.action}</Badge></td>
                        <td className="px-3 py-2 font-mono text-xs">{event.actorUserId || 'System'}</td>
                        <td className="px-3 py-2">{new Date(event.occurredAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

      </div>
    </>
  );
}