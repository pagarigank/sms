'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { Plus, Edit, Users } from 'lucide-react';

export default function SectionsPage() {
  const { currentTenantId, currentBranchId } = useTenantStore();

  const { data: sections, isLoading } = useQuery({
    queryKey: ['sections', currentTenantId, currentBranchId],
    queryFn: () => apiClient.sis.listSections({ tenantId: currentTenantId!, branchId: currentBranchId ?? undefined }),
    enabled: !!currentTenantId,
  });

  if (isLoading) return <div className="flex items-center justify-center p-8"><div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" /></div>;

  const sectionList: any[] = (sections?.data as any[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sections</h1>
          <p className="text-muted-foreground">Manage class sections and capacity</p>
        </div>
        <button className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> Add Section
        </button>
      </div>

      {sectionList.length === 0 ? (
        <p className="text-center text-muted-foreground py-8 rounded-lg border bg-card">No sections. Create sections to organize students.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sectionList.map((section: any) => (
            <div key={section.id} className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">{section.name}</h3>
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${section.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {section.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Capacity</span><span>{section.capacity} students</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Homeroom</span><span>{section.homeroom || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Grade Level</span><span>{section.gradeLevelId || '—'}</span></div>
              </div>
              <div className="flex gap-2 mt-4">
                <button className="flex-1 inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
                  <Users className="mr-1 h-4 w-4" /> Students
                </button>
                <button className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
                  <Edit className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
