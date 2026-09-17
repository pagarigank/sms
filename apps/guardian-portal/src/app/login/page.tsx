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

  return (
    <AuthShell
      eyebrow="Parent & Student Portal"
      headline="Grades, payments, and announcements — all in one place."
      description="Follow your child's academic journey: track grades and attendance, view statements of account, and pay online."
      footer="SchoolSuite SMS · Parent & Student Portal"
      mobileSubtitle="Parent & Student Portal"
      features={[
        'Real-time grades & attendance',
        'Pay tuition and fees online',
        'Direct messaging with the school',
      ]}
      hue={100}
    >
      <LoginForm onSignIn={onSignIn} forgotPasswordUrl="/forgot-password" apiClient={apiClient} />
    </AuthShell>
  );
}
