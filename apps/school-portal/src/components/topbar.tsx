'use client';

import { useAuthStore, useTenantStore } from '@/lib/store';
import { getInitials } from '@sms/utils';

export function Topbar() {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center space-x-4">
        <span className="text-sm text-muted-foreground">School Administration</span>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            {user ? getInitials(`${user.firstName} ${user.lastName}`) : '?'}
          </div>
          <span className="text-sm font-medium">
            {user ? `${user.firstName} ${user.lastName}` : 'User'}
          </span>
        </div>
        <button onClick={clearAuth} className="text-sm text-muted-foreground hover:text-foreground">
          Sign out
        </button>
      </div>
    </header>
  );
}
