'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export default function DepartmentsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', branchId: '', educationLevelIds: '', isDefault: false });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => apiClient.departments.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiClient.departments.create({
      name: data.name,
      branchId: data.branchId,
      educationLevelIds: data.educationLevelIds.split(',').map((s) => s.trim()),
      isDefault: data.isDefault,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setShowCreate(false);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
          <p className="text-muted-foreground">Manage academic departments</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Add Department
        </button>
      </div>

      {showCreate && (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Create Department</h2>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 block w-full rounded-md border px-3 py-2" placeholder="Elementary, JHS, SHS, College" required />
              </div>
              <div>
                <label className="block text-sm font-medium">Branch ID</label>
                <input value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} className="mt-1 block w-full rounded-md border px-3 py-2" required />
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
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Branch</th>
              <th className="px-4 py-3 text-left font-medium">Default</th>
            </tr>
          </thead>
          <tbody>
            {departments?.data?.map((d) => (
              <tr key={d.id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3 font-medium">{d.name}</td>
                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{d.branchId}</td>
                <td className="px-4 py-3">{d.isDefault ? '✓' : ''}</td>
              </tr>
            )) ?? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No departments found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
