'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { AlertTriangle, CheckCircle, ChevronRight, Users } from 'lucide-react';

interface GradeLevelMapping {
  sourceGradeLevelId: string;
  targetGradeLevelId: string;
}

export default function ReEnrollmentBatchPage() {
  const { currentTenantId, currentBranchId } = useTenantStore();
  const [step, setStep] = useState(0);
  const [sourceSchoolYearId, setSourceSchoolYearId] = useState('');
  const [targetSchoolYearId, setTargetSchoolYearId] = useState('');
  const [targetCurriculumId, setTargetCurriculumId] = useState('');
  const [gradeLevelMappings, setGradeLevelMappings] = useState<GradeLevelMapping[]>([]);
  const [result, setResult] = useState<any>(null);

  const { data: schoolYears } = useQuery({
    queryKey: ['school-years', currentTenantId],
    queryFn: () => apiClient.academic.listSchoolYears(),
    enabled: !!currentTenantId,
  });

  const { data: gradeLevels } = useQuery({
    queryKey: ['grade-levels', currentTenantId],
    queryFn: () => apiClient.academic.listGradeLevels(),
    enabled: !!currentTenantId,
  });

  const { data: curricula } = useQuery({
    queryKey: ['curricula', currentTenantId],
    queryFn: () => apiClient.academic.listCurricula({ schoolYearId: targetSchoolYearId }),
    enabled: !!currentTenantId && !!targetSchoolYearId,
  });

  const { data: preview, isFetching: previewLoading, error: previewError } = useQuery({
    queryKey: ['re-enrollment-preview', currentTenantId, sourceSchoolYearId],
    queryFn: () => apiClient.sis.getReEnrollmentPreview(sourceSchoolYearId),
    enabled: !!currentTenantId && !!sourceSchoolYearId && step === 2,
  });

  const batchEnroll = useMutation({
    mutationFn: () => apiClient.sis.executeBatchReEnrollment({
      sourceSchoolYearId,
      targetSchoolYearId,
      targetCurriculumId,
      gradeLevelMappings,
    }),
    onSuccess: (data) => {
      setResult(data.data);
      setStep(4);
    },
  });

  const sourceSY = (schoolYears?.data ?? []).find((sy: any) => sy.id === sourceSchoolYearId);
  const targetSY = (schoolYears?.data ?? []).find((sy: any) => sy.id === targetSchoolYearId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Batch Re-Enrollment</h1>
        <p className="text-muted-foreground">Carry forward students from one school year to the next</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-4">
        {['Select Years', 'Map Grade Levels', 'Preview', 'Confirm', 'Result'].map((label, index) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              index < step ? 'bg-green-500 text-white' :
              index === step ? 'bg-primary text-primary-foreground' :
              'bg-muted text-muted-foreground'
            }`}>
              {index < step ? '✓' : index + 1}
            </div>
            <span className="text-sm">{label}</span>
            {index < 4 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm min-h-[300px]">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Select School Years</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Source School Year (current)</label>
                <select
                  value={sourceSchoolYearId}
                  onChange={(e) => setSourceSchoolYearId(e.target.value)}
                  className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1"
                >
                  <option value="">Select...</option>
                  {(schoolYears?.data ?? []).map((sy: any) => (
                    <option key={sy.id} value={sy.id}>{sy.name} ({sy.status})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Target School Year (next)</label>
                <select
                  value={targetSchoolYearId}
                  onChange={(e) => setTargetSchoolYearId(e.target.value)}
                  className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1"
                >
                  <option value="">Select...</option>
                  {(schoolYears?.data ?? [])
                    .filter((sy: any) => sy.id !== sourceSchoolYearId)
                    .map((sy: any) => (
                      <option key={sy.id} value={sy.id}>{sy.name} ({sy.status})</option>
                    ))}
                </select>
              </div>
            </div>
            {targetSchoolYearId && (
              <div>
                <label className="text-sm font-medium">Target Curriculum</label>
                <select
                  value={targetCurriculumId}
                  onChange={(e) => setTargetCurriculumId(e.target.value)}
                  className="flex h-9 w-full max-w-md rounded-md border px-3 py-1 text-sm mt-1"
                >
                  <option value="">Select...</option>
                  {(curricula?.data ?? [])
                    .filter((c: any) => c.schoolYearId === targetSchoolYearId)
                    .map((c: any) => (
                      <option key={c.id} value={c.id}>{c.versionLabel || 'Curriculum'}</option>
                    ))}
                </select>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Map Grade Levels</h2>
            <p className="text-sm text-muted-foreground">
              Map source grade levels to target grade levels. Students will be promoted to the mapped level.
            </p>
            <div className="space-y-3">
              {(gradeLevels?.data ?? []).map((gl: any) => (
                <div key={gl.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  <span className="font-medium min-w-[200px]">{gl.name}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <select
                    className="flex h-9 w-full max-w-xs rounded-md border px-3 py-1 text-sm"
                    onChange={(e) => {
                      const newMappings = gradeLevelMappings.filter(m => m.sourceGradeLevelId !== gl.id);
                      if (e.target.value) {
                        newMappings.push({ sourceGradeLevelId: gl.id, targetGradeLevelId: e.target.value });
                      }
                      setGradeLevelMappings(newMappings);
                    }}
                  >
                    <option value="">Skip (don't enroll)</option>
                    {(gradeLevels?.data ?? []).map((target: any) => (
                      <option key={target.id} value={target.id}>{target.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Preview</h2>
            {previewError && (
              <p className="text-sm text-red-600">Failed to load preview: {(previewError as Error).message}</p>
            )}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <p className="text-3xl font-bold">{previewLoading ? '…' : (preview?.data?.totalStudents ?? '—')}</p>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <p className="text-3xl font-bold text-green-600">
                  {previewLoading ? '…' : Math.max((preview?.data?.totalStudents ?? 0) - (preview?.data?.withActiveHolds ?? 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Will be Enrolled</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <p className="text-3xl font-bold text-yellow-600">
                  {previewLoading ? '…' : (preview?.data?.withActiveHolds ?? '—')}
                </p>
                <p className="text-sm text-muted-foreground">With Holds</p>
              </div>
            </div>
            {preview?.data?.holdDetails && Object.keys(preview.data.holdDetails).length > 0 && (
              <div className="p-3 border rounded-lg">
                <p className="font-medium mb-2 text-sm">Students with active holds:</p>
                {Object.entries(preview.data.holdDetails).map(([studentId, count]) => (
                  <p key={studentId} className="text-sm text-yellow-600">
                    {studentId}: {String(count)} hold(s)
                  </p>
                ))}
              </div>
            )}
            {!previewLoading && preview?.data?.gradeLevelBreakdown && (
              <div className="p-3 border rounded-lg">
                <p className="font-medium mb-2 text-sm">Grade level breakdown:</p>
                {Object.entries(preview.data.gradeLevelBreakdown).map(([gradeLevelId, count]) => {
                  const gl = (gradeLevels?.data ?? []).find((g: any) => g.id === gradeLevelId);
                  return (
                    <p key={gradeLevelId} className="text-sm">
                      {gl?.name ?? gradeLevelId}: {String(count)} student(s)
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Confirm Batch Re-Enrollment</h2>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">Are you sure?</p>
                  <p className="text-sm text-yellow-600">
                    This will create new enrollments for all eligible students from {sourceSY?.name} to {targetSY?.name}.
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 border rounded-lg">
                <p className="text-muted-foreground">Source</p>
                <p className="font-medium">{sourceSY?.name}</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-muted-foreground">Target</p>
                <p className="font-medium">{targetSY?.name}</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-muted-foreground">Curriculum</p>
                <p className="font-medium">{targetCurriculumId}</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-muted-foreground">Grade Mappings</p>
                <p className="font-medium">{gradeLevelMappings.length} levels</p>
              </div>
            </div>
          </div>
        )}

        {step === 4 && result && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Result</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <p className="text-3xl font-bold">{result.totalStudents || 0}</p>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <p className="text-3xl font-bold text-green-600">{result.enrolled || 0}</p>
                <p className="text-sm text-muted-foreground">Enrolled</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <p className="text-3xl font-bold text-yellow-600">{result.skipped || 0}</p>
                <p className="text-sm text-muted-foreground">Skipped</p>
              </div>
            </div>
            {result.errors?.length > 0 && (
              <div className="p-3 border rounded-lg">
                <p className="font-medium mb-2">Errors:</p>
                {result.errors.map((err: any, i: number) => (
                  <p key={i} className="text-sm text-red-600">{err.studentId}: {err.error}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0 || step === 4}
          className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          ← Back
        </button>
        {step < 3 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={
              (step === 0 && (!sourceSchoolYearId || !targetSchoolYearId || !targetCurriculumId)) ||
              (step === 1 && gradeLevelMappings.length === 0) ||
              (step === 2 && !!sourceSchoolYearId && !preview && !previewError)
            }
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Next →
          </button>
        ) : step === 3 ? (
          <button
            onClick={() => batchEnroll.mutate()}
            disabled={batchEnroll.isPending}
            className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {batchEnroll.isPending ? 'Processing...' : 'Execute Batch Re-Enrollment'}
          </button>
        ) : (
          <button
            onClick={() => { setStep(0); setResult(null); setSourceSchoolYearId(''); setTargetSchoolYearId(''); setTargetCurriculumId(''); setGradeLevelMappings([]); }}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Start New Batch
          </button>
        )}
      </div>
    </div>
  );
}
