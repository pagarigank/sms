'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { Plus, Tag, CheckCircle, Clock, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@sms/ui';
import { Input } from '@sms/ui';
import { Label } from '@sms/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sms/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@sms/ui';
import { useToast, useConfirm, Badge, statusToVariant, StatusDot } from '@sms/ui';

/** Backend endpoints may return a bare array, an ApiResponse wrapper, or a paginated envelope. */
function listOf<T>(res: unknown): T[] {
  if (res == null) return [];
  if (Array.isArray(res)) return res as T[];
  const r = res as any;
  if (Array.isArray(r.data)) return r.data as T[];
  if (Array.isArray(r.data?.data)) return r.data.data as T[];
  return [];
}

interface DiscountType {
  id: string;
  name: string;
  code: string;
  discountMode: string;
  defaultPercentage: string;
  defaultAmount: string;
  requiresApproval: boolean;
  isScholarship: boolean;
}

interface DiscountGrant {
  id: string;
  studentId: string;
  discountTypeId: string;
  percentage?: string;
  fixedAmount?: string;
  status: string;
  validFrom?: string;
  validUntil?: string;
}

export default function DiscountsPage() {
  const { currentTenantId } = useTenantStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreateType, setShowCreateType] = useState(false);
  const [showCreateGrant, setShowCreateGrant] = useState(false);
  const [typeForm, setTypeForm] = useState({
    name: '',
    code: '',
    description: '',
    discountMode: 'percentage',
    defaultPercentage: '10',
    defaultAmount: '0',
    requiresApproval: true,
    isScholarship: false,
  });
  const [grantForm, setGrantForm] = useState({ studentId: '', discountTypeId: '', percentage: '', fixedAmount: '' });

  const { data: discountTypes, isLoading: loadingTypes, error: typesError } = useQuery({
    queryKey: ['discount-types', currentTenantId],
    queryFn: () => apiClient.billing.getDiscountTypes({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });

  const { data: grants, isLoading: loadingGrants } = useQuery({
    queryKey: ['discount-grants', currentTenantId],
    queryFn: () => apiClient.billing.getDiscountGrants({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });

  const { data: studentsRes } = useQuery({
    queryKey: ['students-for-discounts', currentTenantId],
    queryFn: () => apiClient.sis.listStudents({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });

  const types = listOf<DiscountType>(discountTypes);
  const grantList = listOf<DiscountGrant>(grants);
  const students = listOf<{ id: string; firstName: string; lastName: string }>(studentsRes);

  const studentName = (id: string) => {
    const s = students.find((x) => x.id === id);
    return s ? `${s.lastName}, ${s.firstName}` : `Student ${id.slice(0, 8)}`;
  };
  const typeName = (id: string) => types.find((t) => t.id === id)?.name ?? 'Unknown type';

  const createTypeMutation = useMutation({
    mutationFn: (data: typeof typeForm) =>
      apiClient.billing.createDiscountType({
        ...data,
        defaultPercentage: data.discountMode === 'percentage' ? parseFloat(data.defaultPercentage) || 0 : 0,
        defaultAmount: data.discountMode === 'fixed' ? parseFloat(data.defaultAmount) || 0 : 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-types'] });
      setShowCreateType(false);
      toast({ title: 'Discount type created' });
    },
    onError: (error: Error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const createGrantMutation = useMutation({
    mutationFn: (data: { studentId: string; discountTypeId: string; percentage: string; fixedAmount: string }) =>
      apiClient.billing.createDiscountGrant({
        studentId: data.studentId,
        discountTypeId: data.discountTypeId,
        percentage: data.percentage ? parseFloat(data.percentage) : null,
        fixedAmount: data.fixedAmount ? parseFloat(data.fixedAmount) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-grants'] });
      setShowCreateGrant(false);
      setGrantForm({ studentId: '', discountTypeId: '', percentage: '', fixedAmount: '' });
      toast({ title: 'Discount grant created', description: 'Approved grants are auto-applied to new invoices.' });
    },
    onError: (error: Error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiClient.billing.approveDiscountGrant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-grants'] });
      toast({ title: 'Grant approved', description: 'It will be applied to newly generated invoices.' });
    },
    onError: (error: Error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const statusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const grantValue = (g: DiscountGrant) =>
    g.percentage && Number(g.percentage) > 0
      ? `${Number(g.percentage)}% off`
      : g.fixedAmount
        ? `₱${Number(g.fixedAmount).toLocaleString()} off`
        : '—';

  const isLoading = loadingTypes || loadingGrants;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Discounts &amp; Scholarships</h1>
            <p className="text-muted-foreground">Manage discount types and student discount grants</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCreateGrant(true)}>
              <Plus className="mr-2 h-4 w-4" /> Grant Discount
            </Button>
            <Button onClick={() => setShowCreateType(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Discount Type
            </Button>
          </div>
        </div>

        {typesError ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4" /> Failed to load discount types: {(typesError as Error).message}
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-lg border bg-card shadow-sm">
              <div className="border-b p-4">
                <h2 className="flex items-center gap-2 font-semibold">
                  <Tag className="h-4 w-4" /> Discount Types
                </h2>
              </div>
              <div className="p-4">
                {types.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No discount types configured</p>
                ) : (
                  <div className="space-y-2">
                    {types.map((dt) => (
                      <div key={dt.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{dt.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {dt.discountMode === 'percentage'
                              ? `${Number(dt.defaultPercentage)}% off`
                              : `₱${Number(dt.defaultAmount).toLocaleString()} off`}
                            {dt.isScholarship ? ' • Scholarship' : ''}
                          </p>
                        </div>
                        <Badge variant={dt.requiresApproval ? 'warning' : 'success'}>
                          {dt.requiresApproval ? 'Approval Required' : 'Auto-Apply'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border bg-card shadow-sm">
              <div className="border-b p-4">
                <h2 className="font-semibold">Discount Grants</h2>
              </div>
              <div className="p-4">
                {grantList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No discount grants yet. Grant a discount to a student to have it applied on their invoices.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {grantList.slice(0, 10).map((g) => (
                      <div key={g.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{studentName(g.studentId)}</p>
                          <p className="text-sm text-muted-foreground">
                            {typeName(g.discountTypeId)} • {grantValue(g)}
                            {g.validUntil ? ` • Until ${new Date(g.validUntil).toLocaleDateString()}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {statusIcon(g.status)}
                          <span className="text-sm capitalize">{g.status}</span>
                          {g.status === 'pending' && (
                            <Button size="sm" variant="outline" onClick={() => approveMutation.mutate(g.id)}>
                              Approve
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Create discount type */}
        <Dialog open={showCreateType} onOpenChange={setShowCreateType}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Discount Type</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createTypeMutation.mutate(typeForm);
              }}
              className="space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="dt-name">Name</Label>
                  <Input
                    id="dt-name"
                    value={typeForm.name}
                    onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                    placeholder="Sibling Discount"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dt-code">Code</Label>
                  <Input
                    id="dt-code"
                    value={typeForm.code}
                    onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value.toUpperCase() })}
                    placeholder="SIBLING"
                    maxLength={12}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="dt-desc">Description</Label>
                <Input
                  id="dt-desc"
                  value={typeForm.description}
                  onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="dt-mode">Mode</Label>
                  <Select value={typeForm.discountMode} onValueChange={(v) => setTypeForm({ ...typeForm, discountMode: v })}>
                    <SelectTrigger id="dt-mode">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dt-value">{typeForm.discountMode === 'percentage' ? 'Default %' : 'Default amount (₱)'}</Label>
                  <Input
                    id="dt-value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={typeForm.discountMode === 'percentage' ? typeForm.defaultPercentage : typeForm.defaultAmount}
                    onChange={(e) =>
                      setTypeForm(
                        typeForm.discountMode === 'percentage'
                          ? { ...typeForm, defaultPercentage: e.target.value }
                          : { ...typeForm, defaultAmount: e.target.value },
                      )
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={typeForm.requiresApproval}
                    onChange={(e) => setTypeForm({ ...typeForm, requiresApproval: e.target.checked })}
                    className="rounded"
                  />
                  Requires approval
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={typeForm.isScholarship}
                    onChange={(e) => setTypeForm({ ...typeForm, isScholarship: e.target.checked })}
                    className="rounded"
                  />
                  Scholarship
                </label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateType(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTypeMutation.isPending}>
                  {createTypeMutation.isPending ? 'Creating…' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Create grant */}
        <Dialog open={showCreateGrant} onOpenChange={setShowCreateGrant}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Grant Discount to Student</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createGrantMutation.mutate(grantForm);
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="dg-student">Student</Label>
                <Select
                  value={grantForm.studentId}
                  onValueChange={(v) => setGrantForm({ ...grantForm, studentId: v })}
                >
                  <SelectTrigger id="dg-student">
                    <SelectValue placeholder="Select student…" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.lastName}, {s.firstName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dg-type">Discount type</Label>
                <Select
                  value={grantForm.discountTypeId}
                  onValueChange={(v) => setGrantForm({ ...grantForm, discountTypeId: v })}
                >
                  <SelectTrigger id="dg-type">
                    <SelectValue placeholder="Select discount type…" />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.discountMode === 'percentage' ? `${Number(t.defaultPercentage)}%` : `₱${Number(t.defaultAmount)}`})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="dg-pct">Custom % (optional)</Label>
                  <Input
                    id="dg-pct"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={grantForm.percentage}
                    onChange={(e) => setGrantForm({ ...grantForm, percentage: e.target.value })}
                    placeholder="Defaults to type's %"
                  />
                </div>
                <div>
                  <Label htmlFor="dg-fixed">Custom ₱ (optional)</Label>
                  <Input
                    id="dg-fixed"
                    type="number"
                    min="0"
                    step="0.01"
                    value={grantForm.fixedAmount}
                    onChange={(e) => setGrantForm({ ...grantForm, fixedAmount: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateGrant(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!grantForm.studentId || !grantForm.discountTypeId || createGrantMutation.isPending}
                >
                  {createGrantMutation.isPending ? 'Creating…' : 'Create Grant'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
