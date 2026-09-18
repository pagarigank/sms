'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { Badge, Button, Card, PageHeader, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useToast } from '@sms/ui';
import { ArrowLeft, GraduationCap, Mail, Phone, MapPin, CalendarDays, School, User, AlertTriangle } from 'lucide-react';

const SOURCE_LABELS: Record<string, string> = {
  'online-form': 'Online Form',
  walkin: 'Walk-in',
  referral: 'Referral',
};

function formatSource(source?: string): string {
  if (!source) return 'Manual';
  return SOURCE_LABELS[source] ?? source;
}

function formatDate(value?: string | Date | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ApplicantDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { currentTenantId } = useTenantStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [notesTouched, setNotesTouched] = useState(false);

  const { data: stagesRes } = useQuery({
    queryKey: ['admissions-stages', currentTenantId],
    queryFn: () => apiClient.admissions.getStages({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });

  const { data: applicantRes, isLoading } = useQuery({
    queryKey: ['applicant', id],
    queryFn: () => apiClient.admissions.getApplicant(id),
  });

  const applicant = (applicantRes as any)?.data ?? null;
  const stages = ((stagesRes as any)?.data ?? []) as { id: string; stageName: string; stageCode: string; isActive: boolean }[];

  useEffect(() => {
    if (applicant?.notes) {
      setNotes(applicant.notes);
      setNotesTouched(false);
    }
  }, [applicant?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['applicant', id] });
    queryClient.invalidateQueries({ queryKey: ['pipeline', currentTenantId] });
  };

  const moveStage = useMutation({
    mutationFn: (stageId: string) => apiClient.admissions.moveApplicantStage(id, stageId),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Stage updated', description: 'Applicant moved to the selected stage.' });
    },
    onError: (error: Error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const convert = useMutation({
    mutationFn: () => apiClient.admissions.convertApplicant(id),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Student created', description: 'Applicant converted to an enrolled student.' });
    },
    onError: (error: Error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const saveNotes = useMutation({
    mutationFn: () => apiClient.admissions.updateApplicant(id, { notes }),
    onSuccess: () => {
      setNotesTouched(false);
      invalidate();
      toast({ title: 'Notes saved', description: 'Applicant notes have been updated.' });
    },
    onError: (error: Error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const isConvertible = applicant?.status === 'accepted' || applicant?.status === 'admitted';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" />
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="space-y-4 p-8">
        <p className="text-muted-foreground">Applicant not found.</p>
        <Button variant="outline" asChild>
          <Link href="/sis/admissions">
            <ArrowLeft className="h-4 w-4" /> Back to Pipeline
          </Link>
        </Button>
      </div>
    );
  }

  const initials = `${applicant.firstName?.charAt(0) ?? ''}${applicant.lastName?.charAt(0) ?? ''}`;

  const infoRows = [
    { icon: Mail, label: 'Email', value: applicant.email },
    { icon: Phone, label: 'Phone', value: applicant.phone },
    { icon: MapPin, label: 'Address', value: applicant.address },
    { icon: CalendarDays, label: 'Date of Birth', value: formatDate(applicant.birthDate) },
    { icon: User, label: 'Gender', value: applicant.gender },
    { icon: School, label: 'Previous School', value: applicant.previousSchool },
  ].filter((row) => row.value);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/sis/admissions">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <PageHeader title="Applicant Profile" description="View and manage this applicant through the admissions pipeline." />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile card */}
        <Card className="p-6 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 mb-4">
              <span className="text-2xl font-bold text-primary">{initials}</span>
            </div>
            <h2 className="text-lg font-bold">
              {applicant.firstName} {applicant.middleName ? `${applicant.middleName} ` : ''}{applicant.lastName}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">Grade {applicant.gradeLevelAppliedFor || 'Unset'}</p>
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              <Badge variant="secondary">{formatSource(applicant.source)}</Badge>
              <Badge variant="outline">{applicant.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Applied {formatDate(applicant.createdAt)}</p>
          </div>

          <div className="mt-6 border-t pt-4 space-y-2">
            <Select
              value={applicant.stageId ?? undefined}
              onValueChange={(val) => moveStage.mutate(val)}
              disabled={moveStage.isPending}
            >
              <SelectTrigger aria-label="Move applicant to another stage" className="w-full">
                <SelectValue placeholder="Move to stage..." />
              </SelectTrigger>
              <SelectContent>
                {stages.filter((s) => s.isActive).map((s) => (
                  <SelectItem key={s.id} value={s.id}>Move to: {s.stageName}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isConvertible && (
              <Button
                onClick={() => convert.mutate()}
                disabled={convert.isPending}
                className="w-full gap-2"
              >
                <GraduationCap className="h-4 w-4" />
                {convert.isPending ? 'Converting...' : 'Convert to Student'}
              </Button>
            )}
          </div>
        </Card>

        {/* Details */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <h3 className="font-semibold text-foreground mb-4">Contact &amp; Personal Details</h3>
            <dl className="grid gap-4 sm:grid-cols-2">
              {infoRows.map((row) => (
                <div key={row.label} className="flex items-start gap-3">
                  <row.icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{row.label}</dt>
                    <dd className="text-sm text-foreground mt-0.5 break-words">{row.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-foreground mb-3">Internal Notes</h3>
            <textarea
              className="w-full min-h-[120px] rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Add notes about the applicant..."
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setNotesTouched(true);
              }}
            />
            <div className="flex justify-end mt-3">
              <Button
                onClick={() => saveNotes.mutate()}
                disabled={!notesTouched || saveNotes.isPending}
              >
                {saveNotes.isPending ? 'Saving...' : 'Save Notes'}
              </Button>
            </div>
          </Card>

          {convert.isError && (
            <div
              className="rounded-lg border p-4 flex items-start gap-3"
              style={{
                backgroundColor: 'hsl(var(--status-danger-surface))',
                borderColor: 'hsl(var(--status-danger-ink) / 0.2)',
              }}
              role="alert"
            >
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" style={{ color: 'hsl(var(--status-danger-ink))' }} />
              <p className="text-sm" style={{ color: 'hsl(var(--status-danger-ink))' }}>
                {convert.error instanceof Error ? convert.error.message : 'Failed to convert applicant'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}