'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore, useTenantStore } from '@/lib/store';
import { getInitials } from '@sms/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@sms/ui';
import { TenantSwitcher } from './tenant-switcher';
import { LogOut, UserRound, ShieldCheck } from 'lucide-react';

export function Topbar() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const currentTenantId = useTenantStore((s) => s.currentTenantId);

  const displayName = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email : 'User';
  const initials = user ? getInitials(`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email) : '?';

  const signOut = () => {
    clearAuth();
    router.replace('/login');
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-raised)/0.8)] backdrop-blur-xl px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <TenantSwitcher />
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition-all duration-150 hover:bg-[hsl(var(--surface-overlay))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent)/0.5)] group"
              aria-label="Open user menu"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full gradient-bg text-xs font-bold text-white shadow-md shadow-[hsl(var(--gradient-from)/0.25)] ring-2 ring-[hsl(var(--border))] group-hover:ring-[hsl(var(--accent))] transition-all">
                {initials}
              </span>
              <span className="hidden text-xs font-semibold text-[hsl(var(--ink-100))] sm:block">{displayName}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-semibold text-[hsl(var(--ink-100))]">{displayName}</p>
              <p className="text-xs text-[hsl(var(--ink-300))]">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {currentTenantId && (
              <DropdownMenuLabel className="font-normal">
                <p className="flex items-center gap-1.5 text-xs text-[hsl(var(--ink-300))]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />
                  Tenant context active
                </p>
              </DropdownMenuLabel>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="cursor-pointer text-[hsl(var(--status-danger-ink))] focus:text-[hsl(var(--status-danger-ink))] focus:bg-[hsl(var(--status-danger-surface))]">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
