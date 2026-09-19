'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { Plus, Layers, ChevronRight, ChevronLeft, Loader2, AlertTriangle } from 'lucide-react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  PageHeader,
  statusToVariant,
  StatusDot,
  useConfirm,
  useToast,
} from '@sms/ui';

/** Backend endpoints may return a bare array, an ApiResponse wrapper, or a paginated envelope. */
function listOf<T>(res: unknown): T[] {
  if (res == null) return [];
  if (Array.isArray(res)) return res as T[];
  const r = res as any;
  if (Array.isArray(r.data)) return r.data as T[];
  if (Array.isArray(r.data?.data)) return r.data.data as T[];
  return [];
}

interface FeeStructure {
  id: string;
  name?: string;
  templateKey?: string;
  schoolYearId: string;
  educationLevelId?: string;
  gradeLevelId?: string;
  strandId?: string;
  programId?: string;
  branchId?: string;
  status: string;
}

interface FeeStructureItem {
  id: string;
  feeTypeId: string;
  amount: string;
  description?: string;
  isRequired: boolean;
  isPerUnit: boolean;
  sortOrder: number;
}

interface FeeType {
  id: string;
  name: string;
  code: string;
}

export default function FeeStructuresPage() {
  const { currentTenantId, currentBranchId } = useTenantStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', schoolYearId: '' });
  const [newItem, setNewItem] = useState({ feeTypeId: '', amount: '', description: '', isPerUnit: false });

  const { data: structures, isLoading, error } = useQuery({
    queryKey: ['fee-structures', currentTenantId, currentBranchId],
    queryFn: () =>
      apiClient.billing.getFeeStructures({
        tenantId: currentTenantId!,
        branchId: currentBranchId ?? undefined,
      }),
    enabled: !!currentTenantId,
  });

  const { data: schoolYearsRes } = useQuery({
    queryKey: ['school-years', currentTenantId],
    queryFn: () => apiClient.academic.listSchoolYears(),
    enabled: !!currentTenantId,
  });

  const { data: feeTypesRes } = useQuery({
    queryKey: ['fee-types'],
    queryFn: () => apiClient.billing.listFeeTypes({ limit: 100 }),
  });

  const { data: levelsRes } = useQuery({
    queryKey: ['education-levels'],
    queryFn: () => apiClient.academic.listEducationLevels({ limit: 100 }),
  });

  const { data: branchesRes } = useQuery({
    queryKey: ['branches'],
    queryFn: () => apiClient.branches.list({ limit: 100 }),
  });

  const schoolYears = listOf<{ id: string; name: string }>(schoolYearsRes);
  const feeTypes = listOf<FeeType>(feeTypesRes);
  const levels = listOf<{ id: string; name: string; code?: string }>(levelsRes);
  const branches = listOf<{ id: string; name: string }>(branchesRes);
  const list = listOf<FeeStructure>(structures);

  const nameOf = (arr: any[], id?: string | null, fallback = '—') =>
    id ? arr.find((x) => x.id === id)?.name ?? fallback : fallback;

  // Sorted most-specific first so users see how resolution will behave
  const sorted = useMemo(
    () =>
      [...list].sort((a, b) => {
        const pins = (s: FeeStructure) =>
          [s.branchId, s.educationLevelId, s.gradeLevelId, s.strandId, s.programId].filter(Boolean).length;
        return pins(b) - pins(a);
      }),
    [list],
  );

  const selected = sorted.find((s) => s.id === selectedId) ?? null;

  const { data: itemsRes, isLoading: itemsLoading } = useQuery({
    queryKey: ['fee-structure-items', selectedId],
    queryFn: () => apiClient.billing.getFeeStructureItems(selectedId!),
    enabled: !!selectedId,
  });
  const items = listOf<FeeStructureItem>(itemsRes);

  const createMutation = useMutation({
    mutationFn: (data: { name: string; schoolYearId: string }) =>
      apiClient.billing.createFeeStructure({
        ...data,
        tenantId: currentTenantId ?? '',
        branchId: currentBranchId ?? undefined,
        templateKey: crypto.randomUUID(),
        status: 'active',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
      setShowCreate(false);
      setForm({ name: '', schoolYearId: '' });
      toast({ title: 'Fee structure created' });
    },
    onError: (error: Error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const addItemMutation = useMutation({
    mutationFn: (data: { feeTypeId: string; amount: string; description: string; isPerUnit: boolean }) =>
      apiClient.billing.addFeeStructureItem(selectedId!, {
        ...data,
        amount: parseFloat(data.amount) || 0,
        tenantId: currentTenantId!,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-structure-items'] });
      setNewItem({ feeTypeId: '', amount: '', description: '', isPerUnit: false });
      toast({ title: 'Fee item added' });
    },
    onError: (error: Error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const removeItemMutation = useMutation({
    mutationFn: (id: string) => apiClient.billing.deleteFeeStructureItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-structure-items'] });
      toast({ title: 'Fee item removed' });
    },
    onError: (error: Error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const itemsTotal = items.reduce((s, i) => s + Number(i.amount), 0);

  if (selected) {
    return (
      <>
        <div className="space-y-6">
          <div>
            <button
              onClick={() => setSelectedId(null)}
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Back to fee structures
            </button>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">{selected.name || 'Fee Structure'}</h1>
            <p className="text-sm text-muted-foreground">
              {nameOf(branches, selected.branchId, 'Tenant Default')} • {nameOf(levels, selected.educationLevelId, 'All levels')} • {selected.status}
            </p>
          </div>

          <div className="rounded-lg border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h2 className="font-semibold">Fee Items</h2>
                <p className="text-sm text-muted-foreground">
                  Total: <span className="font-semibold text-foreground">₱{itemsTotal.toLocaleString()}</span>
                </p>
              </div>
            </div>
            <div className="p-4">
              {itemsLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : items.length === 0 ? (
                <p className="py-6 text-center text-muted-foreground">
                  No fee items yet. Add one below — an invoice is generated from these items.
                </p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="pb-3 font-medium">Fee Type</th>
                      <th className="pb-3 font-medium">Description</th>
                      <th className="pb-3 font-medium">Amount</th>
                      <th className="pb-3 font-medium">Pricing Type</th>
                      <th className="pb-3 font-medium">Required</th>
                      <th className="pb-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((item) => (
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="py-3 font-medium">{nameOf(feeTypes, item.feeTypeId, item.feeTypeId.slice(0, 8))}</td>
                          <td className="py-3 text-muted-foreground">{item.description || '—'}</td>
                          <td className="py-3">₱{Number(item.amount).toLocaleString()}</td>
                          <td className="py-3">
                            {item.isPerUnit ? (
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                Per Unit
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                                Fixed
                              </span>
                            )}
                          </td>
                          <td className="py-3">{item.isRequired ? 'Yes' : 'Optional'}</td>
                          <td className="py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-[hsl(var(--status-danger-ink))] hover:text-[hsl(var(--status-danger-ink))]"
                              onClick={async () => {
                                const ok = await confirm({
                                  title: 'Remove this fee item?',
                                  confirmLabel: 'Remove',
                                  destructive: true,
                                });
                                if (ok) removeItemMutation.mutate(item.id);
                              }}
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="border-t p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_140px_1fr_auto]">
                <div>
                  <Label>Fee Type</Label>
                  <select
                    value={newItem.feeTypeId}
                    onChange={(e) => setNewItem({ ...newItem, feeTypeId: e.target.value })}
                    className="flex h-9 w-full rounded-md border px-2 py-1 text-sm"
                  >
                    <option value="">Select fee type…</option>
                    {feeTypes.map((ft) => (
                      <option key={ft.id} value={ft.id}>
                        {ft.name} ({ft.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Amount (₱)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newItem.amount}
                    onChange={(e) => setNewItem({ ...newItem, amount: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="Optional note"
                  />
                </div>
                <div className="flex items-center pt-6 px-4">
                  <input
                    type="checkbox"
                    id="isPerUnit"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={newItem.isPerUnit}
                    onChange={(e) => setNewItem({ ...newItem, isPerUnit: e.target.checked })}
                  />
                  <Label htmlFor="isPerUnit" className="ml-2 whitespace-nowrap">
                    Per Unit
                  </Label>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => addItemMutation.mutate(newItem)}
                    disabled={!newItem.feeTypeId || !newItem.amount || addItemMutation.isPending}
                  >
                    {addItemMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Fee Structures"
          description="Configure fee amounts per level, grade, and school year — the most specific structure wins"
          actions={
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Fee Structure
            </Button>
          }
        />

        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4" /> Failed to load fee structures: {(error as Error).message}
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-lg border bg-card shadow-sm">
            <div className="border-b p-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4" /> Fee Structure Resolution
              </h2>
              <p className="text-sm text-muted-foreground">
                Sorted by specificity. Fee structures are resolved per enrollment: branch → term → strand/program →
                grade level → education level → tenant default.
              </p>
            </div>
            <div className="p-4">
              {sorted.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No fee structures configured. Click &quot;Add Fee Structure&quot; to create one.
                </p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="pb-3 font-medium">Name</th>
                      <th className="pb-3 font-medium">School Year</th>
                      <th className="pb-3 font-medium">Level</th>
                      <th className="pb-3 font-medium">Branch</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((s) => (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="py-3 font-medium">{s.name || s.templateKey || '—'}</td>
                        <td className="py-3">{nameOf(schoolYears, s.schoolYearId, s.schoolYearId.slice(0, 8))}</td>
                        <td className="py-3">{nameOf(levels, s.educationLevelId, 'All')}</td>
                        <td className="py-3">{nameOf(branches, s.branchId, 'Tenant Default')}</td>
                        <td className="py-3">
                          <Badge variant={statusToVariant(s.status)}>
                            <StatusDot />
                            {s.status}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => setSelectedId(s.id)}
                            className="inline-flex items-center text-sm text-primary hover:underline"
                          >
                            View Items <ChevronRight className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Fee Structure</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="fs-name">Name</Label>
                <Input
                  id="fs-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Senior High STEM 2026"
                  required
                />
              </div>
              <div>
                <Label htmlFor="fs-sy">School Year</Label>
                <select
                  id="fs-sy"
                  value={form.schoolYearId}
                  onChange={(e) => setForm({ ...form, schoolYearId: e.target.value })}
                  className="flex h-9 w-full rounded-md border px-2 py-1 text-sm"
                  required
                >
                  <option value="">Select school year…</option>
                  {schoolYears.map((sy: any) => (
                    <option key={sy.id} value={sy.id}>
                      {sy.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-muted-foreground">
                Created for your current branch. Leave it as the only structure and it acts as the tenant default;
                add more specific structures to override per level or program.
              </p>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating…' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
