'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Building2, Users, GraduationCap, Activity } from 'lucide-react';

export default function DashboardPage() {
  const { data: tenantsRes } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => apiClient.tenants.list({ limit: 100 }),
  });

  const tenants = tenantsRes?.data ?? [];
  const stats = [
    { name: 'Total Tenants', value: tenants.length, icon: Building2, color: 'bg-blue-500' },
    { name: 'Active Tenants', value: tenants.filter((t) => t.status === 'active').length, icon: Activity, color: 'bg-green-500' },
    { name: 'Platform Users', value: '—', icon: Users, color: 'bg-purple-500' },
    { name: 'Total Branches', value: '—', icon: GraduationCap, color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and key metrics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
              <div className={`rounded-full p-2 ${stat.color}`}>
                <stat.icon className="h-4 w-4 text-white" />
              </div>
            </div>
            <p className="mt-2 text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Recent Tenants</h2>
        <div className="mt-4">
          {tenants.slice(0, 5).map((tenant) => (
            <div key={tenant.id} className="flex items-center justify-between border-b py-3 last:border-0">
              <div>
                <p className="font-medium">{tenant.name}</p>
                <p className="text-sm text-muted-foreground">{tenant.slug}</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                tenant.status === 'active' ? 'bg-green-100 text-green-800' :
                tenant.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {tenant.status}
              </span>
            </div>
          ))}
          {tenants.length === 0 && (
            <p className="text-sm text-muted-foreground">No tenants yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
