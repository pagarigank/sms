'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@sms/utils';
import {
  GraduationCap, BookOpen, CreditCard, FileText, MessageSquare,
  LayoutDashboard, ChevronDown
} from 'lucide-react';
import { useStudentStore } from '@/lib/student-store';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
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
    <div className="flex h-full w-64 flex-col border-r bg-white">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="font-bold text-gray-900">SchoolSuite</span>
        </Link>
      </div>

      {/* Student Selector */}
      <div className="border-b px-4 py-3">
        <p className="text-xs text-gray-500 mb-1">Viewing as guardian of</p>
        <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-medium text-primary">
              {selectedStudent ? `${selectedStudent.firstName[0]}${selectedStudent.lastName[0]}` : '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : 'Select student'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {selectedStudent?.studentNumber || 'No student number'}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className="mr-3 h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
