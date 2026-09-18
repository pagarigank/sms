'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import {
  BarChart3, Users, DollarSign, GraduationCap, TrendingUp,
  AlertCircle, Calendar, FileText, ArrowRight
} from 'lucide-react';
import { PageHeader } from '@sms/ui';

export default function ReportsPage() {
  const { currentTenantId, currentBranchId } = useTenantStore();

  const { data: dashboard, isLoading, isError } = useQuery({
    queryKey: ['dashboard-stats', currentTenantId, currentBranchId],
    queryFn: () => apiClient.reporting.getDashboardStats({
      tenantId: currentTenantId!,
      branchId: currentBranchId ?? undefined,
    }),
    enabled: !!currentTenantId,
  });

  const stats = (dashboard?.data as any) ?? null;

  const reportCategories = [
    {
      title: 'Enrollment',
      icon: Users,
      color: 'bg-blue-500',
      reports: [
        { name: 'Enrollment Summary', href: '/reports/enrollment', description: 'Total enrollments by status and grade level' },
        { name: 'Learner Movement', href: '/reports/learner-movement', description: 'Promotions, retentions, and graduations' },
      ],
    },
    {
      title: 'Financial',
      icon: DollarSign,
      color: 'bg-green-500',
      reports: [
        { name: 'Revenue Report', href: '/reports/revenue', description: 'Revenue by payment method and daily trend' },
        { name: 'AR Aging', href: '/reports/ar-aging', description: 'Outstanding balances by age bracket' },
        { name: 'Discount Utilization', href: '/reports/discounts', description: 'Scholarship and discount usage' },
      ],
    },
    {
      title: 'Academic',
      icon: GraduationCap,
      color: 'bg-purple-500',
      reports: [
        { name: 'Attendance (per student)', href: '/scheduling/attendance', description: 'Record and review class attendance' },
      ],
    },
    {
      title: 'Operations',
      icon: BarChart3,
      color: 'bg-orange-500',
      reports: [
        { name: 'Cashier Collections', href: '/cashiering/reports', description: 'Daily collection by payment method' },
        { name: 'Scheduled Reports', href: '/reports/scheduled', description: 'Recurring report summaries by email' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" description="Operational dashboards and regulatory reports" />

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" />
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <p className="mt-4 font-medium">Failed to load dashboard stats</p>
          <p className="text-sm text-muted-foreground">The Reports hub is still available — select a report below.</p>
        </div>
      ) : stats ? (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <p className="text-sm text-muted-foreground">Students</p>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.students?.active?.toLocaleString() ?? 0}</p>
              <p className="text-xs text-muted-foreground">of {stats.students?.total?.toLocaleString() ?? 0} total</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                <p className="text-sm text-muted-foreground">Total Collected</p>
              </div>
              <p className="text-2xl font-bold mt-1">₱{stats.financial?.totalPaid?.toLocaleString() ?? 0}</p>
              <p className="text-xs text-muted-foreground">of ₱{stats.financial?.totalInvoiced?.toLocaleString() ?? 0} invoiced</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className={`h-5 w-5 ${(stats.financial?.totalBalance || 0) > 0 ? 'text-red-500' : 'text-green-500'}`} />
                <p className="text-sm text-muted-foreground">Outstanding Balance</p>
              </div>
              <p className={`text-2xl font-bold mt-1 ${(stats.financial?.totalBalance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ₱{stats.financial?.totalBalance?.toLocaleString() ?? 0}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-500" />
                <p className="text-sm text-muted-foreground">Today&apos;s Payments</p>
              </div>
              <p className="text-2xl font-bold mt-1">₱{stats.payments?.today?.toLocaleString() ?? 0}</p>
              <p className="text-xs text-muted-foreground">{stats.attendance?.today ?? 0} attendance records</p>
            </div>
          </div>

          {/* Report Categories */}
          <div className="grid gap-6 md:grid-cols-2">
            {reportCategories.map((category) => (
              <div key={category.title} className="rounded-lg border bg-card shadow-sm overflow-hidden">
                <div className="p-4 border-b flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-lg ${category.color} flex items-center justify-center`}>
                    <category.icon className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="font-semibold">{category.title}</h3>
                </div>
                <div className="divide-y">
                  {category.reports.map((report) => (
                    <Link
                      key={report.name}
                      href={report.href}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">{report.name}</p>
                        <p className="text-xs text-muted-foreground">{report.description}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-lg border bg-card p-8 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="mt-4 text-muted-foreground">No data available. Dashboard will populate as data is entered.</p>
        </div>
      )}
    </div>
  );
}
