'use client';
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Defer auth redirect to client side only, once, after first paint.
  // Avoids a useEffect→setTimeout→router.replace cascade on every navigation.
  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) {
      router.replace('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DashboardProviders>
      <ToastProvider>
        <ConfirmProvider>
          <div className="flex h-screen flex-col bg-background">
            <ImpersonationBanner />
            <div className="flex flex-1 overflow-hidden">
              <Sidebar className="hidden lg:flex" />
              {/* Mobile drawer */}
              {sidebarOpen && (
                <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
                  <div
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                  />
                  <div className="absolute inset-y-0 left-0 shadow-2xl shadow-black/20">
                    <Sidebar onNavigate={() => setSidebarOpen(false)} />
                  </div>
                </div>
              )}
              <div className="flex flex-1 flex-col overflow-hidden">
                <Topbar onOpenMenu={() => setSidebarOpen(true)} />
                <main className="flex-1 overflow-y-auto p-6">
                  {mounted && isAuthenticated ? children : null}
                </main>
              </div>
            </div>
          </div>
        </ConfirmProvider>
      </ToastProvider>
    </DashboardProviders>
  );
}
