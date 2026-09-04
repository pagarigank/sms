'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTenantStore } from '@/lib/store';
import { apiClient } from '@/lib/api';

export function TenantSwitcher() {
  const { currentTenantId, currentBranchId, setCurrentTenant, setCurrentBranch } = useTenantStore();

  const { data: tenantsRes } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => apiClient.tenants.list(),
  });

  const { data: branchesRes } = useQuery({
    queryKey: ['branches', currentTenantId],
    queryFn: () => apiClient.branches.list({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });

  const tenants = tenantsRes?.data ?? [];
  const branches = branchesRes?.data ?? [];

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
    <div className="flex items-center space-x-4">
      {/* Tenant Selector */}
      <div>
        <label className="text-xs text-muted-foreground">Tenant</label>
        <select
          value={currentTenantId || ''}
          onChange={(e) => {
            setCurrentTenant(e.target.value || null);
            setCurrentBranch(null);
          }}
          className="block w-full rounded-md border px-2 py-1 text-sm"
        >
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Branch Selector */}
      <div>
        <label className="text-xs text-muted-foreground">Branch</label>
        <select
          value={currentBranchId || ''}
          onChange={(e) => setCurrentBranch(e.target.value || null)}
          className="block w-full rounded-md border px-2 py-1 text-sm"
        >
          <option value="">All Branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
