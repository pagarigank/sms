'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export default function GradeComponentsPage() {
  const { data: components } = useQuery({
    queryKey: ['grade-components'],
    queryFn: () => apiClient.grading.listGradeComponents(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Grade Components</h1>
        <p className="text-muted-foreground">Weight templates for grading systems (Written Work, Performance Task, Exam)</p>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Weight (%)</th>
              <th className="px-4 py-3 text-left font-medium">Order</th>
              <th className="px-4 py-3 text-left font-medium">Grading System</th>
            </tr>
          </thead>
          <tbody>
            {components?.data?.map((gc) => (
              <tr key={gc.id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3 font-medium">{gc.name}</td>
                <td className="px-4 py-3">{gc.weight}%</td>
                <td className="px-4 py-3">{gc.order}</td>
                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{gc.gradingSystemId}</td>
              </tr>
            )) ?? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No grade components found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
