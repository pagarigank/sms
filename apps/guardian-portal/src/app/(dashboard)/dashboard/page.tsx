'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useStudentStore } from '@/lib/student-store';
import { getInitials } from '@sms/utils';
import { GraduationCap, BookOpen, CreditCard, FileText, MessageSquare, AlertTriangle } from 'lucide-react';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { students, selectedStudentId, selectStudent } = useStudentStore();
  const selectedStudent = students.find(s => s.id === selectedStudentId);

  // Real thread preview (scoped to the guardian by the backend)
  const { data: threads } = useQuery({
    queryKey: ['message-threads', user?.id],
    queryFn: () => apiClient.communications.getThreads({ tenantId: '', userId: user?.id || '' }),
    enabled: !!user?.id,
  });
  const threadList = (Array.isArray(threads?.data) ? (threads!.data as any[]) : []).slice(0, 3);

  const quickLinks = [
    { name: 'Grades', href: '/grades', icon: BookOpen, description: 'View student grades and report cards' },
    { name: 'Attendance', href: '/attendance', icon: GraduationCap, description: 'Track attendance records' },
    { name: 'Billing', href: '/billing', icon: CreditCard, description: 'View statement of account and pay fees' },
    { name: 'Documents', href: '/documents', icon: FileText, description: 'Request and download documents' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--ink-100))]">
          Welcome back, {user?.firstName || 'Parent'}!
        </h1>
        <p className="text-[hsl(var(--ink-200))]">View your children&apos;s academic information and manage school-related tasks.</p>
      </div>

      {/* No children linked (guardian profile missing or empty) */}
      {students.length === 0 && (
        <div className="rounded-lg border border-[hsl(var(--status-warning-ink))]/20 bg-[hsl(var(--status-warning-surface))] p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" style={{ color: 'hsl(var(--status-warning-ink))' }} />
          <div>
            <p className="font-medium" style={{ color: 'hsl(var(--status-warning-ink))' }}>No children linked to your account</p>
            <p className="text-sm" style={{ color: 'hsl(var(--status-warning-ink))', opacity: 0.85 }}>
              If this is unexpected, contact the registrar so your guardian profile can be linked to your login.
            </p>
          </div>
        </div>
      )}

      {/* Student Selector (if multiple children) */}
      {students.length > 1 && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-medium text-[hsl(var(--ink-200))] mb-3">Your Children</h3>
          <div className="flex gap-3">
            {students.map((student) => (
              <button
                key={student.id}
                onClick={() => selectStudent(student.id)}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                  selectedStudentId === student.id
                    ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent-subtle))]'
                    : 'hover:bg-[hsl(var(--surface-muted))]'
                }`}
              >
                <div className="h-10 w-10 rounded-full bg-[hsl(var(--accent-subtle))] flex items-center justify-center">
                  <span className="text-sm font-medium text-[hsl(var(--accent))]">
                    {getInitials(`${student.firstName} ${student.lastName}`)}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-[hsl(var(--ink-100))]">{student.firstName} {student.lastName}</p>
                  <p className="text-xs text-[hsl(var(--ink-300))]">{student.studentNumber || 'No student number'}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current Student Info */}
      {selectedStudent && (
        <div className="rounded-lg border bg-[hsl(var(--accent-subtle))] p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-[hsl(var(--surface-raised))] flex items-center justify-center">
            <span className="text-lg font-medium text-[hsl(var(--accent))]">
              {getInitials(`${selectedStudent.firstName} ${selectedStudent.lastName}`)}
            </span>
          </div>
          <div>
            <p className="font-semibold text-[hsl(var(--ink-100))]">{selectedStudent.firstName} {selectedStudent.lastName}</p>
            <p className="text-sm text-[hsl(var(--ink-300))]">
              {selectedStudent.studentNumber ? `#${selectedStudent.studentNumber}` : ''}
              {selectedStudent.lrn ? ` • LRN: ${selectedStudent.lrn}` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((link) => (
          <Link key={link.name} href={link.href}
            className="rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
            <link.icon className="h-8 w-8 text-[hsl(var(--accent))]" />
            <h2 className="mt-4 font-semibold text-[hsl(var(--ink-100))]">{link.name}</h2>
            <p className="mt-1 text-sm text-[hsl(var(--ink-200))]">{link.description}</p>
          </Link>
        ))}
      </div>

      {/* Messages Preview */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[hsl(var(--ink-100))]">Recent Messages</h2>
          <Link href="/messages" className="text-sm text-[hsl(var(--accent))] hover:underline">View all →</Link>
        </div>
        {threadList.length === 0 ? (
          <p className="text-[hsl(var(--ink-300))] text-sm">No recent messages. Start a conversation with the school.</p>
        ) : (
          <div className="divide-y">
            {threadList.map((t) => (
              <Link key={t.id} href="/messages" className="flex items-center gap-3 py-2.5 hover:bg-[hsl(var(--surface-muted))] rounded px-1 -mx-1">
                <MessageSquare className="h-4 w-4 text-[hsl(var(--ink-300))] shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[hsl(var(--ink-100))] truncate">{t.subject || 'No subject'}</p>
                </div>
                <span className="text-xs text-[hsl(var(--ink-300))] shrink-0">
                  {new Date(t.updatedAt || t.createdAt).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
