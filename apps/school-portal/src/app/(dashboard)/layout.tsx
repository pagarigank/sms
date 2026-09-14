'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';
import { useAuthStore, useTenantStore } from '@/lib/store';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { ImpersonationBanner } from '@/components/impersonation-banner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
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

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, router]);

  // Defer all data fetching to client-side only.
  // Pages under this layout use react-query (useQuery) which fetches
  // during render — that fails during SSR and triggers a 404.
  // Suppress hydration so Next.js doesn't try to SSR the children.

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
                <main className="flex-1 overflow-y-auto p-6" suppressHydrationWarning>{children}</main>
              </div>
            </div>
          </div>
        </ConfirmProvider>
      </ToastProvider>
    </DashboardProviders>
  );
}
