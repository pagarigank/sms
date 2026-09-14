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

  useEffect(() => {
    if (token && user) router.replace('/dashboard');
  }, [token, user, router]);

  if (token && user) return null;

  const onSignIn = (data: { accessToken?: string; refreshToken?: string; user?: unknown }) => {
    if (!data.accessToken || !data.refreshToken || !data.user) return;
    setAuth(data.user as Parameters<typeof setAuth>[0], data.accessToken, data.refreshToken);
    router.replace('/dashboard');
  };

  return (
    <AuthShell
      eyebrow="Platform Console"
      headline="Run every school from one console."
      description="Provision tenants, configure roles, and monitor the entire SchoolSuite platform from a single administrative surface."
      footer="SchoolSuite SMS · Platform Console"
      mobileSubtitle="Platform Administration"
      features={[
        'Multi-tenant RBAC + ReBAC',
        'Break-glass impersonation with audit trail',
        'OIDC + MFA ready',
      ]}
    >
      <LoginForm onSignIn={onSignIn} apiClient={apiClient} />
    </AuthShell>
  );
}
