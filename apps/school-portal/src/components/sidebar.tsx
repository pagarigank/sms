'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { cn, getInitials } from '@sms/utils';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { filterNavigationByPermissions } from '@/lib/permissions';
import {
  LayoutDashboard, Building2, GraduationCap, BookOpen, Users,
  Settings, School, BarChart3, ClipboardList, Users2, UserCog,
  Calendar, BookMarked, DollarSign, Receipt,
  Megaphone, FileText,
} from 'lucide-react';
import { BrandLockup } from '@sms/ui';

const navigation = [
  { name: 'Overview', kind: 'label' as const },
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },

  { name: 'People & Campus', kind: 'label' as const },
  { name: 'SIS', href: '/sis', icon: Users2, children: [
    { name: 'Students', href: '/sis/students' },
    { name: 'Guardians', href: '/sis/guardians' },
    { name: 'Enrollments', href: '/sis/enrollments' },
    { name: 'Promotions', href: '/sis/promotions' },
    { name: 'Sections', href: '/sis/sections' },
    { name: 'Admissions', href: '/sis/admissions' },
  ]},
  { name: 'Facility', href: '/facility', icon: Building2, children: [
    { name: 'Buildings', href: '/facility/buildings' },
    { name: 'Floors', href: '/facility/floors' },
    { name: 'Rooms', href: '/facility/rooms' },
  ]},
  { name: 'Departments', href: '/departments', icon: School },
  { name: 'HR', href: '/hr', icon: UserCog },

  { name: 'Academic', kind: 'label' as const },
  { name: 'Academic Setup', href: '/academic', icon: GraduationCap, children: [
    { name: 'School Years', href: '/academic/school-years' },
    { name: 'Grade Levels', href: '/academic/grade-levels' },
    { name: 'Tracks & Strands', href: '/academic/tracks' },
    { name: 'Programs', href: '/academic/programs' },
    { name: 'Subjects', href: '/academic/subjects' },
    { name: 'Curricula', href: '/academic/curricula' },
  ]},
  { name: 'Scheduling', href: '/scheduling', icon: Calendar, children: [
    { name: 'Timetable', href: '/scheduling/timetable' },
    { name: 'Faculty Load', href: '/scheduling/faculty-load' },
    { name: 'Attendance', href: '/scheduling/attendance' },
  ]},
  { name: 'Gradebook', href: '/scheduling/gradebook', icon: BookMarked },
  { name: 'Grading Config', href: '/grading', icon: BookOpen, children: [
    { name: 'Grading Systems', href: '/grading/systems' },
    { name: 'Grade Components', href: '/grading/components' },
    { name: 'Honor Roll', href: '/grading/honor-roll' },
  ]},

  { name: 'Finance', kind: 'label' as const },
  { name: 'Billing', href: '/billing', icon: DollarSign, children: [
    { name: 'Fee Types', href: '/billing/fee-types' },
    { name: 'Fee Structures', href: '/billing/fee-structures' },
    { name: 'Discounts', href: '/billing/discounts' },
    { name: 'Invoices', href: '/billing/invoices' },
  ]},
  { name: 'Cashiering', href: '/cashiering', icon: Receipt, children: [
    { name: 'Session', href: '/cashiering' },
    { name: 'Payment', href: '/cashiering/payment' },
    { name: 'Ad-Hoc Sale', href: '/cashiering/ad-hoc' },
    { name: 'Reports', href: '/cashiering/reports' },
  ]},

  { name: 'System', kind: 'label' as const },
  { name: 'Communications', href: '/communications', icon: Megaphone, children: [
    { name: 'Announcements', href: '/communications' },
    { name: 'Templates', href: '/communications#templates' },
    { name: 'Messages', href: '/communications#threads' },
  ]},
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Users & Roles', href: '/iam', icon: Users },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const token = useAuthStore((s) => s.token);

  // Effective permission set from GET /auth/me (roles → role_permissions).
  const { data: me } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => apiClient.auth.me(),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
  const permissions = me?.data?.permissions ?? [];

  const visibleNavigation = useMemo(
    () => filterNavigationByPermissions(
      navigation.filter((item) => !('kind' in item)),
      permissions,
    ),
    [permissions],
  );

  // The route-permission map is authoritative: render only what survives
  // filtering. (Previously the map only gated section labels while every link
  // rendered, so a route a user lacked permission for was still shown.)
  const visibleByHref = useMemo(
    () => new Map<string, any>((visibleNavigation as any[]).map((item) => [item.href, item])),
    [visibleNavigation],
  );

  const user = useAuthStore((s) => s.user);
  const displayName = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email : 'User';
  const initials = user ? getInitials(`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email) : 'U';
  const roleName = (user as any)?.roles?.[0]?.name ?? (user as any)?.role ?? 'School Staff';

  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--surface-raised)/0.85)] backdrop-blur-xl">
      <div className="flex h-14 items-center border-b border-[hsl(var(--border))] px-4 bg-[hsl(var(--surface-base)/0.4)]">
        <Link href="/dashboard" className="flex items-center">
          <BrandLockup accent />
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 scrollbar-thin" aria-label="Main navigation">
        {navigation.map((item, idx) => {
          // Section label rows
          if ('kind' in item) {
            const items = visibleNavigation;
            // Only render label if at least one following item in this section is visible
            const nextLabelIdx = navigation.findIndex((n, i) => i > idx && 'kind' in n);
            const sectionHasVisible = items.some((v) => {
              const vIdx = navigation.findIndex((n) => !('kind' in n) && n.name === v.name);
              return vIdx > idx && (nextLabelIdx === -1 || vIdx < nextLabelIdx);
            });
            if (!sectionHasVisible) return null;
            return (
              <p
                key={`label-${item.name}`}
                className="px-3 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--ink-300))]"
              >
                {item.name}
              </p>
            );
          }

          const visibleItem: any = visibleByHref.get(item.href);
          if (!visibleItem) return null;

          const isActive = pathname === item.href || pathname.startsWith(item.href + '/') ||
            (item.children?.some((c) => pathname === c.href.split('#')[0]));

          return (
            <div key={item.name}>
              <Link
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
                <span className="flex-1 truncate">{item.name}</span>
              </Link>
              {visibleItem.children && isActive && (
                <div className="ml-[22px] mt-1 space-y-0.5 border-l border-[hsl(var(--border))] pl-3.5">
                  {visibleItem.children.map((child: { name: string; href: string }) => {
                    const isChildActive = pathname === child.href.split('#')[0];
                    return (
                      <Link
                        key={child.name}
                        href={child.href}
                        className={cn(
                          'block rounded-lg px-2.5 py-1.5 text-xs transition-all duration-150',
                          isChildActive
                            ? 'font-semibold text-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.08)]'
                            : 'text-[hsl(var(--ink-300))] hover:text-[hsl(var(--ink-100))] hover:bg-[hsl(var(--surface-overlay)/0.5)]'
                        )}
                      >
                        {child.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User profile card at bottom */}
      <div className="border-t border-[hsl(var(--border))] p-3 bg-[hsl(var(--surface-base)/0.3)]">
        <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-overlay)/0.4)] p-2.5 backdrop-blur">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl gradient-bg text-xs font-bold text-white shadow-md shadow-[hsl(var(--gradient-from)/0.3)]">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-[hsl(var(--ink-100))]">{displayName}</p>
            <p className="truncate text-[11px] text-[hsl(var(--ink-300))]">{roleName}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// force reload
