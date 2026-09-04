'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export default function GradingSystemsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ educationLevelId: '', schoolYearId: '', name: '', type: 'numeric' });

  const { data: systems, isLoading } = useQuery({
    queryKey: ['grading-systems'],
    queryFn: () => apiClient.grading.listGradingSystems(),
  });

  const { data: levels } = useQuery({ queryKey: ['education-levels'], queryFn: () => apiClient.academic.listEducationLevels() });
  const { data: schoolYears } = useQuery({ queryKey: ['school-years'], queryFn: () => apiClient.academic.listSchoolYears() });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiClient.grading.createGradingSystem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grading-systems'] });
      setShowCreate(false);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Grading Systems</h1>
          <p className="text-muted-foreground">Configure grading systems per education level</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Add Grading System
        </button>
      </div>

      {showCreate && (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Create Grading System</h2>
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
                <label className="block text-sm font-medium">School Year</label>
                <select value={form.schoolYearId} onChange={(e) => setForm({ ...form, schoolYearId: e.target.value })} className="mt-1 block w-full rounded-md border px-3 py-2" required>
                  <option value="">Select...</option>
                  {schoolYears?.data?.map((sy) => <option key={sy.id} value={sy.id}>{sy.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 block w-full rounded-md border px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-1 block w-full rounded-md border px-3 py-2">
                  <option value="numeric">Numeric (60-100)</option>
                  <option value="descriptive">Descriptive</option>
                  <option value="gpa">GPA/QPI</option>
                  <option value="pass_fail">Pass/Fail</option>
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
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Active</th>
              <th className="px-4 py-3 text-left font-medium">Branch</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : systems?.data?.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No grading systems found</td></tr>
            ) : (
              systems?.data?.map((gs) => (
                <tr key={gs.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{gs.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{gs.type}</td>
                  <td className="px-4 py-3">
                    {gs.isActive ? (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">Active</span>
                    ) : (
                      <span className="text-muted-foreground">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{gs.branchId || 'Tenant Default'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
