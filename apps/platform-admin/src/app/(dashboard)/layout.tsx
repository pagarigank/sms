'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Providers } from '@/components/providers';
import { ToastProvider, ConfirmProvider } from '@sms/ui';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { ImpersonationBanner } from '@/components/impersonation-banner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Providers>
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
    </Providers>
  );
}
