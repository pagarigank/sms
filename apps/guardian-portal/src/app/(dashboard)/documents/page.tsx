'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useStudentStore } from '@/lib/student-store';
import { FileText, CheckCircle, Clock, Copy, Check, Loader2, AlertTriangle, Ban, Download } from 'lucide-react';
import { Badge } from '@sms/ui';

const STATUS_CONFIG: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; label: string }> = {
  requested: { variant: 'warning', label: 'Requested' },
  fee_assessed: { variant: 'info', label: 'Fee Assessed — please pay at the cashier' },
  paid: { variant: 'info', label: 'Paid — being processed' },
  released: { variant: 'success', label: 'Ready for pickup at the registrar' },
  rejected: { variant: 'danger', label: 'Rejected' },
};

interface DocTemplate {
  id: string;
  documentType: string;
  name: string;
  feeAmount?: string | number;
}
interface DocRequest {
  id: string;
  documentTemplateId: string;
  status: string;
  feeAmount: string | number;
  verificationCode?: string | null;
  createdAt: string;
}
interface GeneratedDoc {
  id: string;
  templateId: string;
  verificationCode: string;
  isVoided: boolean;
  createdAt: string;
}

export default function DocumentsPage() {
  const { selectedStudentId } = useStudentStore();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const { data: templates } = useQuery({
    queryKey: ['document-templates'],
    queryFn: () => apiClient.documents.getTemplates({ tenantId: '' }),
  });

  const { data: requests, isLoading: loadingRequests } = useQuery({
    queryKey: ['document-requests', selectedStudentId],
    queryFn: () => apiClient.documents.getRequests({ tenantId: '', studentId: selectedStudentId! }),
    enabled: !!selectedStudentId,
  });

  const { data: generated } = useQuery({
    queryKey: ['generated-documents', selectedStudentId],
    queryFn: () => apiClient.documents.getGeneratedDocs({ tenantId: '', studentId: selectedStudentId! }),
    enabled: !!selectedStudentId,
  });

  const templateList = useMemo(() => (Array.isArray(templates?.data) ? (templates!.data as DocTemplate[]) : []), [templates]);
  const requestList = useMemo(() => (Array.isArray(requests?.data) ? (requests!.data as DocRequest[]) : []), [requests]);
  const generatedList = useMemo(() => (Array.isArray(generated?.data) ? (generated!.data as GeneratedDoc[]) : []), [generated]);

  const templateName = (id?: string | null) =>
    templateList.find((t) => t.id === id)?.name ?? 'Document';

  const createRequest = useMutation({
    mutationFn: (template: DocTemplate) =>
      apiClient.documents.createRequest({
        studentId: selectedStudentId!,
        documentTemplateId: template.id,
        feeAmount: Number(template.feeAmount ?? 0),
        branchId: undefined,
      } as any),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['document-requests', selectedStudentId] });
    },
    onError: (e: any) => setError(e?.message ?? 'Failed to submit request'),
  });

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  const downloadDoc = useMutation({
    mutationFn: (doc: GeneratedDoc) => apiClient.documents.downloadGenerated(doc.id),
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename ?? 'document.pdf';
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (e: any) => setError(e?.message ?? 'Failed to download PDF'),
  });

  if (!selectedStudentId) {
    return (
      <div className="flex items-center justify-center p-16">
        <p className="text-gray-500">Select a student to view documents.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Documents</h1>
        <p className="text-gray-500">Request registrar documents and track their progress</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Available document types (from live templates, fees shown) */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Request a Document</h3>
        {templateList.length === 0 ? (
          <p className="text-sm text-gray-500">No document types are currently available. Please contact the registrar.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {templateList.map((tpl) => (
              <button
                key={tpl.id}
                disabled={createRequest.isPending}
                onClick={() => createRequest.mutate(tpl)}
                className="text-left p-3 rounded-lg border hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <FileText className="h-5 w-5 text-primary mb-2" />
                <p className="text-sm font-medium text-gray-900">{tpl.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {Number(tpl.feeAmount ?? 0) > 0 ? `₱${Number(tpl.feeAmount).toFixed(2)} fee` : 'Free'} • Click to request
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Requests */}
      {loadingRequests ? (
        <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : requestList.length > 0 && (
        <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-900">My Requests</h3>
          </div>
          <div className="divide-y">
            {requestList.map((req) => {
              const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.requested;
              return (
                <div key={req.id} className="p-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{templateName(req.documentTemplateId)}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(req.createdAt).toLocaleDateString()}
                        {Number(req.feeAmount ?? 0) > 0 ? ` • ₱${Number(req.feeAmount).toFixed(2)}` : ' • Free'}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">{cfg.label}</p>
                    </div>
                  </div>
                  <Badge variant={cfg.variant} className="shrink-0">{req.status}</Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Generated documents: verification code = authenticity proof */}
      {generatedList.length > 0 && (
        <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-900">Issued Documents</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Anyone can verify these documents using the code at the school&apos;s verification page.
            </p>
          </div>
          <div className="divide-y">
            {generatedList.map((doc) => (
              <div key={doc.id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {doc.isVoided ? (
                    <Ban className="h-5 w-5 text-red-400 shrink-0" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[hsl(var(--ink-100))]">{templateName(doc.templateId)}</p>
                    <p className="text-xs text-[hsl(var(--ink-300))]">{new Date(doc.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => copyCode(doc.verificationCode)}
                    className="flex items-center gap-1.5 text-xs font-mono bg-[hsl(var(--surface-muted))] hover:bg-[hsl(var(--border))] text-[hsl(var(--ink-200))] px-2 py-1 rounded transition-colors"
                    title="Copy verification code"
                  >
                    {doc.isVoided ? <span className="line-through">{doc.verificationCode}</span> : doc.verificationCode}
                    {copied === doc.verificationCode ? <Check className="h-3.5 w-3.5 text-[hsl(var(--status-success-ink))]" /> : <Copy className="h-3.5 w-3.5 text-[hsl(var(--ink-300))]" />}
                  </button>
                  {!doc.isVoided && (
                    <button
                      onClick={() => downloadDoc.mutate(doc)}
                      disabled={downloadDoc.isPending}
                      className="flex items-center gap-1 text-xs bg-[hsl(var(--accent-subtle))] hover:bg-[hsl(var(--accent))]/20 text-[hsl(var(--accent))] px-2 py-1 rounded transition-colors disabled:opacity-50"
                      title="Download PDF"
                    >
                      <Download className="h-3.5 w-3.5" /> PDF
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {requestList.length === 0 && generatedList.length === 0 && !loadingRequests && (
        <div className="rounded-lg border bg-white p-8 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto" />
          <p className="mt-4 text-gray-500">No document requests yet. Pick a document above to get started.</p>
        </div>
      )}
    </div>
  );
}
