'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useStudentStore } from '@/lib/student-store';
import { apiClient } from '@/lib/api';
import { Sidebar } from '@/components/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const { setStudents } = useStudentStore();

  useEffect(() => {
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
        })));
      } catch {
        // 403 = not a guardian profile; leave students empty — the pages
        // show a clear "no children linked" state.
        setStudents([]);
      }
    }

    loadStudents();
  }, [token, router, setStudents]);

  if (!token) return null;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
