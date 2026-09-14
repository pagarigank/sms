'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTenantStore } from '@/lib/store';
import { apiClient } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sms/ui';
import { Building2, GitBranch } from 'lucide-react';

export function TenantSwitcher() {
  const currentTenantId = useTenantStore((s) => s.currentTenantId);
  const currentBranchId = useTenantStore((s) => s.currentBranchId);
  const setCurrentTenant = useTenantStore((s) => s.setCurrentTenant);
  const setCurrentBranch = useTenantStore((s) => s.setCurrentBranch);

  const { data: tenantsRes } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => apiClient.tenants.list(),
  });

  const { data: branchesRes } = useQuery({
    queryKey: ['branches', currentTenantId],
    queryFn: () => apiClient.branches.list({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });

  const tenants = Array.isArray(tenantsRes?.data)
    ? (tenantsRes.data as { id: string; name: string }[])
    : ((tenantsRes?.data as unknown as { data?: { id: string; name: string }[] } | undefined)?.data ?? []);
  const branches = Array.isArray(branchesRes?.data)
    ? (branchesRes.data as { id: string; name: string }[])
    : ((branchesRes?.data as unknown as { data?: { id: string; name: string }[] } | undefined)?.data ?? []);

  // Auto-select first tenant if none selected
  useEffect(() => {
    if (!currentTenantId && tenants.length > 0) {
      setCurrentTenant(tenants[0].id);
    }
  }, [currentTenantId, tenants, setCurrentTenant]);

  // Auto-select first branch if none selected
  useEffect(() => {
    if (!currentBranchId && branches.length > 0) {
      setCurrentBranch(branches[0].id);
    }
  }, [currentBranchId, branches, setCurrentBranch]);

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentTenantId ?? undefined}
        onValueChange={(v) => {
          setCurrentTenant(v);
          setCurrentBranch(null);
        }}
      >
        <SelectTrigger
          className="h-9 w-44 gap-1.5 rounded-lg border-[hsl(var(--border))] bg-[hsl(var(--surface-muted))] text-sm"
          aria-label="Select tenant"
        >
          <Building2 className="h-4 w-4 shrink-0 text-[hsl(var(--ink-300))]" />
          <SelectValue placeholder="Tenant" />
        </SelectTrigger>
        <SelectContent>
          {tenants.map((t) => (
            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentBranchId ?? 'all-branches'}
        onValueChange={(v) => setCurrentBranch(v === 'all-branches' ? null : v)}
      >
        <SelectTrigger
          className="h-9 w-44 gap-1.5 rounded-lg border-[hsl(var(--border))] bg-[hsl(var(--surface-muted))] text-sm"
          aria-label="Select branch"
        >
          <GitBranch className="h-4 w-4 shrink-0 text-[hsl(var(--ink-300))]" />
          <SelectValue placeholder="Branch" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all-branches">All Branches</SelectItem>
          {branches.map((b) => (
            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
