'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Badge } from '@sms/ui';

export default function HonorRollPage() {
  const { data: configs, isLoading } = useQuery({
    queryKey: ['honor-roll-configs'],
    queryFn: () => apiClient.grading.listHonorRollConfigs(),
  });

  const { data: levels } = useQuery({
    queryKey: ['education-levels', 'honor-roll'],
    queryFn: () => apiClient.academic.listEducationLevels(),
  });
  const levelNames = new Map((levels?.data ?? []).map((l) => [l.id, l.name]));

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
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : (configs?.data ?? []).length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No honor roll configs found</td></tr>
            ) : (
              configs?.data?.map((hrc) => (
                <tr key={hrc.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{levelNames.get(hrc.educationLevelId) ?? hrc.educationLevelId}</td>
                  <td className="px-4 py-3">{hrc.withHonorsThreshold}</td>
                  <td className="px-4 py-3">{hrc.withHighHonorsThreshold}</td>
                  <td className="px-4 py-3">{hrc.withHighestHonorsThreshold}</td>
                  <td className="px-4 py-3">
                    {hrc.isActive ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <span className="text-muted-foreground">Inactive</span>
                    )}
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
