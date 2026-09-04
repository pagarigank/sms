'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Building2, BookOpen, GraduationCap, Users } from 'lucide-react';

export default function DashboardPage() {
  const { data: buildings } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => apiClient.facility.listBuildings(),
  });

  const { data: schoolYears } = useQuery({
    queryKey: ['school-years'],
    queryFn: () => apiClient.academic.listSchoolYears(),
  });

  const { data: curricula } = useQuery({
    queryKey: ['curricula'],
    queryFn: () => apiClient.academic.listCurricula(),
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => apiClient.academic.listSubjects(),
  });

  const stats = [
    { name: 'Buildings', value: buildings?.data?.length ?? 0, icon: Building2 },
    { name: 'School Years', value: schoolYears?.data?.length ?? 0, icon: GraduationCap },
    { name: 'Curricula', value: curricula?.data?.length ?? 0, icon: BookOpen },
    { name: 'Subjects', value: subjects?.data?.length ?? 0, icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">School administration overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
              <stat.icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mt-2 text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Recent School Years</h2>
          <div className="mt-4 space-y-2">
            {schoolYears?.data?.slice(0, 3).map((sy) => (
              <div key={sy.id} className="flex items-center justify-between border-b py-2 last:border-0">
                <span className="font-medium">{sy.name}</span>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                  sy.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>{sy.status}</span>
              </div>
            )) ?? <p className="text-sm text-muted-foreground">No school years yet</p>}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <div className="mt-4 space-y-2">
            <a href="/facility/buildings" className="block rounded-md border p-3 hover:bg-muted">Manage Buildings</a>
            <a href="/academic/school-years" className="block rounded-md border p-3 hover:bg-muted">School Years & Terms</a>
            <a href="/academic/curricula" className="block rounded-md border p-3 hover:bg-muted">Curriculum Builder</a>
            <a href="/grading/systems" className="block rounded-md border p-3 hover:bg-muted">Grading Systems</a>
          </div>
        </div>
      </div>
    </div>
  );
}
