'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export default function BuildingsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', branchId: '', address: '' });

  const { data: buildings, isLoading } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => apiClient.facility.listBuildings(),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiClient.facility.createBuilding(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      setShowCreate(false);
      setForm({ name: '', code: '', branchId: '', address: '' });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Buildings</h1>
          <p className="text-muted-foreground">Manage campus buildings</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Add Building
        </button>
      </div>

      {showCreate && (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Create Building</h2>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 block w-full rounded-md border px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium">Code</label>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="mt-1 block w-full rounded-md border px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium">Branch ID</label>
                <input value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} className="mt-1 block w-full rounded-md border px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium">Address</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1 block w-full rounded-md border px-3 py-2" />
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
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Code</th>
              <th className="px-4 py-3 text-left font-medium">Floors</th>
              <th className="px-4 py-3 text-left font-medium">Address</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : buildings?.data?.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No buildings found</td></tr>
            ) : (
              buildings?.data?.map((b) => (
                <tr key={b.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{b.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{b.code}</td>
                  <td className="px-4 py-3">{b.floorCount}</td>
                  <td className="px-4 py-3 text-muted-foreground">{b.address}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
