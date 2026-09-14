'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Skeleton } from '@sms/ui';

export default function GradeComponentsPage() {
  const [selectedSystem, setSelectedSystem] = useState('');

  const { data: systems, isLoading: systemsLoading } = useQuery({
    queryKey: ['grading-systems'],
    queryFn: () => apiClient.grading.listGradingSystems(),
  });

  const systemsList = systems?.data ?? [];
  const activeSystemId = selectedSystem || systemsList[0]?.id || '';

  const { data: components, isLoading: componentsLoading } = useQuery({
    queryKey: ['grade-components', activeSystemId],
    queryFn: () => apiClient.grading.listGradeComponents(activeSystemId),
    enabled: !!activeSystemId,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Grade Components</h1>
          <p className="text-muted-foreground">Weight templates for grading systems (Written Work, Performance Task, Exam)</p>
        </div>
        <div>
          <label className="text-sm font-medium">Grading System</label>
          <select
            value={activeSystemId}
            onChange={(e) => setSelectedSystem(e.target.value)}
            className="flex h-9 w-full sm:w-72 rounded-md border px-3 py-1 text-sm mt-1"
          >
            {systemsLoading && <option>Loading...</option>}
            {systemsList.map((gs) => (
              <option key={gs.id} value={gs.id}>{gs.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Weight (%)</th>
              <th className="px-4 py-3 text-left font-medium">Order</th>
            </tr>
          </thead>
          <tbody>
            {componentsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={3} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>
                </tr>
              ))
            ) : (components?.data ?? []).length > 0 ? (
              (components?.data ?? []).map((gc) => (
                <tr key={gc.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{gc.name}</td>
                  <td className="px-4 py-3">{gc.weight}%</td>
                  <td className="px-4 py-3">{gc.order}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  {activeSystemId ? 'No grade components for this grading system' : 'Create a grading system first'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
