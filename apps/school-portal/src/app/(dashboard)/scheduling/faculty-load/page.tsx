'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { AlertTriangle, CheckCircle, Plus, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@sms/ui';

export default function FacultyLoadPage() {
  const { currentTenantId, currentBranchId } = useTenantStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();

  const [employeeId, setEmployeeId] = useState('');
  const [termId, setTermId] = useState('');
  
  // Modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedOfferingToAssign, setSelectedOfferingToAssign] = useState('');

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

  const { data: offerings } = useQuery({
    queryKey: ['offerings', currentTenantId, activeYearId, termId],
    queryFn: () => apiClient.scheduling.listOfferings({ tenantId: currentTenantId!, schoolYearId: activeYearId, termId }),
    enabled: !!currentTenantId && !!activeYearId && !!termId && isAssignModalOpen,
  });

  const loadData = load?.data as any;
  const offeringsList = (offerings?.data as any[]) ?? [];

  const assignLoadMutation = useMutation({
    mutationFn: async () => {
      // Update the scheduling offering so it appears in getFacultyLoad
      await apiClient.scheduling.updateOffering(selectedOfferingToAssign, {
        facultyEmployeeId: employeeId,
      });
      // Add the HR teaching load record
      return apiClient.hr.assignTeachingLoad({
        tenantId: currentTenantId,
        branchId: currentBranchId,
        employeeId,
        classOfferingId: selectedOfferingToAssign,
        termId,
        schoolYearId: activeYearId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty-load'] });
      setIsAssignModalOpen(false);
      setSelectedOfferingToAssign('');
      toast({ title: 'Success', description: 'Class successfully assigned to faculty.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to assign class', description: error.message, variant: 'destructive' });
    },
  });

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
            className="flex h-9 w-full sm:w-64 rounded-md border px-3 py-1 text-sm mt-1 bg-transparent"
          >
            <option value="" className="text-slate-900">Select faculty...</option>
            {((employees?.data as any[]) ?? []).map((e: any) => (
              <option key={e.id} value={e.id} className="text-slate-900">{e.lastName}, {e.firstName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Term</label>
          <select
            value={termId}
            onChange={(e) => setTermId(e.target.value)}
            className="flex h-9 w-full sm:w-64 rounded-md border px-3 py-1 text-sm mt-1 bg-transparent"
          >
            <option value="" className="text-slate-900">Select term...</option>
            {activeYearId && ((terms?.data as unknown as { id: string; name: string }[] | undefined) ?? []).map((t) => (
              <option key={t.id} value={t.id} className="text-slate-900">{t.name}</option>
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
                  <div className="flex items-center gap-2 text-[hsl(var(--destructive))]">
                    <AlertTriangle className="h-6 w-6" />
                    <span className="text-xl font-bold">Overloaded</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[hsl(var(--success))]">
                    <CheckCircle className="h-6 w-6" />
                    <span className="text-xl font-bold">Within Limit</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card shadow-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold">Assigned Classes ({loadData.offerings?.length ?? 0})</h2>
              
              <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Assign Class
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign Class to Faculty</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Select Class Offering</label>
                      <Select
                        value={selectedOfferingToAssign}
                        onValueChange={setSelectedOfferingToAssign}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select class offering..." />
                        </SelectTrigger>
                        <SelectContent>
                          {offeringsList.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.subjectId} - {o.sectionId} ({o.units} units)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => assignLoadMutation.mutate()}
                      disabled={!selectedOfferingToAssign || assignLoadMutation.isPending}
                    >
                      {assignLoadMutation.isPending ? 'Assigning...' : 'Assign Class'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="p-4">
              {(loadData.offerings ?? []).length === 0 ? (
                <p className="text-muted-foreground text-sm">No classes assigned for this term.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wider text-[hsl(var(--ink-300))] font-semibold">
                        <th className="pb-3 px-2">Subject</th>
                        <th className="pb-3 px-2">Section</th>
                        <th className="pb-3 px-2">Units</th>
                        <th className="pb-3 px-2">Hours/Wk</th>
                        <th className="pb-3 px-2">Schedule</th>
                        <th className="pb-3 px-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(loadData.offerings ?? []).map((o: any) => (
                        <tr key={o.id} className="border-b last:border-0 hover:bg-[hsl(var(--surface-muted))] transition-colors">
                          <td className="py-3 px-2 font-medium text-[hsl(var(--foreground))]">{o.subjectId}</td>
                          <td className="py-3 px-2 text-[hsl(var(--foreground))]">{o.sectionId}</td>
                          <td className="py-3 px-2 text-[hsl(var(--foreground))]">{o.units}</td>
                          <td className="py-3 px-2 text-[hsl(var(--foreground))]">{o.hoursPerWeek}</td>
                          <td className="py-3 px-2 text-sm text-muted-foreground">
                            {(o.timeSlots || []).map((s: any) => `${s.day} ${s.startTime}-${s.endTime}`).join(', ') || '—'}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <Button 
                              variant="outline" 
                              size="xs"
                              className="text-xs h-7"
                              onClick={() => router.push(`/scheduling/gradebook?classId=${o.id}&termId=${termId}`)}
                            >
                              <BookOpen className="mr-2 h-3 w-3" />
                              Enter Grades
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
