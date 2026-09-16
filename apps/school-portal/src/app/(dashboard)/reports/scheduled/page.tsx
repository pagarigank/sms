'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import {
  useToast,
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  statusToVariant,
} from '@sms/ui';
import { CalendarClock, Play, Plus, Power, RefreshCw } from 'lucide-react';

interface ScheduledReport {
  id: string;
  reportTemplateId: string;
  name: string;
  frequency: string;
  recipients: string[];
  isActive: boolean;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  createdBy: string | null;
}

interface ReportTemplate {
  id: string;
  name: string;
  reportType: string;
}

const FREQUENCIES = ['daily', 'weekly', 'monthly'] as const;

function lastRunLabel(iso: string | null) {
  if (!iso) return 'Never';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ScheduledReportsPage() {
  const { currentTenantId } = useTenantStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [frequency, setFrequency] = useState<string>('');
  const [recipients, setRecipients] = useState('');

  const { data: subs, isLoading } = useQuery({
    queryKey: ['scheduled-reports', currentTenantId],
    queryFn: () => apiClient.reporting.getScheduledReports({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });

  const { data: templates } = useQuery({
    queryKey: ['report-templates', currentTenantId],
    queryFn: () => apiClient.reporting.getReportTemplates({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });

  const subList = useMemo(
    () => (Array.isArray(subs?.data) ? (subs!.data as ScheduledReport[]) : []),
    [subs],
  );
  const templateList = useMemo(
    () => (Array.isArray(templates?.data) ? (templates!.data as ReportTemplate[]) : []),
    [templates],
  );
  const templateName = (id: string) =>
    templateList.find((t) => t.id === id)?.name ?? (id === 'ar-aging' ? 'AR Aging (built-in)' : id);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });

  const createSub = useMutation({
    mutationFn: () =>
      apiClient.reporting.createScheduledReport({
        name,
        reportTemplateId: templateId,
        frequency,
        recipients: recipients
          .split(/[,;\s]+/)
          .map((r) => r.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      toast({ title: 'Scheduled report created', description: `${name} will run ${frequency}.` });
      setCreateOpen(false);
      setName('');
      setTemplateId('');
      setFrequency('');
      setRecipients('');
      invalidate();
    },
    onError: () => toast({ title: 'Could not create the scheduled report', variant: 'destructive' }),
  });

  const toggleSub = useMutation({
    mutationFn: (sub: ScheduledReport) =>
      apiClient.reporting.toggleScheduledReport(sub.id, { isActive: !sub.isActive }),
    onSuccess: invalidate,
    onError: () => toast({ title: 'Could not update the subscription', variant: 'destructive' }),
  });

  const runNow = useMutation({
    mutationFn: (sub: ScheduledReport) => apiClient.reporting.runScheduledReport(sub.id),
    onSuccess: (res) => {
      const r = (res.data as any) ?? {};
      toast({
        title: `Report sent (${r.dispatched ?? 0} notification${(r.dispatched ?? 0) === 1 ? '' : 's'})`,
        description: r.summary ?? undefined,
      });
      invalidate();
    },
    onError: () => toast({ title: 'Run failed — check the report template', variant: 'destructive' }),
  });

  const canCreate = name.trim() && templateId && FREQUENCIES.includes(frequency as any) && recipients.trim();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scheduled Reports</h1>
          <p className="text-muted-foreground">
            Recurring report summaries delivered to subscriber inboxes
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New subscription
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : subList.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <CalendarClock className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="mt-4 text-muted-foreground">No scheduled reports yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create a subscription to receive recurring report summaries by email.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card shadow-sm divide-y">
          {subList.map((sub) => (
            <div key={sub.id} className="p-4 flex flex-wrap items-center gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{sub.name}</p>
                  <Badge variant={statusToVariant(sub.isActive ? 'active' : 'inactive')}>
                    {sub.isActive ? 'Active' : 'Paused'}
                  </Badge>
                  {sub.lastRunStatus && (
                    <Badge variant={sub.lastRunStatus === 'success' ? 'success' : 'destructive'}>
                      last run: {sub.lastRunStatus}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {templateName(sub.reportTemplateId)} • {sub.frequency} • to {sub.recipients.join(', ')}
                </p>
                <p className="text-xs text-muted-foreground">Last run: {lastRunLabel(sub.lastRunAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => runNow.mutate(sub)} disabled={runNow.isPending}>
                  <Play className="h-4 w-4 mr-1" /> Run now
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSub.mutate(sub)}
                  disabled={toggleSub.isPending}
                >
                  <Power className="h-4 w-4 mr-1" /> {sub.isActive ? 'Pause' : 'Resume'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New scheduled report</DialogTitle>
            <DialogDescription>
              A summary notification is sent to each recipient on the chosen cadence. Recipients
              must have an active <code>scheduled_report</code> notification rule for their tenant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sr-name">Name</Label>
              <Input
                id="sr-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Weekly AR aging digest"
              />
            </div>
            <div>
              <Label>Report</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a report template" />
                </SelectTrigger>
                <SelectContent>
                  {templateList.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue placeholder="How often to run" />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sr-recipients">Recipients</Label>
              <Input
                id="sr-recipients"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="registrar@school.ph, principal@school.ph"
              />
              <p className="text-xs text-muted-foreground mt-1">Comma-separated email addresses.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => createSub.mutate()} disabled={!canCreate || createSub.isPending}>
              {createSub.isPending ? 'Creating…' : 'Create subscription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
