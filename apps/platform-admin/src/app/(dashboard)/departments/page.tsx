'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export default function DepartmentsPage() {
  const { data: deptRes, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => apiClient.departments.list(),
  });

  const departments = deptRes?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
        <p className="text-muted-foreground">Manage academic departments across tenants</p>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Tenant ID</th>
                <th className="px-4 py-3 text-left font-medium">Branch ID</th>
                <th className="px-4 py-3 text-left font-medium">Default</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : departments.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No departments found</td></tr>
              ) : (
                departments.map((dept) => (
                  <tr key={dept.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{dept.name}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{dept.tenantId}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{dept.branchId}</td>
                    <td className="px-4 py-3">
                      {dept.isDefault ? (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">Yes</span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
