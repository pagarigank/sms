'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { UserPlus, Search } from 'lucide-react';

export default function GuardiansPage() {
  const { currentTenantId } = useTenantStore();
  const [search, setSearch] = useState('');

  const { data: guardians, isLoading } = useQuery({
    queryKey: ['guardians', currentTenantId],
    queryFn: () => apiClient.sis.listGuardians({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });

  const filtered = ((guardians?.data as any[]) ?? []).filter((g: any) =>
    `${g.firstName} ${g.lastName} ${g.email} ${g.contactNumber}`.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="flex items-center justify-center p-8"><div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Guardians</h1>
          <p className="text-muted-foreground">Manage parent/guardian records</p>
        </div>
        <button className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <UserPlus className="mr-2 h-4 w-4" /> Add Guardian
        </button>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input placeholder="Search guardians..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex h-9 w-full max-w-sm rounded-md border px-3 py-1 text-sm" />
          </div>
        </div>
        <div className="p-4">
          {filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No guardians found</p> : (
            <table className="w-full">
              <thead><tr className="border-b text-left text-sm text-muted-foreground">
                <th className="pb-3 font-medium">Name</th><th className="pb-3 font-medium">Contact</th><th className="pb-3 font-medium">Email</th><th className="pb-3 font-medium">Relationship</th>
              </tr></thead>
              <tbody>
                {filtered.map((g: any) => (
                  <tr key={g.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{g.lastName}, {g.firstName} {g.middleName || ''}</td>
                    <td className="py-3">{g.contactNumber || '—'}</td>
                    <td className="py-3">{g.email || '—'}</td>
                    <td className="py-3"><span className="inline-flex rounded-full bg-secondary px-2 py-1 text-xs font-medium">{g.relationshipToStudent || '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
