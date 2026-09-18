'use client';

import { useEffect } from 'react';
import { Button } from '@sms/ui';
import { AlertTriangle } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full bg-[hsl(var(--status-danger-surface))] p-4">
        <AlertTriangle className="h-8 w-8 text-[hsl(var(--status-danger-ink))]" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-[hsl(var(--ink-100))]">Something went wrong</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          An unexpected error occurred while rendering this page. Your data is safe — try again, or reload the page.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-muted-foreground/60">Error reference: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}