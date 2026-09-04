'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { UserPlus, Settings, FileText } from 'lucide-react';

const DEFAULT_STAGES = [
  { code: 'inquiry', name: 'Inquiry', color: 'border-blue-300 bg-blue-50' },
  { code: 'applicant', name: 'Applicant', color: 'border-yellow-300 bg-yellow-50' },
  { code: 'exam', name: 'Exam', color: 'border-purple-300 bg-purple-50' },
  { code: 'admitted', name: 'Admitted', color: 'border-green-300 bg-green-50' },
  { code: 'enrolled', name: 'Enrolled', color: 'border-emerald-300 bg-emerald-50' },
];

export default function AdmissionsPage() {
  const { currentTenantId } = useTenantStore();

  const { data: pipeline, isLoading } = useQuery({
    queryKey: ['pipeline', currentTenantId],
    queryFn: () => apiClient.admissions.getPipeline({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });

  if (isLoading) return <div className="flex items-center justify-center p-8"><div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" /></div>;

  const pipelineData: Record<string, any[]> = (pipeline?.data as any)?.pipeline ?? {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admissions Pipeline</h1>
          <p className="text-muted-foreground">Track applicants through the admission process</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
            <Settings className="mr-2 h-4 w-4" /> Configure Stages
          </button>
          <button className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <UserPlus className="mr-2 h-4 w-4" /> New Applicant
          </button>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {DEFAULT_STAGES.map((stage) => {
          const applicants = pipelineData[stage.code] ?? [];
          return (
            <div key={stage.code} className={`min-w-[280px] flex-shrink-0 rounded-lg border-2 ${stage.color}`}>
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{stage.name}</h3>
                  <span className="inline-flex items-center justify-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">{applicants.length}</span>
                </div>
              </div>
              <div className="p-2 space-y-2 min-h-[200px]">
                {applicants.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">No applicants</p>
                ) : (
                  applicants.map((applicant: any) => (
                    <div key={applicant.id} className="rounded-lg border bg-card p-3 cursor-pointer hover:shadow-md transition-shadow">
                      <p className="font-medium text-sm">{applicant.lastName}, {applicant.firstName}</p>
                      <p className="text-xs text-muted-foreground mt-1">{applicant.studentNumber || applicant.lrn || 'No ID yet'}</p>
                      <button className="mt-2 text-xs text-primary hover:underline inline-flex items-center">
                        <FileText className="h-3 w-3 mr-1" /> View
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
