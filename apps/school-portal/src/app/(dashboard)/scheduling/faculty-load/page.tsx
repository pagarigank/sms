'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export default function FacultyLoadPage() {
  const { currentTenantId } = useTenantStore();
  const [employeeId, setEmployeeId] = useState('');
  const [termId, setTermId] = useState('');

  const { data: schoolYears } = useQuery({
    queryKey: ['school-years', 'faculty-load'],
    queryFn: () => apiClient.academic.listSchoolYears({ limit: 50 }),
  });

  const yearsList = (schoolYears?.data as unknown as { id: string; name: string; status: string }[] | undefined) ?? [];
  const activeYearId = yearsList.find((sy) => sy.status === 'active')?.id ?? yearsList[0]?.id ?? '';

  const { data: terms } = useQuery({
    queryKey: ['terms', activeYearId],
    queryFn: () => apiClient.academic.listTerms(activeYearId),
    enabled: !!activeYearId,
  });

  const { data: employees } = useQuery({
    queryKey: ['employees', currentTenantId],
    queryFn: () => apiClient.hr.getEmployees({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });

  const { data: load, isLoading } = useQuery({
    queryKey: ['faculty-load', currentTenantId, employeeId, termId],
    queryFn: () => apiClient.scheduling.getFacultyLoad({ tenantId: currentTenantId!, employeeId, termId }),
    enabled: !!currentTenantId && !!employeeId && !!termId,
  });

  const loadData = load?.data as any;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Faculty Load Report</h1>
        <p className="text-muted-foreground">Monitor faculty teaching load and capacity</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div>
          <label className="text-sm font-medium">Faculty Member</label>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="flex h-9 w-full sm:w-64 rounded-md border px-3 py-1 text-sm mt-1"
          >
            <option value="">Select faculty...</option>
            {((employees?.data as any[]) ?? []).map((e: any) => (
              <option key={e.id} value={e.id}>{e.lastName}, {e.firstName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Term</label>
          <select
            value={termId}
            onChange={(e) => setTermId(e.target.value)}
            className="flex h-9 w-full sm:w-64 rounded-md border px-3 py-1 text-sm mt-1"
          >
            <option value="">Select term...</option>
            {activeYearId && ((terms?.data as unknown as { id: string; name: string }[] | undefined) ?? []).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {employeeId && termId && isLoading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" />
        </div>
      )}

      {employeeId && termId && !isLoading && loadData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <p className="text-sm text-muted-foreground">Total Units</p>
              <p className="text-3xl font-bold mt-2">{loadData.totalUnits ?? 0}</p>
              <p className="text-sm text-muted-foreground">/ {loadData?.limit?.maxUnits ?? 24} max</p>
            </div>
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <p className="text-sm text-muted-foreground">Hours/Week</p>
              <p className="text-3xl font-bold mt-2">{loadData.totalHours ?? 0}</p>
              <p className="text-sm text-muted-foreground">/ {loadData?.limit?.maxHoursPerWeek ?? 40} max</p>
            </div>
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-2">
                {loadData.isOverloaded ? (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-6 w-6" />
                    <span className="text-xl font-bold">Overloaded</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-6 w-6" />
                    <span className="text-xl font-bold">Within Limit</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card shadow-sm">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Assigned Classes ({loadData.offerings?.length ?? 0})</h2>
            </div>
            <div className="p-4">
              {(loadData.offerings ?? []).length === 0 ? (
                <p className="text-muted-foreground">No classes assigned for this term</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="pb-3 font-medium">Subject</th>
                      <th className="pb-3 font-medium">Section</th>
                      <th className="pb-3 font-medium">Units</th>
                      <th className="pb-3 font-medium">Hours/Week</th>
                      <th className="pb-3 font-medium">Schedule</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(loadData.offerings ?? []).map((o: any) => (
                      <tr key={o.id} className="border-b last:border-0">
                        <td className="py-3 font-medium">{o.subjectId}</td>
                        <td className="py-3">{o.sectionId}</td>
                        <td className="py-3">{o.units}</td>
                        <td className="py-3">{o.hoursPerWeek}</td>
                        <td className="py-3 text-sm text-muted-foreground">
                          {(o.timeSlots || []).map((s: any) => `${s.day} ${s.startTime}-${s.endTime}`).join(', ') || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
