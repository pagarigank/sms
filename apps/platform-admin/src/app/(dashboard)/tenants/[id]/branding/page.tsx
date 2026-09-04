'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useParams } from 'next/navigation';

export default function TenantBrandingPage() {
  const params = useParams();
  const tenantId = params.id as string;
  const queryClient = useQueryClient();

  const { data: tenantRes } = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: () => apiClient.tenants.get(tenantId),
  });

  const tenant = tenantRes?.data;
  const branding = (tenant?.branding as Record<string, any>) || {};

  const [form, setForm] = useState({
    logo: branding.logo || '',
    primaryColor: branding.primaryColor || '#1e3a5f',
    secondaryColor: branding.secondaryColor || '#3b82f6',
    favicon: branding.favicon || '',
    schoolName: branding.schoolName || '',
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiClient.tenants.update(tenantId, { branding: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tenant Branding</h1>
        <p className="text-muted-foreground">Configure logo, colors, and branding for {tenant?.name}</p>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate(form);
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">School Name (Override)</label>
              <input
                value={form.schoolName}
                onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
                className="mt-1 block w-full rounded-md border px-3 py-2"
                placeholder="Leave blank to use tenant name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Logo URL</label>
              <input
                value={form.logo}
                onChange={(e) => setForm({ ...form, logo: e.target.value })}
                className="mt-1 block w-full rounded-md border px-3 py-2"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Primary Color</label>
              <div className="mt-1 flex items-center space-x-2">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  className="h-10 w-10 rounded border"
                />
                <input
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  className="block flex-1 rounded-md border px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">Secondary Color</label>
              <div className="mt-1 flex items-center space-x-2">
                <input
                  type="color"
                  value={form.secondaryColor}
                  onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                  className="h-10 w-10 rounded border"
                />
                <input
                  value={form.secondaryColor}
                  onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                  className="block flex-1 rounded-md border px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">Favicon URL</label>
              <input
                value={form.favicon}
                onChange={(e) => setForm({ ...form, favicon: e.target.value })}
                className="mt-1 block w-full rounded-md border px-3 py-2"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg border p-4" style={{ backgroundColor: form.primaryColor + '10' }}>
            <p className="text-sm font-medium" style={{ color: form.primaryColor }}>
              Preview: {form.schoolName || tenant?.name || 'School Name'}
            </p>
            <p className="text-sm text-muted-foreground">
              Primary: {form.primaryColor} | Secondary: {form.secondaryColor}
            </p>
          </div>

          <div className="flex space-x-2">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Branding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
