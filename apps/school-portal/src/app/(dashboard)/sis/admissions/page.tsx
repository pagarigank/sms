'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { UserPlus, Settings, GraduationCap, AlertTriangle } from 'lucide-react';
import { Badge } from '@sms/ui';

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
  status: string;
  gradeLevelAppliedFor?: string;
  email?: string;
  phone?: string;
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admissions Pipeline</h1>
          <p className="text-muted-foreground">Track applicants through the admission process</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/sis/admissions/apply"
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
      </div>

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
                      <div key={applicant.id} className="rounded-lg border bg-card p-3 hover:shadow-md transition-shadow">
                        <p className="font-medium text-sm text-[hsl(var(--foreground))]">
                          {applicant.lastName}, {applicant.firstName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {applicant.gradeLevelAppliedFor || 'No level set'}
                        </p>

                        {/* Move to stage */}
                        <select
                          value={stage.id}
                          onChange={(e) =>
                            moveStage.mutate({ applicantId: applicant.id, stageId: e.target.value })
                          }
                          disabled={moveStage.isPending}
                          className="mt-2 w-full rounded border border-[hsl(var(--border-strong))] bg-background px-2 py-1 text-xs disabled:opacity-50"
                          aria-label={`Move ${applicant.firstName} ${applicant.lastName} to another stage`}
                        >
                          {stages.map((s) => (
                            <option key={s.id} value={s.id}>Move to: {s.stageName}</option>
                          ))}
                        </select>

                        {/* Convert accepted applicants */}
                        {(stage.stageCode === 'accepted' || stage.stageCode === 'admitted') && (
                          <button
                            onClick={() => convert.mutate(applicant.id)}
                            disabled={convert.isPending}
                            className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-[hsl(var(--status-success-ink))] disabled:opacity-50"
                            style={{
                              backgroundColor: 'hsl(var(--status-success-surface))',
                              border: '1px solid hsl(var(--status-success-ink) / 0.35)',
                            }}
                          >
                            <GraduationCap className="h-3 w-3" />
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
