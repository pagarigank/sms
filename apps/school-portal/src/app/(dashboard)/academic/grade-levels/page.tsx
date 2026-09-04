'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export default function GradeLevelsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ educationLevelId: '', code: '', name: '', sortOrder: '0' });

  const { data: levels } = useQuery({
    queryKey: ['education-levels'],
    queryFn: () => apiClient.academic.listEducationLevels(),
  });

  const { data: gradeLevels, isLoading } = useQuery({
    queryKey: ['grade-levels'],
    queryFn: () => apiClient.academic.listGradeLevels(),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiClient.academic.createGradeLevel({
      ...data,
      sortOrder: parseInt(data.sortOrder),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade-levels'] });
      setShowCreate(false);
      setForm({ educationLevelId: '', code: '', name: '', sortOrder: '0' });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Grade Levels</h1>
          <p className="text-muted-foreground">Manage grade/year levels per education level</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Add Grade Level
        </button>
      </div>

      {showCreate && (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Create Grade Level</h2>
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
                <label className="block text-sm font-medium">Code</label>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="mt-1 block w-full rounded-md border px-3 py-2" placeholder="7, 11, 1st Year" required />
              </div>
              <div>
                <label className="block text-sm font-medium">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 block w-full rounded-md border px-3 py-2" placeholder="Grade 7, Grade 11, 1st Year" required />
              </div>
              <div>
                <label className="block text-sm font-medium">Sort Order</label>
                <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} className="mt-1 block w-full rounded-md border px-3 py-2" />
              </div>
            </div>
            <div className="flex space-x-2">
              <button type="submit" disabled={createMutation.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {createMutation.isPending ? 'Creating...' : 'Create'}
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
              <th className="px-4 py-3 text-left font-medium">Code</th>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Education Level</th>
              <th className="px-4 py-3 text-left font-medium">Order</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : gradeLevels?.data?.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No grade levels found</td></tr>
            ) : (
              gradeLevels?.data?.map((gl) => (
                <tr key={gl.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 font-mono">{gl.code}</td>
                  <td className="px-4 py-3 font-medium">{gl.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{gl.educationLevelId}</td>
                  <td className="px-4 py-3">{gl.sortOrder}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
