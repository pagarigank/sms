'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore, useAuthStore } from '@/lib/store';
import {
  Building2, BookOpen, GraduationCap, Users, Calendar, DollarSign,
  TrendingUp, Activity, AlertTriangle, Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@sms/ui';
import { Badge } from '@sms/ui';
import { Button } from '@sms/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sms/ui';
import { Skeleton } from '@sms/ui';
import { cn } from '@sms/utils';

interface DashboardStats {
  buildings: number;
  schoolYears: number;
  curricula: number;
  subjects: number;
  totalStudents: number;
  activeStudents: number;
  totalEnrollments: number;
  pendingEnrollments: number;
  totalInvoiced: number;
  totalPaid: number;
  totalBalance: number;
  pendingPayments: number;
  revenueThisMonth: number;
  paymentsToday: number;
  attendanceToday: number;
  attendanceRate: number;
  upcomingEvents: number;
}

interface Branch {
  id: string;
  name: string;
}

interface SchoolYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface Curriculum {
  id: string;
  name?: string;
  status: string;
  educationLevelName?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  eventType: string;
  startDate: string;
  isHoliday: boolean;
  isExamWeek: boolean;
}

interface AuditEvent {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  occurredAt: string;
}

interface QuickAction {
  label: string;
  href: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  bg: string;
}

const peso = (n: number) => `₱${Number(n || 0).toLocaleString()}`;

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const eventColor = (e: CalendarEvent): string =>
  e.isExamWeek || e.eventType === 'exam' ? 'var(--status-danger-surface)'
  : e.isHoliday || e.eventType === 'holiday' ? 'var(--status-warning-surface)'
  : e.eventType === 'meeting' ? 'var(--accent-subtle)'
  : 'var(--status-success-surface)';

const eventInkColor = (e: CalendarEvent): string =>
  e.isExamWeek || e.eventType === 'exam' ? 'var(--status-danger-ink)'
  : e.isHoliday || e.eventType === 'holiday' ? 'var(--status-warning-ink)'
  : e.eventType === 'meeting' ? 'var(--accent)'
  : 'var(--status-success-ink)';

export default function DashboardPage() {
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('month');
  const currentTenantId = useTenantStore((s) => s.currentTenantId);
  const token = useAuthStore((s) => s.token);

  const { data: meRes } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => apiClient.auth.me(),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
  const permissions = meRes?.data?.permissions ?? [];

  const statsQuery = useQuery({
    queryKey: ['dashboard-stats', selectedBranch, timeRange],
    queryFn: () =>
      apiClient.reporting.getDashboardStats({
        tenantId: currentTenantId ?? '',
        branchId: selectedBranch === 'all' ? undefined : selectedBranch,
        range: timeRange,
      }),
    enabled: !!currentTenantId,
  });

  const branchesQuery = useQuery({
    queryKey: ['branches', 'all', currentTenantId],
    queryFn: () => apiClient.branches.list({ limit: 100 }),
    enabled: !!currentTenantId && permissions.includes('tenancy.branch:view'),
  });

  const schoolYearsQuery = useQuery({
    queryKey: ['school-years', 'dashboard', currentTenantId],
    queryFn: () => apiClient.academic.listSchoolYears({ limit: 10 }),
    enabled: !!currentTenantId && permissions.includes('academic.school_year:view'),
  });

  const curriculaQuery = useQuery({
    queryKey: ['curricula', 'dashboard', currentTenantId],
    queryFn: () => apiClient.academic.listCurricula({ limit: 10 }),
    enabled: !!currentTenantId && permissions.includes('academic.curriculum:view'),
  });

  // Upcoming events: resolve the first calendar, then its events.
  const calendarsQuery = useQuery({
    queryKey: ['calendars', 'dashboard', currentTenantId],
    queryFn: () => apiClient.scheduling.listCalendars({ tenantId: currentTenantId ?? '' }),
    enabled: !!currentTenantId && permissions.includes('scheduling.timetable:view'),
  });
  const firstCalendarId = (calendarsQuery.data?.data as unknown as { id: string }[] | undefined)?.[0]?.id;
  const eventsQuery = useQuery({
    queryKey: ['calendar-events', firstCalendarId],
    queryFn: () => apiClient.scheduling.getCalendarEvents(firstCalendarId!),
    enabled: !!firstCalendarId,
  });

  // Recent activity from the audit trail (real events, not mock data).
  const auditQuery = useQuery({
    queryKey: ['audit-events', 'dashboard', currentTenantId],
    queryFn: () => apiClient.config.listAuditEvents({ tenantId: currentTenantId ?? undefined }),
    enabled: !!currentTenantId && permissions.includes('config.audit_log:view'),
  });

  const isLoading = statsQuery.isLoading;
  const hasError = statsQuery.isError;

  const branches: Branch[] = branchesQuery.data?.data?.data ?? [];
  const stats: DashboardStats = (statsQuery.data?.data as DashboardStats | undefined) ?? {
    buildings: 0, schoolYears: 0, curricula: 0, subjects: 0,
    totalStudents: 0, activeStudents: 0, totalEnrollments: 0, pendingEnrollments: 0,
    totalInvoiced: 0, totalPaid: 0, totalBalance: 0, pendingPayments: 0,
    revenueThisMonth: 0, paymentsToday: 0, attendanceToday: 0, attendanceRate: 0,
    upcomingEvents: 0,
  };
  const recentSchoolYears: SchoolYear[] = (schoolYearsQuery.data?.data as unknown as SchoolYear[] | undefined)?.slice(0, 5) ?? [];
  const recentCurricula: Curriculum[] = (curriculaQuery.data?.data as unknown as Curriculum[] | undefined)?.slice(0, 5) ?? [];
  const upcomingEvents: CalendarEvent[] = (eventsQuery.data?.data as unknown as CalendarEvent[] | undefined)?.slice(0, 5) ?? [];
  const activities: AuditEvent[] = (auditQuery.data?.data as unknown as AuditEvent[] | undefined) ?? [];

  const quickActions: QuickAction[] = [
    { label: 'Add Building', href: '/facility/buildings', icon: <Building2 className="h-5 w-5" />, description: 'Manage campus facilities', color: 'var(--accent)', bg: 'var(--accent-subtle)' },
    { label: 'School Years', href: '/academic/school-years', icon: <Calendar className="h-5 w-5" />, description: 'Configure academic calendar', color: 'var(--secondary)', bg: 'var(--secondary-subtle)' },
    { label: 'Curriculum Builder', href: '/academic/curricula', icon: <BookOpen className="h-5 w-5" />, description: 'Build curriculum structures', color: 'var(--status-success-ink)', bg: 'var(--status-success-surface)' },
    { label: 'Students', href: '/sis/students', icon: <Users className="h-5 w-5" />, description: 'Manage student records', color: 'var(--status-info-ink)', bg: 'var(--status-info-surface)' },
    { label: 'Enrollments', href: '/sis/enrollments', icon: <GraduationCap className="h-5 w-5" />, description: 'Process new enrollments', color: 'var(--status-warning-ink)', bg: 'var(--status-warning-surface)' },
    { label: 'Fee Structures', href: '/billing/fee-structures', icon: <DollarSign className="h-5 w-5" />, description: 'Configure fee packages', color: 'var(--status-success-ink)', bg: 'var(--status-success-surface)' },
    { label: 'Cashiering', href: '/cashiering', icon: <Activity className="h-5 w-5" />, description: 'Process payments', color: 'var(--secondary)', bg: 'var(--secondary-subtle)' },
    { label: 'Timetable', href: '/scheduling/timetable', icon: <Clock className="h-5 w-5" />, description: 'Build class schedules', color: 'var(--accent)', bg: 'var(--accent-subtle)' },
  ];

  const statCards = [
    { name: 'Buildings', value: String(stats.buildings), icon: Building2, color: 'var(--accent)', bg: 'var(--accent-subtle)', trendLabel: 'campus facilities' },
    { name: 'Active Students', value: stats.activeStudents.toLocaleString(), icon: Users, color: 'var(--secondary)', bg: 'var(--secondary-subtle)', trendLabel: `${stats.totalStudents.toLocaleString()} enrolled total` },
    { name: 'Revenue', value: peso(stats.revenueThisMonth), icon: DollarSign, color: 'var(--status-success-ink)', bg: 'var(--status-success-surface)', trendLabel: 'collected this period' },
    { name: 'Attendance Rate', value: `${stats.attendanceRate}%`, icon: Activity, color: 'var(--status-success-ink)', bg: 'var(--status-success-surface)', trendLabel: `${stats.attendanceToday} records today` },
    { name: 'Pending Enrollments', value: String(stats.pendingEnrollments), icon: GraduationCap, color: 'var(--status-warning-ink)', bg: 'var(--status-warning-surface)', trendLabel: 'awaiting processing' },
    { name: 'Outstanding Balance', value: peso(stats.totalBalance), icon: AlertTriangle, color: 'var(--status-danger-ink)', bg: 'var(--status-danger-surface)', trendLabel: `${stats.pendingPayments} open invoices` },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Branch Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>            <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--ink-100))]">Dashboard</h1>
          <p className="text-[hsl(var(--ink-300))]">Branch administration overview</p>
        </div>
        <div className="flex items-center gap-4">
          {permissions.includes('tenancy.branch:view') && (
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error state */}
      {hasError && (
        <Card className="border-[hsl(var(--status-danger-surface))] bg-[hsl(var(--status-danger-surface))]">
          <CardContent className="p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[hsl(var(--status-danger-surface))] flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" style={{ color: 'var(--status-danger-ink)' }} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[hsl(var(--status-danger-ink))]">Couldn&apos;t load dashboard data</h3>
              <p className="text-sm text-[hsl(var(--status-danger-ink))]">
                {statsQuery.error instanceof Error ? statsQuery.error.message : 'An unexpected error occurred.'}
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => statsQuery.refetch()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6 space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-3 w-28" />
                </CardContent>
              </Card>
            ))
          : statCards.map((stat) => (
              <Card key={stat.name} className="transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--ink-300))]">{stat.name}</p>
                      <p className="mt-1 text-2xl font-bold text-[hsl(var(--ink-100))]">{stat.value}</p>
                      <div className="mt-2 flex items-center gap-1 text-sm">
                        <span className="text-[hsl(var(--ink-300))]">{stat.trendLabel}</span>
                      </div>
                    </div>
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `hsl(${stat.bg})` }}
                    >
                      <stat.icon className="h-6 w-6" style={{ color: `hsl(${stat.color})` }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Alerts (derived from real data) */}
      {!isLoading && (stats.pendingEnrollments > 0 || stats.pendingPayments > 0 || stats.upcomingEvents > 0) && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className={cn('border-[hsl(var(--status-warning-surface))] bg-[hsl(var(--status-warning-surface))]', stats.pendingEnrollments === 0 && 'hidden')}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(var(--status-warning-surface))] flex items-center justify-center shrink-0">
                  <GraduationCap className="h-5 w-5" style={{ color: 'var(--status-warning-ink)' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[hsl(var(--status-warning-ink))]">Pending Enrollments</h3>
                  <p className="text-sm text-[hsl(var(--status-warning-ink))]">{stats.pendingEnrollments} enrollment(s) awaiting processing</p>
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <Link href="/sis/enrollments">Review Now</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={cn('border-[hsl(var(--status-danger-surface))] bg-[hsl(var(--status-danger-surface))]', stats.pendingPayments === 0 && 'hidden')}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(var(--status-danger-surface))] flex items-center justify-center shrink-0">
                  <DollarSign className="h-5 w-5" style={{ color: 'var(--status-danger-ink)' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[hsl(var(--status-danger-ink))]">Outstanding Payments</h3>
                  <p className="text-sm text-[hsl(var(--status-danger-ink))]">{peso(stats.totalBalance)} across {stats.pendingPayments} open invoice(s)</p>
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <Link href="/reports/revenue">View AR Aging</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={cn('border-[hsl(var(--status-info-surface))] bg-[hsl(var(--status-info-surface))]', stats.upcomingEvents === 0 && 'hidden')}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(var(--status-info-surface))] flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5" style={{ color: 'var(--status-info-ink)' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[hsl(var(--status-info-ink))]">Upcoming Events</h3>
                  <p className="text-sm text-[hsl(var(--status-info-ink))]">{stats.upcomingEvents} event(s) in the next 14 days</p>
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <Link href="/scheduling/timetable">View Calendar</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Recent School Years & Curricula */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>School Years</CardTitle>
                  <p className="text-sm text-[hsl(var(--ink-300))]">Academic year management</p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/academic/school-years">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {schoolYearsQuery.isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
                ) : recentSchoolYears.length > 0 ? (
                  recentSchoolYears.map((sy) => (
                    <div key={sy.id} className="flex items-center justify-between border-b py-3 last:border-0">
                      <div>
                        <p className="font-medium text-[hsl(var(--ink-100))]">{sy.name}</p>
                        <p className="text-sm text-[hsl(var(--ink-300))]">
                          {sy.startDate ? new Date(sy.startDate).toLocaleDateString() : '—'} - {sy.endDate ? new Date(sy.endDate).toLocaleDateString() : '—'}
                        </p>
                      </div>
                      <Badge variant={
                        sy.status === 'active' ? 'default' :
                        sy.status === 'upcoming' ? 'secondary' : 'outline'
                      }>
                        {sy.status ? sy.status.charAt(0).toUpperCase() + sy.status.slice(1) : 'Unknown'}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-[hsl(var(--ink-300))]">No school years configured yet</p>
                    <Button variant="outline" size="sm" className="mt-3" asChild>
                      <Link href="/academic/school-years">Create your first school year</Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Curricula</CardTitle>
                  <p className="text-sm text-[hsl(var(--ink-300))]">Curriculum management</p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/academic/curricula">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {curriculaQuery.isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
                ) : recentCurricula.length > 0 ? (
                  recentCurricula.map((curr) => (
                    <div key={curr.id} className="flex items-center justify-between border-b py-3 last:border-0">
                      <div>
                        <p className="font-medium text-[hsl(var(--ink-100))]">{curr.name ?? 'Untitled curriculum'}</p>
                        <p className="text-sm text-[hsl(var(--ink-300))]">{curr.educationLevelName ?? '—'}</p>
                      </div>
                      <Badge variant={
                        curr.status === 'active' ? 'default' :
                        curr.status === 'draft' ? 'secondary' : 'outline'
                      }>
                        {curr.status ? curr.status.charAt(0).toUpperCase() + curr.status.slice(1) : 'Unknown'}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-[hsl(var(--ink-300))]">No curricula configured yet</p>
                    <Button variant="outline" size="sm" className="mt-3" asChild>
                      <Link href="/academic/curricula">Create your first curriculum</Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-[hsl(var(--ink-100))]">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className="h-auto flex-col items-start justify-center gap-2.5 text-left p-4 hover:shadow-md transition-shadow"
                asChild
              >
                <Link href={action.href}>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `hsl(${action.bg})` }}
                  >
                    <span style={{ color: `hsl(${action.color})` }} className="flex">{action.icon}</span>
                  </div>
                  <span className="font-medium text-[hsl(var(--ink-100))]">{action.label}</span>
                  <p className="text-xs text-[hsl(var(--ink-300))]">{action.description}</p>
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Activity & Events */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Events (real calendar data) */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {eventsQuery.isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              ) : upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                    <div
                      className="w-14 h-14 rounded-xl flex flex-col items-center justify-center text-center shrink-0"
                      style={{ backgroundColor: `hsl(${eventColor(event)})` }}
                    >
                      <span className="text-sm font-semibold" style={{ color: `hsl(${eventInkColor(event)})` }}>{new Date(event.startDate).getDate()}</span>
                      <span className="text-xs font-medium" style={{ color: `hsl(${eventInkColor(event)})` }}>
                        {new Date(event.startDate).toLocaleDateString(undefined, { month: 'short' })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[hsl(var(--ink-100))] truncate">{event.title}</p>
                      <p className="text-xs text-[hsl(var(--ink-300))] capitalize">{event.eventType.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[hsl(var(--ink-300))] text-center py-8">No upcoming events in the next 14 days</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity (real audit trail) */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {auditQuery.isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
              ) : activities.length > 0 ? (
                activities.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg bg-[hsl(var(--surface-muted))]/40">
                    <div className="w-8 h-8 rounded-full bg-[hsl(var(--accent-subtle))] flex items-center justify-center shrink-0">
                      <TrendingUp className="h-4 w-4" style={{ color: 'var(--accent-ink)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[hsl(var(--ink-100))] capitalize">
                        {activity.action} {activity.entityType.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-[hsl(var(--ink-300))] truncate">{activity.entityId}</p>
                    </div>
                    <span className="text-xs text-[hsl(var(--ink-300))] whitespace-nowrap">
                      {relativeTime(activity.occurredAt)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-[hsl(var(--ink-300))] text-center py-8">No recent activity recorded</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
