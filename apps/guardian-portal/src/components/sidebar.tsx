'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@sms/utils';
import {
  GraduationCap, BookOpen, CreditCard, FileText, MessageSquare,
  LayoutDashboard, ChevronDown, CalendarDays
} from 'lucide-react';
import { useStudentStore } from '@/lib/student-store';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Schedule', href: '/schedule', icon: CalendarDays },
  { name: 'Grades', href: '/grades', icon: BookOpen },
  { name: 'Attendance', href: '/attendance', icon: GraduationCap },
  { name: 'Billing', href: '/billing', icon: CreditCard },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Messages', href: '/messages', icon: MessageSquare },
];

export function Sidebar() {
  const pathname = usePathname();
  const { selectedStudentId, students } = useStudentStore();
  const selectedStudent = students.find(s => s.id === selectedStudentId);

  return (
    <div className="flex h-full w-64 flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--surface-raised)/0.85)] backdrop-blur-xl">
      <div className="flex h-14 items-center border-b border-[hsl(var(--border))] px-4 bg-[hsl(var(--surface-base)/0.4)]">
        <Link href="/dashboard" className="flex items-center space-x-2.5">
          <GraduationCap className="h-6 w-6 text-[hsl(var(--accent))]" />
          <span className="font-bold tracking-tight text-[hsl(var(--ink-100))]">SchoolSuite</span>
          <span className="rounded bg-[hsl(var(--accent)/0.1)] px-1.5 py-0.5 text-[10px] font-semibold text-[hsl(var(--accent))]">Guardian</span>
        </Link>
      </div>

      {/* Student Selector Card */}
      <div className="border-b border-[hsl(var(--border))] px-4 py-3.5 bg-[hsl(var(--surface-base)/0.2)]">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[hsl(var(--ink-300))] mb-2">Viewing as guardian of</p>
        <div className="flex items-center gap-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-overlay)/0.6)] p-2.5 backdrop-blur transition-all hover:border-[hsl(var(--accent)/0.4)]">
          <div className="h-8 w-8 rounded-xl gradient-bg flex items-center justify-center text-white shadow-sm shadow-[hsl(var(--gradient-from)/0.2)]">
            <span className="text-xs font-bold">
              {selectedStudent ? `${selectedStudent.firstName[0]}${selectedStudent.lastName[0]}` : '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[hsl(var(--ink-100))] truncate">
              {selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : 'Select student'}
            </p>
            <p className="text-[11px] text-[hsl(var(--ink-300))] truncate font-mono">
              {selectedStudent?.studentNumber || 'No student number'}
            </p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-[hsl(var(--ink-300))]" />
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3" aria-label="Guardian navigation">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group relative flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--ink-100))] shadow-sm shadow-[hsl(var(--accent)/0.1)]'
                  : 'text-[hsl(var(--ink-200))] hover:bg-[hsl(var(--surface-overlay))] hover:text-[hsl(var(--ink-100))]'
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full gradient-bg shadow-sm shadow-[hsl(var(--gradient-from))]" />
              )}
              <item.icon className={cn('mr-3 h-4 w-4 shrink-0 transition-colors', isActive ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--ink-300))] group-hover:text-[hsl(var(--ink-100))]')} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
