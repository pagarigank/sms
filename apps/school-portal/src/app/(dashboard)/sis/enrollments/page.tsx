'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { UserPlus, Search } from 'lucide-react';

export default function EnrollmentsPage() {
  const { currentTenantId, currentBranchId } = useTenantStore();
  const [search, setSearch] = useState('');

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['enrollments', currentTenantId, currentBranchId],
    queryFn: () => apiClient.sis.listEnrollments({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });

  const filtered = ((enrollments?.data as any[]) ?? []).filter((e: any) =>
    `${e.studentId} ${e.schoolYearId}`.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="flex items-center justify-center p-8"><div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enrollments</h1>
          <p className="text-muted-foreground">Manage student enrollments</p>
        </div>
        <button className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <UserPlus className="mr-2 h-4 w-4" /> New Enrollment
        </button>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input placeholder="Search enrollments..." value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} className="flex h-9 w-full max-w-sm rounded-md border px-3 py-1 text-sm" />
          </div>
        </div>
        <div className="p-4">
          {filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No enrollments found</p> : (
            <table className="w-full">
              <thead><tr className="border-b text-left text-sm text-muted-foreground">
                <th className="pb-3 font-medium">Student</th><th className="pb-3 font-medium">School Year</th><th className="pb-3 font-medium">Section</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Enrolled At</th>
              </tr></thead>
              <tbody>
                {filtered.map((e: any) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{e.studentId}</td>
                    <td className="py-3">{e.schoolYearId}</td>
                    <td className="py-3">{e.sectionId || '—'}</td>
                    <td className="py-3"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${e.status === 'enrolled' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{e.status}</span></td>
                    <td className="py-3">{e.enrolledAt ? new Date(e.enrolledAt).toLocaleDateString() : '—'}</td>
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
