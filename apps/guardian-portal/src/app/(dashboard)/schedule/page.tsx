'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useStudentStore } from '@/lib/student-store';
import { CalendarDays, Clock, Loader2, AlertTriangle, MapPin, User } from 'lucide-react';

interface ScheduleEntry {
  id: string;
  classOfferingId: string;
  sectionId: string | null;
  subjectId: string;
  subjectCode: string | null;
  subjectTitle: string | null;
  roomId: string | null;
  roomName: string | null;
  teacherName: string | null;
  day: string | null;
  startTime: string | null;
  endTime: string | null;
}

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function sortKey(day: string | null) {
  if (!day) return DAY_ORDER.length;
  const idx = DAY_ORDER.findIndex((d) => d.toLowerCase() === day.toLowerCase());
  return idx === -1 ? DAY_ORDER.length : idx;
}

/** '13:30' | '1:30 PM' → sortable minutes; unknown formats sort last. */
function toMinutes(time: string | null): number {
  if (!time) return Number.MAX_SAFE_INTEGER;
  const m = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return Number.MAX_SAFE_INTEGER;
  let hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  const meridiem = m[3]?.toUpperCase();
  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function formatTime(time: string | null) {
  return time ?? '—';
}

export default function SchedulePage() {
  const { selectedStudentId } = useStudentStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ['student-schedule', selectedStudentId],
    queryFn: () => apiClient.scheduling.getStudentSchedule(selectedStudentId!),
    enabled: !!selectedStudentId,
  });

  const entries = useMemo(
    () => (Array.isArray(data?.data) ? (data!.data as ScheduleEntry[]) : []),
    [data],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, ScheduleEntry[]>();
    for (const entry of entries) {
      const key = entry.day ?? 'Unscheduled';
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          toMinutes(a.startTime) - toMinutes(b.startTime) ||
          (a.subjectTitle ?? '').localeCompare(b.subjectTitle ?? ''),
      );
    }
    return Array.from(map.entries()).sort(
      ([a], [b]) => sortKey(a) - sortKey(b) || a.localeCompare(b),
    );
  }, [entries]);

  if (!selectedStudentId) {
    return (
      <div className="flex items-center justify-center p-16">
        <p className="text-gray-500">Select a student to view their schedule.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Schedule</h1>
        <p className="text-gray-500">Weekly class timetable</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Failed to load the schedule. Please try again later.
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center">
          <CalendarDays className="h-12 w-12 text-gray-300 mx-auto" />
          <p className="mt-4 text-gray-500">No schedule available yet.</p>
          <p className="text-sm text-gray-400 mt-1">
            Classes will appear here once the school assigns them.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {byDay.map(([day, list]) => (
            <div key={day} className="rounded-lg border bg-white shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-gray-50 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-gray-900">{day}</h3>
                <span className="text-xs text-gray-400 ml-auto">
                  {list.length} class{list.length === 1 ? '' : 'es'}
                </span>
              </div>
              <div className="divide-y">
                {list.map((entry) => (
                  <div key={entry.id} className="p-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {entry.subjectTitle ?? entry.subjectCode ?? 'Subject'}
                        {entry.subjectCode && entry.subjectTitle && (
                          <span className="text-xs text-gray-400 font-normal ml-2">{entry.subjectCode}</span>
                        )}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
                        </span>
                        {entry.roomName && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {entry.roomName}
                          </span>
                        )}
                        {entry.teacherName && (
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {entry.teacherName}
                          </span>
                        )}
                      </div>
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
