'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export default function CurriculaPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ educationLevelId: '', schoolYearId: '', gradeLevelId: '', strandId: '', programId: '' });

  const { data: curricula, isLoading } = useQuery({
    queryKey: ['curricula'],
    queryFn: () => apiClient.academic.listCurricula(),
  });

  const { data: levels } = useQuery({ queryKey: ['education-levels'], queryFn: () => apiClient.academic.listEducationLevels() });
  const { data: schoolYears } = useQuery({ queryKey: ['school-years'], queryFn: () => apiClient.academic.listSchoolYears() });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiClient.academic.createCurriculum(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curricula'] });
      setShowCreate(false);
    },
  });

  const cloneMutation = useMutation({
    mutationFn: (id: string) => apiClient.academic.cloneCurriculum(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['curricula'] }),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => apiClient.academic.publishCurriculum(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['curricula'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Curricula</h1>
          <p className="text-muted-foreground">Manage curricula per education level and school year</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Create Curriculum
        </button>
      </div>

      {showCreate && (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">New Curriculum</h2>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium">Education Level</label>
                <select value={form.educationLevelId} onChange={(e) => setForm({ ...form, educationLevelId: e.target.value })} className="mt-1 block w-full rounded-md border px-3 py-2" required>
                  <option value="">Select...</option>
                  {levels?.data?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">School Year</label>
                <select value={form.schoolYearId} onChange={(e) => setForm({ ...form, schoolYearId: e.target.value })} className="mt-1 block w-full rounded-md border px-3 py-2" required>
                  <option value="">Select...</option>
                  {schoolYears?.data?.map((sy) => <option key={sy.id} value={sy.id}>{sy.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex space-x-2">
              <button type="submit" disabled={createMutation.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                Create
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-lg border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Education Level</th>
              <th className="px-4 py-3 text-left font-medium">School Year</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : curricula?.data?.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No curricula found</td></tr>
            ) : (
              curricula?.data?.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{c.educationLevelId}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.schoolYearId}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                      c.status === 'active' ? 'bg-green-100 text-green-800' :
                      c.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    {c.status === 'draft' && (
                      <button onClick={() => publishMutation.mutate(c.id)} className="text-sm text-green-600 hover:underline">Publish</button>
                    )}
                    <button onClick={() => cloneMutation.mutate(c.id)} className="text-sm text-blue-600 hover:underline">Clone</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
