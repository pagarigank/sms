'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';
import { useAuthStore } from '@/lib/store';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { ImpersonationBanner } from '@/components/impersonation-banner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider, ConfirmProvider } from '@sms/ui';

function DashboardProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60000, refetchOnWindowFocus: false } } })
  );
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  // Prevent server/client mismatch: the auth store is only populated on the
  // client (from localStorage). Render a neutral placeholder until after hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      const timer = setTimeout(() => {
        router.replace('/login');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [mounted, isAuthenticated, router]);

  // Before hydration completes: render the same empty shell on both server and client.
  if (!mounted) {
    return <div className="flex h-screen flex-col bg-background" suppressHydrationWarning />;
  }

  // After mount: gate on auth.
  if (!isAuthenticated) return null;

  return (
    <DashboardProviders>
      <ToastProvider>
        <ConfirmProvider>
          <div className="flex h-screen flex-col">
            <ImpersonationBanner />
            <div className="flex flex-1 overflow-hidden">
              <Sidebar />
              <div className="flex flex-1 flex-col overflow-hidden">
                <Topbar />
                <main className="flex-1 overflow-y-auto p-6">{children}</main>
              </div>
            </div>
          </div>
        </ConfirmProvider>
      </ToastProvider>
    </DashboardProviders>
  );
}
