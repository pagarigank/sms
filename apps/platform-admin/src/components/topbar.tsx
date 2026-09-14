'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { getInitials } from '@sms/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@sms/ui';
import { LogOut } from 'lucide-react';

export function Topbar() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const displayName = user
    ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
    : 'Admin';
  const initials = user
    ? getInitials(`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email)
    : '?';

  const signOut = () => {
    clearAuth();
    router.replace('/login');
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-raised))] px-4 lg:px-6">
      <div className="text-sm font-medium text-[hsl(var(--ink-200))]">
        Platform Administration
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-[hsl(var(--surface-muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]"
              aria-label="Open user menu"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--accent-subtle))] text-sm font-semibold text-[hsl(var(--accent))]">
                {initials}
              </span>
              <span className="hidden text-sm font-medium text-[hsl(var(--foreground))] sm:block">
                {displayName}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">{displayName}</p>
              <p className="text-xs text-[hsl(var(--ink-300))]">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
