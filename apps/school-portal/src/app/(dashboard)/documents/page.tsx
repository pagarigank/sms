'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore, useAuthStore } from '@/lib/store';
import { FileText, CheckCircle, Clock, XCircle, Search, Plus, Loader2, AlertTriangle, ShieldCheck, Ban } from 'lucide-react';
import { Button } from '@sms/ui';
import { Input } from '@sms/ui';
import { Label } from '@sms/ui';
import { Badge } from '@sms/ui';

function listOf<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  const d = (res as { data?: unknown })?.data;
  return Array.isArray(d) ? (d as T[]) : [];
}

const DOCUMENT_TYPES = [
  { code: 'cert_enrollment', name: 'Certificate of Enrollment' },
  { code: 'good_moral', name: 'Good Moral Character' },
  { code: 'form_137', name: 'Form 137 (Permanent Record)' },
  { code: 'tor', name: 'Transcript of Records' },
  { code: 'id_card', name: 'ID Card' },
  { code: 'diploma', name: 'Diploma' },
];

const STATUS_CONFIG: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; icon: any }> = {
  requested: { variant: 'warning', icon: Clock },
  fee_assessed: { variant: 'info', icon: FileText },
  paid: { variant: 'success', icon: CheckCircle },
  released: { variant: 'success', icon: CheckCircle },
  rejected: { variant: 'danger', icon: XCircle },
};

interface DocTemplate {
  id: string;
  documentType: string;
  name: string;
  versionLabel?: string;
  feeAmount?: string | number;
}
interface DocRequest {
  id: string;
  branchId: string;
  studentId: string;
  documentTemplateId: string;
  status: string;
  feeAmount: string | number;
  verificationCode?: string | null;
  createdAt: string;
}
interface Student {
  id: string;
  firstName: string;
  lastName: string;
}
interface GeneratedDoc {
  id: string;
  studentId: string;
  templateId: string;
  verificationCode: string;
  isVoided: boolean;
  createdAt: string;
}

