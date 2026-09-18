'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { Save, CheckCircle, XCircle, Clock, ShieldCheck, Users, AlertTriangle } from 'lucide-react';

interface RosterStudent {
  studentId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  studentNumber?: string;
  lrn?: string;
  enrollmentId: string | null;
  sectionId: string;
}

export default function AttendancePage() {
  const { currentTenantId } = useTenantStore();
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});

  const { data: offerings } = useQuery({
    queryKey: ['offerings', currentTenantId],
    queryFn: () => apiClient.scheduling.listOfferings({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });

  // Real roster from the backend (students assigned to the section)
  const { data: roster, isLoading: rosterLoading } = useQuery({
    queryKey: ['attendance-roster', selectedClass],
    queryFn: () => apiClient.attendance.getRoster(selectedClass),
    enabled: !!selectedClass,
  });

  const { data: existingRecords } = useQuery({
    queryKey: ['attendance', currentTenantId, selectedClass, selectedDate],
    queryFn: () =>
      apiClient.attendance.getRecords({ tenantId: currentTenantId!, classOfferingId: selectedClass, date: selectedDate }),
    enabled: !!currentTenantId && !!selectedClass && !!selectedDate,
  });

  const rosterList: RosterStudent[] = roster?.data ?? [];
  const existingData = (existingRecords?.data as any[]) ?? [];

  // Seed the grid: existing records for the date take precedence, then blank
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const record of existingData) {
      next[record.studentId] = record.status;
    }
    setAttendance(next);
  }, [existingData]);

  const saveAttendance = useMutation({
    mutationFn: () => {
      const records = rosterList
        .filter((s) => attendance[s.studentId])
        .map((s) => ({
          studentId: s.studentId,
          enrollmentId: s.enrollmentId ?? '',
          sectionId: s.sectionId,
          classOfferingId: selectedClass,
          attendanceDate: selectedDate,
          status: attendance[s.studentId],
        }));
      return apiClient.attendance.bulkRecordAttendance(records);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });

  const statusOptions = [
    { value: 'present', label: 'Present', icon: CheckCircle, color: 'text-green-600' },
    { value: 'absent', label: 'Absent', icon: XCircle, color: 'text-red-600' },
    { value: 'late', label: 'Late', icon: Clock, color: 'text-yellow-600' },
    { value: 'excused', label: 'Excused', icon: ShieldCheck, color: 'text-blue-600' },
  ];

  const markedCount = rosterList.filter((s) => attendance[s.studentId]).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground">Record daily attendance for classes</p>
        </div>
        <button
          onClick={() => saveAttendance.mutate()}
          disabled={!selectedClass || markedCount === 0 || saveAttendance.isPending}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="mr-2 h-4 w-4" />
          {saveAttendance.isPending ? 'Saving...' : `Save Attendance (${markedCount}/${rosterList.length})`}
        </button>
        {saveAttendance.isError && (
          <span className="text-sm text-red-600">
            {saveAttendance.error instanceof Error ? saveAttendance.error.message : 'Save failed'}
          </span>
        )}
      </div>

      <div className="flex gap-4">
        <div>
          <label className="text-sm font-medium">Class/Offering</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="flex h-9 w-full max-w-xs rounded-md border px-3 py-1 text-sm mt-1"
          >
            <option value="">Select class...</option>
            {((offerings?.data as any[]) ?? []).map((o: any) => (
              <option key={o.id} value={o.id}>{o.subjectId} - {o.sectionId}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex h-9 rounded-md border px-3 py-1 text-sm mt-1"
          />
        </div>
      </div>

      {selectedClass && (
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Student Attendance</h2>
              <p className="text-sm text-muted-foreground">Click a status button for each student</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" /> {rosterList.length} enrolled
            </div>
          </div>
          <div className="p-4">
            {rosterLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" />
              </div>
            ) : rosterList.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No students are assigned to this class's section yet</p>
                <p className="text-sm text-muted-foreground mt-1">Assign students to sections via the enrollment wizard</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-3 font-medium">Student</th>
                    <th className="pb-3 font-medium">Student #</th>
                    <th className="pb-3 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rosterList.map((student) => (
                    <tr key={student.studentId} className="border-b last:border-0">
                      <td className="py-3 font-medium">
                        {student.lastName}, {student.firstName} {student.middleName ?? ''}
                      </td>
                      <td className="py-3 font-mono text-sm text-muted-foreground">
                        {student.studentNumber || student.lrn || '—'}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2 justify-center">
                          {statusOptions.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setAttendance({ ...attendance, [student.studentId]: opt.value })}
                              className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                                attendance[student.studentId] === opt.value
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'hover:bg-muted'
                              }`}
                            >
                              <opt.icon className={`h-4 w-4 ${opt.color}`} />
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {rosterList.length > 0 && markedCount < rosterList.length && (
              <div className="mt-4 flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  {rosterList.length - markedCount} student(s) not yet marked — unmarked students will not be saved.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
