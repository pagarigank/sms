'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { LoginForm, AuthShell } from '@sms/ui';
import { apiClient } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  // Already signed in — go straight to the dashboard (run after hydration).
  useEffect(() => {
    if (token && user) {
      const timer = setTimeout(() => {
        router.replace('/dashboard');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [token, user, router]);

  if (token && user) return null;

  const onSignIn = (data: { accessToken?: string; refreshToken?: string; user?: unknown }) => {
    if (!data.accessToken || !data.refreshToken || !data.user) return;
    setAuth(data.user as Parameters<typeof setAuth>[0], data.accessToken, data.refreshToken);
    router.replace('/dashboard');
  };

  const onTenantLookup = async (slug: string) => {
    const res = await apiClient.auth.tenantLookup(slug);
    return { id: res.data.id, name: res.data.name };
  };

  return (
    <AuthShell
      eyebrow="School Administration"
      headline="One portal for your whole campus."
      description="Manage student records, enrollment, scheduling, and billing from a single, secure administration portal."
      footer="SchoolSuite SMS · School Administration Portal"
      mobileSubtitle="School Administration Portal"
      features={[
        'Multi-tenant school support',
        'Audit-logged every action',
        'OIDC + MFA ready',
      ]}
      hue={-12}
    >
      <LoginForm
        showTenantStep
        onTenantLookup={onTenantLookup}
        onSignIn={onSignIn}
        forgotPasswordUrl="/forgot-password"
        apiClient={apiClient}
      />
    </AuthShell>
  );
}
