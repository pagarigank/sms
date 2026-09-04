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
    <div className="bg-yellow-500 text-white px-4 py-2 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <AlertTriangle className="h-5 w-5" />
        <span className="text-sm font-medium">
          Support impersonation active — Session is being monitored and logged.
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-white/80 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
