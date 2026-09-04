'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export default function FloorsPage() {
  const { data: buildings } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => apiClient.facility.listBuildings(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Floors</h1>
        <p className="text-muted-foreground">Manage building floors</p>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Select a Building</h2>
        <p className="text-sm text-muted-foreground">Choose a building to manage its floors</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {buildings?.data?.map((b) => (
            <a key={b.id} href={`/facility/buildings/${b.id}/floors`} className="block rounded-md border p-4 hover:bg-muted">
              <p className="font-medium">{b.name}</p>
              <p className="text-sm text-muted-foreground">{b.floorCount ?? 0} floors</p>
            </a>
          )) ?? (
            <p className="text-sm text-muted-foreground col-span-full">No buildings found. Create a building first.</p>
          )}
        </div>
      </div>
    </div>
  );
}
