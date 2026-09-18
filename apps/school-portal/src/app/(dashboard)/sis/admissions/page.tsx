'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { UserPlus, Settings, GraduationCap, AlertTriangle } from 'lucide-react';
import { Badge, PageHeader, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sms/ui';

/**
 * Pipeline stage → semantic token pair (border / surface).
 * Kept as tokens so tenant theming + dark mode apply automatically.
 */
const STAGE_COLORS: Record<string, { border: string; bg: string }> = {
  new: { border: 'hsl(var(--status-info-ink) / 0.3)', bg: 'hsl(var(--status-info-surface))' },
  inquiry: { border: 'hsl(var(--status-info-ink) / 0.3)', bg: 'hsl(var(--status-info-surface))' },
  docs: { border: 'hsl(var(--status-warning-ink) / 0.3)', bg: 'hsl(var(--status-warning-surface))' },
  applicant: { border: 'hsl(var(--status-warning-ink) / 0.3)', bg: 'hsl(var(--status-warning-surface))' },
  assessment: { border: 'hsl(var(--accent) / 0.3)', bg: 'hsl(var(--accent-subtle))' },
  exam: { border: 'hsl(var(--accent) / 0.3)', bg: 'hsl(var(--accent-subtle))' },
  interview: { border: 'hsl(var(--status-warning-ink) / 0.45)', bg: 'hsl(var(--status-warning-surface))' },
  accepted: { border: 'hsl(var(--status-success-ink) / 0.3)', bg: 'hsl(var(--status-success-surface))' },
  admitted: { border: 'hsl(var(--status-success-ink) / 0.3)', bg: 'hsl(var(--status-success-surface))' },
  enrolled: { border: 'hsl(var(--status-success-ink) / 0.45)', bg: 'hsl(var(--status-success-surface))' },
};

interface Applicant {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  status: string;
  stageId?: string;
  gradeLevelAppliedFor?: string;
  email?: string;
  phone?: string;
  source?: string;
  notes?: string;
  createdAt?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  'online-form': 'Online Form',
  walkin: 'Walk-in',
  referral: 'Referral',
};

function formatSource(source?: string): string {
  if (!source) return 'Manual';
  return SOURCE_LABELS[source] ?? source;
}

function formatDate(value?: string): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function AdmissionsPage() {
  const { currentTenantId } = useTenantStore();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: pipeline, isLoading } = useQuery({
    queryKey: ['pipeline', currentTenantId],
    queryFn: () => apiClient.admissions.getPipeline({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });

  const moveStage = useMutation({
    mutationFn: ({ applicantId, stageId }: { applicantId: string; stageId: string }) =>
      apiClient.admissions.moveApplicantStage(applicantId, stageId),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['pipeline', currentTenantId] });
    },
    onError: (err) => setActionError(err instanceof Error ? err.message : 'Failed to move applicant'),
  });

  const convert = useMutation({
    mutationFn: (applicantId: string) => apiClient.admissions.convertApplicant(applicantId),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['pipeline', currentTenantId] });
    },
    onError: (err) => setActionError(err instanceof Error ? err.message : 'Failed to convert applicant'),
  });

  const stages: { id: string; stageName: string; stageCode: string }[] =
    (pipeline?.data as any)?.stages ?? [];
  const pipelineData: Record<string, Applicant[]> = (pipeline?.data as any)?.pipeline ?? {};

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admissions Pipeline"
        description="Track applicants through the admission process"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/sis/admissions/stages"
              className="inline-flex items-center gap-2 rounded-md border border-[hsl(var(--border-strong))] bg-[hsl(var(--surface-raised))] px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-[hsl(var(--surface-muted))]"
            >
              <Settings className="h-4 w-4" /> Configure Stages
            </Link>
            <Link
              href="/sis/admissions/apply"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              <UserPlus className="h-4 w-4" /> New Applicant
            </Link>
          </div>
        }
      />

      {actionError && (
        <div
          className="rounded-lg border p-4 flex items-start gap-3"
          style={{
            backgroundColor: 'hsl(var(--status-danger-surface))',
            borderColor: 'hsl(var(--status-danger-ink) / 0.2)',
          }}
          role="alert"
        >
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" style={{ color: 'hsl(var(--status-danger-ink))' }} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: 'hsl(var(--status-danger-ink))' }}>Action failed</p>
            <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--status-danger-ink))', opacity: 0.85 }}>{actionError}</p>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-sm hover:underline"
            style={{ color: 'hsl(var(--status-danger-ink))' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" />
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const applicants = pipelineData[stage.stageCode] ?? [];
            const color = STAGE_COLORS[stage.stageCode] ?? {
              border: 'hsl(var(--border-strong))',
              bg: 'hsl(var(--surface-muted))',
            };
            return (
              <div
                key={stage.id}
                className="min-w-[280px] flex-shrink-0 rounded-lg border-2"
                style={{ borderColor: color.border, backgroundColor: color.bg }}
              >
                <div className="p-4 border-b" style={{ borderColor: color.border }}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-[hsl(var(--foreground))]">{stage.stageName}</h3>
                    <Badge variant="secondary">{applicants.length}</Badge>
                  </div>
                </div>
                <div className="p-2 space-y-2 min-h-[200px]">
                  {applicants.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-8">No applicants</p>
                  ) : (
                    applicants.map((applicant) => (
                      <div key={applicant.id} className="group relative rounded-xl border bg-card p-4 hover:shadow-lg transition-all duration-200 hover:border-primary/30">
                        <Link
                          href={`/sis/admissions/${applicant.id}`}
                          className="flex items-start justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                              {applicant.lastName}, {applicant.firstName}
                            </p>
                            <p className="text-[11px] font-medium text-muted-foreground mt-0.5 uppercase tracking-wider">
                              Grade: {applicant.gradeLevelAppliedFor || 'Unset'}
                            </p>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                            <span className="text-xs font-bold text-primary">
                              {applicant.firstName.charAt(0)}{applicant.lastName.charAt(0)}
                            </span>
                          </div>
                        </Link>

                        <div className="mt-2 space-y-1">
                          <Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wide">
                            {formatSource(applicant.source)}
                          </Badge>
                          {applicant.email && (
                            <p className="text-xs text-muted-foreground truncate">{applicant.email}</p>
                          )}
                          {applicant.phone && (
                            <p className="text-xs text-muted-foreground truncate">{applicant.phone}</p>
                          )}
                          {formatDate(applicant.createdAt) && (
                            <p className="text-[10px] text-muted-foreground/70">Applied {formatDate(applicant.createdAt)}</p>
                          )}
                        </div>

                        {/* Move to stage */}
                        <div className="mt-4 pt-4 border-t border-border/50">
                          <Select
                            value={stage.id}
                            onValueChange={(val) =>
                              moveStage.mutate({ applicantId: applicant.id, stageId: val })
                            }
                            disabled={moveStage.isPending}
                          >
                            <SelectTrigger aria-label={`Move ${applicant.firstName} ${applicant.lastName} to another stage`} className="h-8 text-xs font-medium border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors">
                              <SelectValue placeholder="Move to stage..." />
                            </SelectTrigger>
                            <SelectContent>
                              {stages.map((s) => (
                                <SelectItem key={s.id} value={s.id}>Move to: {s.stageName}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Convert accepted applicants */}
                        {(stage.stageCode === 'accepted' || stage.stageCode === 'admitted') && (
                          <button
                            onClick={() => convert.mutate(applicant.id)}
                            disabled={convert.isPending}
                            className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold text-[hsl(var(--status-success-ink))] shadow-sm transition-all hover:brightness-105 active:scale-95 disabled:opacity-50"
                            style={{
                              backgroundColor: 'hsl(var(--status-success-surface))',
                              border: '1px solid hsl(var(--status-success-ink) / 0.35)',
                            }}
                          >
                            <GraduationCap className="h-3.5 w-3.5" />
                            {convert.isPending ? 'Converting...' : 'Convert to Student'}
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