export default function DocumentsPage() {
  const { currentTenantId, currentBranchId } = useTenantStore();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [error, setError] = useState('');

  // --- Data ---
  const { data: templates } = useQuery({
    queryKey: ['document-templates', currentTenantId],
    queryFn: () => apiClient.documents.getTemplates({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });

  const { data: requests, isLoading: loadingReqs } = useQuery({
    queryKey: ['document-requests', currentTenantId, filterStatus],
    queryFn: () => apiClient.documents.getRequests({ tenantId: currentTenantId!, status: filterStatus || undefined }),
    enabled: !!currentTenantId,
  });

  const { data: students } = useQuery({
    queryKey: ['students', currentTenantId],
    queryFn: () => apiClient.sis.listStudents({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });

  const { data: generated } = useQuery({
    queryKey: ['generated-docs', currentTenantId],
    queryFn: () => apiClient.documents.getGeneratedDocs({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });

  const templateList = useMemo(() => listOf<DocTemplate>(templates), [templates]);
  const requestList = useMemo(() => listOf<DocRequest>(requests), [requests]);
  const studentList = useMemo(() => listOf<Student>(students), [students]);
  const generatedList = useMemo(() => listOf<GeneratedDoc>(generated), [generated]);

  const studentName = (id?: string | null) => {
    if (!id) return '—';
    const s = studentList.find((x) => x.id === id);
    return s ? `${s.lastName}, ${s.firstName}` : 'Unknown student';
  };
  const templateName = (id?: string | null) => {
    if (!id) return '—';
    return templateList.find((x) => x.id === id)?.name ?? 'Unknown template';
  };

  // --- Mutations ---
  const createRequest = useMutation({
    mutationFn: (payload: { studentId: string; documentTemplateId: string; feeAmount: number }) =>
      apiClient.documents.createRequest({
        ...payload,
        branchId: currentBranchId ?? undefined,
      }),
    onSuccess: () => {
      setShowRequestForm(false);
      setError('');
      queryClient.invalidateQueries({ queryKey: ['document-requests', currentTenantId] });
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to create request'),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiClient.documents.updateRequestStatus(id, status),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['document-requests', currentTenantId] });
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to update request'),
  });

  const approveRequest = useMutation({
    mutationFn: (id: string) => apiClient.documents.approveRequest(id, { releasedBy: user?.id ?? 'system' }),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['document-requests', currentTenantId] });
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to release'),
  });

  const generateFromRequest = useMutation({
    mutationFn: (req: DocRequest) =>
      apiClient.documents.generateDocument({
        branchId: req.branchId,
        studentId: req.studentId,
        templateId: req.documentTemplateId,
        requestId: req.id,
      }),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['generated-docs', currentTenantId] });
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to generate document'),
  });

  const voidDoc = useMutation({
    mutationFn: (id: string) => apiClient.documents.voidDocument(id),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['generated-docs', currentTenantId] });
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to void'),
  });

  // --- New request form ---
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqForm, setReqForm] = useState({ studentId: '', documentTemplateId: '', feeAmount: '' });
  const selectedTemplate = templateList.find((t) => t.id === reqForm.documentTemplateId);
  const effectiveFee = reqForm.feeAmount !== '' ? Number(reqForm.feeAmount) : Number(selectedTemplate?.feeAmount ?? 0);

  const filteredRequests = requestList.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      studentName(r.studentId).toLowerCase().includes(q) ||
      templateName(r.documentTemplateId).toLowerCase().includes(q) ||
      (r.verificationCode ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">Registrar desk: request, assess, release, and generate official documents</p>
        </div>
        <Button onClick={() => setShowRequestForm((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" /> New Request
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Document Types with template status */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Available Document Types</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {DOCUMENT_TYPES.map((dt) => {
            const tpl = templateList.find((t: any) => t.documentType === dt.code);
            return (
              <div key={dt.code} className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="font-medium text-sm">{dt.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {tpl
                    ? `Template v${tpl.versionLabel || '1.0'}${tpl.feeAmount != null && Number(tpl.feeAmount) > 0 ? ` • fee ₱${Number(tpl.feeAmount).toFixed(2)}` : ''}`
                    : 'No template configured'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* New request form */}
      {showRequestForm && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h3 className="font-semibold">New Document Request</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Student</Label>
              <select
                value={reqForm.studentId}
                onChange={(e) => setReqForm({ ...reqForm, studentId: e.target.value })}
                className="flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm"
              >
                <option value="">Select student…</option>
                {studentList.map((s) => (
                  <option key={s.id} value={s.id}>{s.lastName}, {s.firstName}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Document</Label>
              <select
                value={reqForm.documentTemplateId}
                onChange={(e) => setReqForm({ ...reqForm, documentTemplateId: e.target.value })}
                className="flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm"
              >
                <option value="">Select document…</option>
                {templateList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.feeAmount != null && Number(t.feeAmount) > 0 ? ` (₱${Number(t.feeAmount).toFixed(2)})` : ' (free)'}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="req-fee">Fee (₱) — optional override</Label>
              <Input
                id="req-fee"
                type="number"
                min="0"
                step="0.01"
                value={reqForm.feeAmount}
                onChange={(e) => setReqForm({ ...reqForm, feeAmount: e.target.value })}
                placeholder={selectedTemplate?.feeAmount != null ? String(Number(selectedTemplate.feeAmount).toFixed(2)) : '0.00'}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Requests start as <code>requested</code> → assess fee → mark paid → release & generate.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowRequestForm(false)}>Cancel</Button>
              <Button
                disabled={!reqForm.studentId || !reqForm.documentTemplateId || createRequest.isPending}
                onClick={() =>
                  createRequest.mutate({
                    studentId: reqForm.studentId,
                    documentTemplateId: reqForm.documentTemplateId,
                    feeAmount: effectiveFee,
                  })
                }
              >
                {createRequest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Request
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Document Requests */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Document Requests</h2>
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="p-4 border-b flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search by student, document, or code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex h-9 w-full max-w-sm rounded-md border px-3 py-1 text-sm"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex h-9 rounded-md border px-3 py-1 text-sm"
            >
              <option value="">All Status</option>
              <option value="requested">Requested</option>
              <option value="fee_assessed">Fee Assessed</option>
              <option value="paid">Paid</option>
              <option value="released">Released</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="divide-y">
            {loadingReqs ? (
              <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No document requests found</div>
            ) : (
              filteredRequests.map((req) => {
                const statusConfig = STATUS_CONFIG[req.status] ?? { variant: 'neutral' as const, icon: Clock };
                return (
                  <div key={req.id} className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-muted/50">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{templateName(req.documentTemplateId)}</p>
                        <p className="text-xs text-muted-foreground">
                          {studentName(req.studentId)} • {new Date(req.createdAt).toLocaleDateString()} • fee ₱{Number(req.feeAmount ?? 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {req.verificationCode && (
                        <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{req.verificationCode}</span>
                      )}
                      <Badge variant={statusConfig.variant}>{req.status}</Badge>
                      {req.status === 'requested' && (
                        <Button size="sm" variant="outline" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: req.id, status: 'fee_assessed' })}>
                          Assess Fee
                        </Button>
                      )}
                      {req.status === 'fee_assessed' && (
                        <Button size="sm" variant="outline" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: req.id, status: 'paid' })}>
                          Mark Paid
                        </Button>
                      )}
                      {(req.status === 'paid' || req.status === 'requested') && (
                        <Button size="sm" disabled={approveRequest.isPending} onClick={() => approveRequest.mutate(req.id)}>
                          {approveRequest.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                          Release
                        </Button>
                      )}
                      <Button size="sm" variant="outline" disabled={generateFromRequest.isPending} onClick={() => generateFromRequest.mutate(req)}>
                        Generate
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Generated documents */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Generated Documents</h2>
        <div className="rounded-lg border bg-card divide-y">
          {generatedList.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No documents generated yet. Generate one from a request above.
            </div>
          ) : (
            generatedList.map((doc) => (
              <div key={doc.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {doc.isVoided ? (
                    <Ban className="h-5 w-5 text-red-400 shrink-0" />
                  ) : (
                    <ShieldCheck className="h-5 w-5 text-green-600 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{templateName(doc.templateId)}</p>
                    <p className="text-xs text-muted-foreground">
                      {studentName(doc.studentId)} • {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono px-2 py-0.5 rounded ${doc.isVoided ? 'bg-red-50 text-red-700 line-through' : 'bg-muted'}`}>
                    {doc.verificationCode}
                  </span>
                  {!doc.isVoided && (
                    <Button size="sm" variant="outline" disabled={voidDoc.isPending} onClick={() => voidDoc.mutate(doc.id)}>
                      Void
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
