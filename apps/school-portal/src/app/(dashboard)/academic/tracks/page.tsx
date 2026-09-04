'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export default function TracksPage() {
  const queryClient = useQueryClient();
  const [showCreateTrack, setShowCreateTrack] = useState(false);
  const [trackForm, setTrackForm] = useState({ name: '' });

  const { data: tracks } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => apiClient.academic.listTracks(),
  });

  const createTrackMutation = useMutation({
    mutationFn: (data: { name: string }) => apiClient.academic.createTrack(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      setShowCreateTrack(false);
      setTrackForm({ name: '' });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tracks & Strands</h1>
          <p className="text-muted-foreground">SHS tracks and strand configurations</p>
        </div>
        <button onClick={() => setShowCreateTrack(true)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Add Track
        </button>
      </div>

      {showCreateTrack && (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Create Track</h2>
          <form onSubmit={(e) => { e.preventDefault(); createTrackMutation.mutate(trackForm); }} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium">Track Name</label>
              <input value={trackForm.name} onChange={(e) => setTrackForm({ name: e.target.value })} className="mt-1 block w-full rounded-md border px-3 py-2" placeholder="Academic, TVL, Sports, Arts & Design" required />
            </div>
            <div className="flex space-x-2">
              <button type="submit" disabled={createTrackMutation.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                Create
              </button>
              <button type="button" onClick={() => setShowCreateTrack(false)} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-lg border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Track Name</th>
              <th className="px-4 py-3 text-left font-medium">ID</th>
            </tr>
          </thead>
          <tbody>
            {tracks?.data?.map((t) => (
              <tr key={t.id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{t.id}</td>
              </tr>
            )) ?? (
              <tr><td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">No tracks found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
