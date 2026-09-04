'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@sms/utils';
import {
  LayoutDashboard, Building2, GraduationCap, BookOpen, Users,
  Settings, School, BarChart3, UserCheck, ClipboardList, Users2, UserCog
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Facility', href: '/facility', icon: Building2, children: [
    { name: 'Buildings', href: '/facility/buildings' },
    { name: 'Floors', href: '/facility/floors' },
    { name: 'Rooms', href: '/facility/rooms' },
  ]},
  { name: 'Academic', href: '/academic', icon: GraduationCap, children: [
    { name: 'School Years', href: '/academic/school-years' },
    { name: 'Grade Levels', href: '/academic/grade-levels' },
    { name: 'Tracks & Strands', href: '/academic/tracks' },
    { name: 'Programs', href: '/academic/programs' },
    { name: 'Subjects', href: '/academic/subjects' },
    { name: 'Curricula', href: '/academic/curricula' },
  ]},
  { name: 'SIS', href: '/sis', icon: Users2, children: [
    { name: 'Students', href: '/sis/students' },
    { name: 'Guardians', href: '/sis/guardians' },
    { name: 'Enrollments', href: '/sis/enrollments' },
    { name: 'Sections', href: '/sis/sections' },
    { name: 'Admissions', href: '/sis/admissions' },
  ]},
  { name: 'Grading', href: '/grading', icon: BookOpen, children: [
    { name: 'Grading Systems', href: '/grading/systems' },
    { name: 'Grade Components', href: '/grading/components' },
    { name: 'Honor Roll', href: '/grading/honor-roll' },
  ]},
  { name: 'Departments', href: '/departments', icon: School },
  { name: 'Users & Roles', href: '/iam', icon: Users },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <School className="h-6 w-6" />
          <span className="font-bold">SchoolSuite</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <div key={item.name}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="mr-3 h-4 w-4" />
                {item.name}
              </Link>
              {item.children && isActive && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.children.map((child) => (
                    <Link
                      key={child.name}
                      href={child.href}
                      className={cn(
                        'block rounded-md px-3 py-1.5 text-sm transition-colors',
                        pathname === child.href
                          ? 'bg-muted font-medium text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
