'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export default function HonorRollPage() {
  const { data: configs } = useQuery({
    queryKey: ['honor-roll-configs'],
    queryFn: () => apiClient.grading.listHonorRollConfigs(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Honor Roll Configuration</h1>
        <p className="text-muted-foreground">Configure honor roll thresholds per education level</p>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Education Level</th>
              <th className="px-4 py-3 text-left font-medium">With Honors</th>
              <th className="px-4 py-3 text-left font-medium">With High Honors</th>
              <th className="px-4 py-3 text-left font-medium">With Highest Honors</th>
              <th className="px-4 py-3 text-left font-medium">Active</th>
            </tr>
          </thead>
          <tbody>
            {configs?.data?.map((hrc) => (
              <tr key={hrc.id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3 font-medium">{hrc.educationLevelId}</td>
                <td className="px-4 py-3">{hrc.withHonorsThreshold}</td>
                <td className="px-4 py-3">{hrc.withHighHonorsThreshold}</td>
                <td className="px-4 py-3">{hrc.withHighestHonorsThreshold}</td>
                <td className="px-4 py-3">
                  {hrc.isActive ? (
                    <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">Active</span>
                  ) : (
                    <span className="text-muted-foreground">Inactive</span>
                  )}
                </td>
              </tr>
            )) ?? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No honor roll configs found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
