'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * POS Terminal sign-in — touch-first, high contrast, large targets.
 * Self-contained styles: the POS app has no Tailwind/@sms/ui deps by design
 * (frontend.md §8: resilience over cleverness at the cashier).
 */
export default function POSLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your cashier email and password.');
      return;
    }
    setBusy(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${base}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Sign-in failed');
      if (data.mfaRequired) throw new Error('MFA is not supported on POS terminals. Contact your administrator.');
      // Persist for the terminal session; the POS shell reads these next.
      sessionStorage.setItem('pos-auth', JSON.stringify(data));
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 56,
    borderRadius: 12,
    border: '2px solid #d1d5db',
    padding: '0 16px',
    fontSize: 18,
    outline: 'none',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
        padding: 16,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: '#ffffff',
          borderRadius: 20,
          padding: 32,
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: '#2563eb' }}>SCHOOLSUITE POS</div>
          <h1 style={{ margin: '8px 0 4px', fontSize: 24, fontWeight: 800, color: '#0f172a' }}>Cashier Sign-in</h1>
          <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>Terminal access for payment collection</p>
          <p style={{ margin: '12px 0 0', fontSize: 12, color: '#94a3b8' }}>Session is logged and monitored</p>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div
              role="alert"
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                borderRadius: 10,
                padding: '12px 14px',
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>Email</span>
            <input
              id="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cashier@school.ph"
              style={inputStyle}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>Password</span>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={inputStyle}
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            style={{
              height: 56,
              borderRadius: 12,
              border: 'none',
              background: busy ? '#93c5fd' : '#2563eb',
              color: '#ffffff',
              fontSize: 17,
              fontWeight: 700,
              cursor: busy ? 'wait' : 'pointer',
            }}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
          SchoolSuite SMS · Cashier POS Terminal
        </p>
      </div>
    </div>
  );
}
