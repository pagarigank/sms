'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export default function ProgramsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', level: 'college' });

  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: () => apiClient.academic.listPrograms(),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiClient.academic.createProgram(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      setShowCreate(false);
      setForm({ code: '', name: '', level: 'college' });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Programs</h1>
          <p className="text-muted-foreground">College program configurations</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Add Program
        </button>
      </div>

      {showCreate && (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Create Program</h2>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium">Code</label>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="mt-1 block w-full rounded-md border px-3 py-2" placeholder="BSIT" required />
              </div>
              <div>
                <label className="block text-sm font-medium">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 block w-full rounded-md border px-3 py-2" placeholder="Bachelor of Science in IT" required />
              </div>
              <div>
                <label className="block text-sm font-medium">Level</label>
                <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className="mt-1 block w-full rounded-md border px-3 py-2">
                  <option value="college">College</option>
                  <option value="graduate">Graduate</option>
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
              <th className="px-4 py-3 text-left font-medium">Code</th>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Level</th>
            </tr>
          </thead>
          <tbody>
            {programs?.data?.map((p) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3 font-mono">{p.code}</td>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.level}</td>
              </tr>
            )) ?? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No programs found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
