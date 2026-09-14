'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useStudentStore } from '@/lib/student-store';
import { GraduationCap, CheckCircle, XCircle, Clock } from 'lucide-react';

const STATUS_ICONS: Record<string, { icon: any; color: string }> = {
  present: { icon: CheckCircle, color: 'text-green-500' },
  absent: { icon: XCircle, color: 'text-red-500' },
  late: { icon: Clock, color: 'text-yellow-500' },
  excused: { icon: CheckCircle, color: 'text-blue-500' },
};

export default function AttendancePage() {
  const { selectedStudentId } = useStudentStore();

  const { data: summary, isLoading } = useQuery({
    queryKey: ['student-attendance', selectedStudentId],
    queryFn: () => apiClient.attendance.getStudentSummary({
      tenantId: '',
      studentId: selectedStudentId!,
      schoolYearId: '',
    }),
    enabled: !!selectedStudentId,
  });

  const data = (summary?.data as any) ?? null;

  if (!selectedStudentId) {
    return (
      <div className="flex items-center justify-center p-16">
        <p className="text-gray-500">Select a student to view attendance.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Attendance</h1>
        <p className="text-gray-500">Track attendance records and summary</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" />
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="rounded-lg border bg-white p-4">
              <p className="text-sm text-gray-500">Total Days</p>
              <p className="text-2xl font-bold text-gray-900">{data.totalDays}</p>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <p className="text-sm text-gray-500">Present</p>
              <p className="text-2xl font-bold text-green-600">{data.present}</p>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <p className="text-sm text-gray-500">Absent</p>
              <p className="text-2xl font-bold text-red-600">{data.absent}</p>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <p className="text-sm text-gray-500">Late</p>
              <p className="text-2xl font-bold text-yellow-600">{data.late}</p>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <p className="text-sm text-gray-500">Excused</p>
              <p className="text-2xl font-bold text-blue-600">{data.excused}</p>
            </div>
          </div>

          {/* Attendance Rate */}
          <div className="rounded-lg border bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Attendance Rate</h3>
              <span className="text-2xl font-bold text-primary">{data.attendanceRate?.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all"
                style={{ width: `${Math.min(data.attendanceRate || 0, 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {data.attendanceRate >= 90 ? 'Excellent attendance!' :
               data.attendanceRate >= 75 ? 'Good attendance.' :
               'Attendance needs improvement.'}
            </p>
          </div>
        </>
      ) : (
        <div className="rounded-lg border bg-white p-8 text-center">
          <GraduationCap className="h-12 w-12 text-gray-300 mx-auto" />
          <p className="mt-4 text-gray-500">No attendance records found.</p>
        </div>
      )}
    </div>
  );
}
