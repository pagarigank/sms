'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { AlertTriangle, X } from 'lucide-react';

export function ImpersonationBanner() {
  const [dismissed, setDismissed] = useState(false);

  const { data: grants } = useQuery({
    queryKey: ['impersonation-grants'],
    queryFn: () => apiClient.auth.getActiveGrants(),
    refetchInterval: 30000, // Check every 30 seconds
  });

  const activeGrants = grants?.data ?? [];

  if (dismissed || activeGrants.length === 0) return null;

  return (
    <div
      className="flex items-center justify-between border-b border-[hsl(var(--status-warning-ink))]/20 bg-[hsl(var(--status-warning-surface))] px-4 py-2 text-[hsl(var(--status-warning-ink))]"
      role="status"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <span className="text-sm font-medium">
          Support impersonation active — this session is monitored and logged.
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="rounded p-1 opacity-80 transition-opacity hover:opacity-100"
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
