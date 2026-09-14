'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useStudentStore } from '@/lib/student-store';
import { BookOpen, Loader2, AlertTriangle } from 'lucide-react';

interface GradeRow {
  id: string;
  classOfferingId: string;
  subjectName: string;
  componentName: string;
  rawScore: number | null;
  maxScore: number | null;
  percentage: number | null;
  transmutedGrade: number | null;
  isFinalized: boolean;
}

export default function GradesPage() {
  const { selectedStudentId } = useStudentStore();

  const { data: grades, isLoading, error } = useQuery({
    queryKey: ['student-grades', selectedStudentId],
    queryFn: () => apiClient.grading.getStudentGrades({ tenantId: '', studentId: selectedStudentId! }),
    enabled: !!selectedStudentId,
  });

  const gradeList = useMemo(() => (Array.isArray(grades?.data) ? (grades!.data as GradeRow[]) : []), [grades]);

  // Group by class offering (same subject) and compute a simple average
  const grouped = useMemo(() => {
    const map = new Map<string, { subject: string; rows: GradeRow[]; avg: number | null }>();
    for (const g of gradeList) {
      const entry = map.get(g.classOfferingId) ?? { subject: g.subjectName, rows: [], avg: null };
      entry.rows.push(g);
      const finals = entry.rows.map((r) => r.transmutedGrade).filter((v): v is number => v != null);
      entry.avg = finals.length ? finals.reduce((a, b) => a + b, 0) / finals.length : null;
      map.set(g.classOfferingId, entry);
    }
    return Array.from(map.entries());
  }, [gradeList]);

  if (!selectedStudentId) {
    return (
      <div className="flex items-center justify-center p-16">
        <p className="text-gray-500">Select a student to view grades.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Grades</h1>
        <p className="text-gray-500">Academic performance by subject</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Failed to load grades. Please try again later.
        </div>
      ) : gradeList.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto" />
          <p className="mt-4 text-gray-500">No grades available yet.</p>
          <p className="text-sm text-gray-400 mt-1">Grades will appear once the teacher enters them.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([classId, group]) => (
            <div key={classId} className="rounded-lg border bg-white shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{group.subject}</h3>
                {group.avg != null && (
                  <div className="text-right">
                    <span className="text-lg font-bold text-primary">{group.avg.toFixed(0)}</span>
                    <span className="text-xs text-gray-400 ml-1">average</span>
                  </div>
                )}
              </div>
              <div className="divide-y">
                {group.rows.map((entry) => (
                  <div key={entry.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{entry.componentName}</p>
                      <p className="text-xs text-gray-500">
                        {entry.rawScore != null && entry.maxScore != null ? `${entry.rawScore}/${entry.maxScore}` : 'Not yet graded'}
                        {entry.isFinalized ? ' • Final' : ' • Draft'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{entry.transmutedGrade ?? '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
