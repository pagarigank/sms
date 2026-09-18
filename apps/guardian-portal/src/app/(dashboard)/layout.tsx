'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store';
import { useStudentStore } from '@/lib/student-store';
import { apiClient } from '@/lib/api';
import { Sidebar } from '@/components/sidebar';

// Dashboard pages (dashboard, messages, etc.) call useQuery — the provider
// must live above them or Next.js throws "No QueryClient set".
const queryClient = new QueryClient();

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const { setStudents } = useStudentStore();

  // Prevent server/client hydration mismatch — auth store is client-only (localStorage).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;

    if (!token) {
      router.push('/login');
      return;
    }

    // Fetch ONLY the guardian's children (siblings) via the guardian-scoped
    // endpoint. The previous implementation listed all tenant students —
    // a privacy leak. The backend resolves children from the JWT.
    async function loadStudents() {
      try {
        const result = await apiClient.sis.listMyChildren();
        const studentList = (result.data as any[]) ?? [];
        setStudents(studentList.map(s => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          studentNumber: s.studentNumber,
          lrn: s.lrn,
          branchId: s.branchId,
        })));
      } catch {
        // 403 = not a guardian profile; leave students empty — the pages
        // show a clear "no children linked" state.
        setStudents([]);
      }
    }

    loadStudents();
  }, [mounted, token, router, setStudents]);

  if (!mounted) {
    return <div className="flex h-screen bg-background" suppressHydrationWarning />;
  }

  if (!token) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </QueryClientProvider>
  );
}
