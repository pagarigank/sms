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
    <div className="flex h-full w-64 flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--surface-raised))]">
      <div className="flex h-14 items-center border-b border-[hsl(var(--border))] px-4">
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
                'group relative flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[hsl(var(--accent-subtle))] text-[hsl(var(--accent))]'
                  : 'text-[hsl(var(--ink-200))] hover:bg-[hsl(var(--surface-muted))] hover:text-[hsl(var(--foreground))]'
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-[hsl(var(--accent))]" />
              )}
              <item.icon className="mr-3 h-4 w-4 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[hsl(var(--border))] p-4">
        <button className="flex w-full items-center text-sm text-[hsl(var(--ink-300))] hover:text-[hsl(var(--foreground))] transition-colors">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Collapse
        </button>
      </div>
    </div>
  );
}
