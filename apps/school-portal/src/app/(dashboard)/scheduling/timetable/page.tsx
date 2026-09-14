'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { Plus, Clock, AlertTriangle } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '@sms/ui';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = Array.from({ length: 12 }, (_, i) => {
  const hour = 7 + i;
  return `${hour.toString().padStart(2, '0')}:00`;
});

export default function TimetablePage() {
  const { currentTenantId, currentBranchId } = useTenantStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    subjectId: '', facultyEmployeeId: '', roomId: '',
    day: 'Monday', startTime: '08:00', endTime: '09:00',
    units: '3', hoursPerWeek: '3',
  });

  const { data: sections } = useQuery({
    queryKey: ['sections', currentTenantId, currentBranchId],
    queryFn: () => apiClient.sis.listSections({ tenantId: currentTenantId!, branchId: currentBranchId ?? undefined }),
    enabled: !!currentTenantId,
  });

  const { data: schoolYears } = useQuery({
    queryKey: ['school-years', 'timetable'],
    queryFn: () => apiClient.academic.listSchoolYears({ limit: 50 }),
  });

  const yearsList = (schoolYears?.data as unknown as { id: string; name: string; status: string }[] | undefined) ?? [];
  const activeYearId = yearsList.find((sy) => sy.status === 'active')?.id ?? yearsList[0]?.id ?? '';

  const { data: terms } = useQuery({
    queryKey: ['terms', activeYearId],
    queryFn: () => apiClient.academic.listTerms(activeYearId),
    enabled: !!activeYearId,
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects', 'timetable'],
    queryFn: () => apiClient.academic.listSubjects(),
  });

  const { data: timetable, isLoading } = useQuery({
    queryKey: ['timetable', currentTenantId, selectedSection, selectedTerm],
    queryFn: () =>
      apiClient.scheduling.getTimetable({ tenantId: currentTenantId!, sectionId: selectedSection, termId: selectedTerm }),
    enabled: !!currentTenantId && !!selectedSection && !!selectedTerm,
  });

  const addClass = useMutation({
    mutationFn: async () => {
      const payload = {
        tenantId: currentTenantId,
        branchId: currentBranchId ?? undefined,
        schoolYearId: activeYearId,
        termId: selectedTerm,
        sectionId: selectedSection,
        subjectId: form.subjectId,
        facultyEmployeeId: form.facultyEmployeeId || undefined,
        roomId: form.roomId || undefined,
        timeSlots: [{ day: form.day, startTime: form.startTime, endTime: form.endTime }],
        units: parseFloat(form.units) || 0,
        hoursPerWeek: parseFloat(form.hoursPerWeek) || 0,
        status: 'active',
      };
      // Conflict check first (faculty/room/section double-booking)
      const check = await apiClient.scheduling.checkConflict(payload);
      const result = check.data as { hasConflict: boolean; conflict: string | null };
      if (result.hasConflict) {
        throw new Error(result.conflict ?? 'Scheduling conflict detected');
      }
      return apiClient.scheduling.createOffering(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
      setShowAdd(false);
      setForm({ subjectId: '', facultyEmployeeId: '', roomId: '', day: 'Monday', startTime: '08:00', endTime: '09:00', units: '3', hoursPerWeek: '3' });
      toast({ title: 'Class added', description: 'The class has been added to the timetable.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Could not add class', description: error.message, variant: 'destructive' });
    },
  });

  const timetableData = (timetable?.data as any) ?? {};
  const subjectNames = new Map(((subjects?.data as any[]) ?? []).map((s) => [s.id, s.title]));
  const sectionNames = new Map(((sections?.data as any[]) ?? []).map((s) => [s.id, s.name]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Timetable</h1>
          <p className="text-muted-foreground">View and manage class schedules</p>
        </div>
        <Button onClick={() => setShowAdd(true)} disabled={!selectedSection || !selectedTerm}>
          <Plus className="h-4 w-4" /> Add Class
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:max-w-xs">
          <Label htmlFor="timetable-section">Section</Label>
          <Select value={selectedSection} onValueChange={setSelectedSection}>
            <SelectTrigger id="timetable-section" className="mt-1">
              <SelectValue placeholder="Select section..." />
            </SelectTrigger>
            <SelectContent>
              {((sections?.data as any[]) ?? []).map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:max-w-xs">
          <Label htmlFor="timetable-term">Term</Label>
          <Select value={selectedTerm} onValueChange={setSelectedTerm}>
            <SelectTrigger id="timetable-term" className="mt-1">
              <SelectValue placeholder="Select term..." />
            </SelectTrigger>
            <SelectContent>
              {activeYearId && ((terms?.data as unknown as { id: string; name: string }[] | undefined) ?? []).map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Add Class dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Class to Timetable</DialogTitle>
            <DialogDescription>
              {selectedSection
                ? `Scheduling for ${sectionNames.get(selectedSection) ?? 'selected section'} · conflict checking is automatic.`
                : 'Scheduling for the selected section.'}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); addClass.mutate(); }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Subject *</Label>
                <Select value={form.subjectId} onValueChange={(v) => setForm({ ...form, subjectId: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select subject..." />
                  </SelectTrigger>
                  <SelectContent>
                    {((subjects?.data as any[]) ?? []).map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.code} — {s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Day</Label>
                <Select value={form.day} onValueChange={(v) => setForm({ ...form, day: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="class-start">Start</Label>
                  <Input
                    id="class-start"
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="class-end">End</Label>
                  <Input
                    id="class-end"
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="mt-1"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="class-units">Units</Label>
                <Input
                  id="class-units"
                  type="number"
                  step="0.5"
                  min="0"
                  value={form.units}
                  onChange={(e) => setForm({ ...form, units: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="class-hours">Hours/Week</Label>
                <Input
                  id="class-hours"
                  type="number"
                  step="0.5"
                  min="0"
                  value={form.hoursPerWeek}
                  onChange={(e) => setForm({ ...form, hoursPerWeek: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            {addClass.isError && (
              <div
                className="flex items-start gap-2 p-3 rounded-lg border"
                style={{
                  backgroundColor: 'hsl(var(--status-danger-surface))',
                  borderColor: 'hsl(var(--status-danger-ink) / 0.2)',
                  color: 'hsl(var(--status-danger-ink))',
                }}
              >
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-sm">
                  {addClass.error instanceof Error ? addClass.error.message : 'Failed to add class'}
                </p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addClass.isPending}>
                {addClass.isPending ? 'Checking...' : 'Add Class'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {selectedSection && selectedTerm ? (
        isLoading ? (
          <div className="flex items-center justify-center p-16">
            <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" />
          </div>
        ) : (
          <div className="rounded-lg border bg-card shadow-sm overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader className="sticky top-0 z-20 bg-[hsl(var(--surface-muted))] shadow-[0_1px_0_0_hsl(var(--border))]">
                <TableRow className="border-b hover:bg-transparent">
                  <TableHead className="sticky left-0 z-30 w-24 bg-[hsl(var(--surface-muted))] text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--ink-300))]">
                    Time
                  </TableHead>
                  {DAYS.map((day) => (
                    <TableHead
                      key={day}
                      className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--ink-300))]"
                    >
                      {day}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {TIME_SLOTS.map((slot) => (
                  <TableRow key={slot} className="border-b last:border-0">
                    <TableCell className="sticky left-0 z-10 bg-[hsl(var(--surface-raised))] font-mono text-sm text-[hsl(var(--ink-200))]">
                      {slot}
                    </TableCell>
                    {DAYS.map((day) => {
                      const classes = (timetableData[day] ?? []).filter((c: any) => c.startTime <= slot && c.endTime > slot);
                      return (
                        <TableCell key={day} className="p-1.5 align-top">
                          {classes.length > 0 ? (
                            <div className="space-y-1.5">
                              {classes.map((cls: any, i: number) => (
                                <div
                                  key={i}
                                  className="rounded-md border p-2 text-xs"
                                  style={{
                                    backgroundColor: 'hsl(var(--accent-subtle))',
                                    borderColor: 'hsl(var(--accent) / 0.25)',
                                  }}
                                >
                                  <p className="font-medium text-[hsl(var(--foreground))]">
                                    {subjectNames.get(cls.subjectId) ?? cls.subjectId}
                                  </p>
                                  <p className="text-[hsl(var(--ink-300))]">{cls.startTime}-{cls.endTime}</p>
                                  {cls.roomId && (
                                    <p className="text-[hsl(var(--ink-300))]">
                                      Room: <span className="font-mono">{cls.roomId.slice(0, 8)}</span>
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="h-16 rounded-md border border-dashed border-[hsl(var(--border))]" />
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      ) : (
        <div className="rounded-lg border bg-card p-8 text-center">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Select a section and term to view the timetable</p>
        </div>
      )}
    </div>
  );
}
