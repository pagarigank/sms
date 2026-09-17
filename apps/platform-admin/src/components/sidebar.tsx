'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@sms/utils';
import {
  LayoutDashboard, Building2, GraduationCap, Users, Shield,
  Settings, ChevronLeft
} from 'lucide-react';
import { BrandLockup } from '@sms/ui';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Tenants', href: '/tenants', icon: Building2 },
  { name: 'Departments', href: '/departments', icon: GraduationCap },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Roles & Permissions', href: '/iam', icon: Shield },
  { name: 'Config Engine', href: '/config', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--surface-raised)/0.85)] backdrop-blur-xl">
      <div className="flex h-14 items-center border-b border-[hsl(var(--border))] px-4 bg-[hsl(var(--surface-base)/0.4)]">
        <Link href="/dashboard" className="flex items-center">
          <BrandLockup className="h-7" />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3" aria-label="Main navigation">
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

      <div className="border-t border-[hsl(var(--border))] p-3.5 bg-[hsl(var(--surface-base)/0.3)]">
        <div className="flex items-center justify-between text-xs text-[hsl(var(--ink-300))]">
          <span>Platform Admin</span>
          <span className="rounded bg-[hsl(var(--surface-overlay))] px-1.5 py-0.5 font-mono text-[10px] text-[hsl(var(--accent))]">v0.1</span>
        </div>
      </div>
    </div>
  );
}
