'use client';

import { useState, useRef } from 'react';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Shield,
  AlertCircle, Loader2, KeyRound, Building2,
} from 'lucide-react';
import { cn } from '@sms/utils';

/* ------------------------------------------------------------------ */
/*  Token helpers — CSS vars hold raw HSL triplets, so every arbitrary */
/*  value must be wrapped in hsl(var(--token)).                        */
/* ------------------------------------------------------------------ */

const fieldBase =
  'h-12 w-full rounded-lg border bg-[hsl(var(--surface-input))] px-3.5 text-sm text-[hsl(var(--foreground))] ' +
  'placeholder:text-[hsl(var(--ink-300))] transition-colors ' +
  'focus-visible:outline-none focus-visible:border-[hsl(var(--accent))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]';

/* ------------------------------------------------------------------ */
/*  Inline field — label + input + optional helper / error.           */
/* ------------------------------------------------------------------ */

type InputType = 'text' | 'email' | 'password' | 'search' | 'tel' | 'url';

interface InlineFieldProps {
  id: string;
  label: string;
  type?: InputType;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>['inputMode'];
  maxLength?: number;
  className?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  onClear?: () => void;
}

function InlineField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  helper,
  error,
  inputMode,
  maxLength,
  className,
  autoComplete,
  autoFocus,
  onClear,
}: InlineFieldProps) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const hasValue = value.length > 0;
  const helperId = helper ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-[hsl(var(--foreground))]">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          maxLength={maxLength}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-invalid={!!error}
          aria-describedby={errorId ?? helperId}
          data-testid={`${id}-input`}
          className={cn(
            fieldBase,
            'pr-10',
            error && 'border-[hsl(var(--status-danger-ink))] focus-visible:border-[hsl(var(--status-danger-ink))] focus-visible:ring-[hsl(var(--status-danger-ink))]'
          )}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isPassword ? (
            <button
              type="button"
              className="text-[hsl(var(--ink-300))] hover:text-[hsl(var(--foreground))] transition-colors"
              tabIndex={-1}
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          ) : hasValue && onClear ? (
            <button
              type="button"
              className="text-[hsl(var(--ink-300))] hover:text-[hsl(var(--foreground))] transition-colors"
              tabIndex={-1}
              onClick={onClear}
              aria-label="Clear field"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
      {helper && <p id={helperId} className="text-xs text-[hsl(var(--ink-300))]">{helper}</p>}
      {error && <p id={errorId} className="text-xs text-[hsl(var(--status-danger-ink))]" role="alert">{error}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step transition — fades in on step change.                        */
/* ------------------------------------------------------------------ */

function StepTransition({ stepKey, children }: { stepKey: string; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [seenKey, setSeenKey] = useState(stepKey);

  if (seenKey !== stepKey) {
    setSeenKey(stepKey);
    setMounted(false);
  }

  // Mount one frame after render so the fade-in transition runs on every step change.
  if (!mounted && typeof window !== 'undefined') {
    requestAnimationFrame(() => setMounted(true));
  }

  return (
    <div className={cn('transition-opacity duration-200 ease-out', mounted ? 'opacity-100' : 'opacity-0')}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline error pill.                                                 */
/* ------------------------------------------------------------------ */

function FieldError({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2 rounded-lg bg-[hsl(var(--status-danger-surface))] px-3.5 py-2.5 text-sm text-[hsl(var(--status-danger-ink))]"
      role="alert"
      data-testid="login-error"
    >
      <AlertCircle className="mt-0.5 shrink-0" size={14} />
      <span>{message}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Trust note — small security line near the form.                   */
/* ------------------------------------------------------------------ */

function TrustNote({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-1.5 text-xs text-[hsl(var(--ink-300))]', className)}>
      <Shield size={12} className="text-[hsl(var(--accent))]" />
      <span>Your session is encrypted and monitored for security.</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared button styles for step actions.                            */
/* ------------------------------------------------------------------ */

const primaryBtn =
  'inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-[hsl(var(--accent))] px-4 text-sm font-medium text-[hsl(var(--accent-ink))] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50';

const secondaryBtn =
  'inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[hsl(var(--border-strong))] bg-[hsl(var(--surface-raised))] px-4 text-sm font-medium text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--surface-muted))]';

const Spinner = () => <Loader2 className="h-4 w-4 animate-spin" />;

/* ------------------------------------------------------------------ */
/*  LoginForm — form-only (no page shell).                            */
/*  Each portal page provides the shell, brand lockup, and aesthetic. */
/* ------------------------------------------------------------------ */

export type LoginVariant = 'platform' | 'school';

export interface TenantInfo {
  id: string;
  name: string;
}

export interface SignInPayload {
  accessToken?: string;
  refreshToken?: string;
  user?: unknown;
  [key: string]: unknown;
}

export interface LoginFormProps {
  variant?: LoginVariant;
  /** @deprecated kept for backwards compat — brand is now rendered by the page */
  brandTitle?: string;
  /** @deprecated kept for backwards compat — brand is now rendered by the page */
  brandSubtitle?: string;
  showTenantStep?: boolean;
  onTenantLookup?: (slug: string) => Promise<TenantInfo>;
  onSignIn: (data: SignInPayload) => void;
  initialTenant?: TenantInfo | null;
  forgotPasswordUrl?: string;
  apiClient?: unknown;
}

type Step =
  | { kind: 'tenant' }
  | { kind: 'credentials'; tenant: TenantInfo | null }
  | { kind: 'mfa'; userId: string; email: string; mfaSetupRequired: boolean; tenant: TenantInfo | null };

export function LoginForm({
  showTenantStep = false,
  onTenantLookup,
  onSignIn,
  initialTenant,
  forgotPasswordUrl,
  apiClient: passedApiClient,
}: LoginFormProps) {
  const [step, setStep] = useState<Step>(() => {
    if (!showTenantStep) return { kind: 'credentials', tenant: initialTenant ?? null };
    if (initialTenant) return { kind: 'credentials', tenant: initialTenant };
    return { kind: 'tenant' };
  });

  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const mfaInputRef = useRef<HTMLInputElement>(null);

  const getApi = () =>
    passedApiClient ??
    (typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>).__SMS_API_CLIENT__ : null);

  const handleTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!onTenantLookup) return;
    setSubmitting(true);
    try {
      const tenant = await onTenantLookup(tenantSlug.trim());
      setStep({ kind: 'credentials', tenant });
      setTenantSlug('');
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'School not found');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!email.trim()) {
      setFormError('Please enter your email address');
      return;
    }
    if (!password) {
      setFormError('Please enter your password');
      return;
    }
    const tenant = step.kind === 'credentials' ? step.tenant : null;
    setSubmitting(true);
    try {
      const api = getApi();
      if (!api) throw new Error('API client not available');
      const res = await (api as {
        auth: {
          login: (data: { email: string; password: string; tenantId?: string }) => Promise<{
            data: {
              mfaRequired?: boolean;
              mfaSetupRequired?: boolean;
              tempToken?: string;
              accessToken?: string;
              refreshToken?: string;
              user?: { id?: string; email?: string } & Record<string, unknown>;
            };
          }>;
        };
      }).auth.login({
        email: email.trim(),
        password,
        tenantId: tenant?.id,
      });
      const data = res.data;
      if (data?.mfaRequired) {
        setStep({
          kind: 'mfa',
          userId: data.user?.id ?? '',
          email: email.trim(),
          mfaSetupRequired: !!data.mfaSetupRequired,
          tenant,
        });
        setMfaCode('');
        setTimeout(() => mfaInputRef.current?.focus(), 150);
        return;
      }
      onSignIn(data as SignInPayload);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Sign-in failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (step.kind !== 'mfa') return;
    if (mfaCode.trim().length < 6) {
      setFormError('Enter the 6-digit code from your authenticator app');
      return;
    }
    setSubmitting(true);
    try {
      const api = getApi();
      if (!api) throw new Error('API client not available');
      const res = await (api as {
        auth: {
          mfaVerify: (data: { userId: string; token: string }) => Promise<{ data: SignInPayload }>;
        };
      }).auth.mfaVerify({ userId: step.userId, token: mfaCode.trim() });
      onSignIn(res.data);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Invalid verification code');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- Tenant lookup step ---------------- */

  if (step.kind === 'tenant' && showTenantStep) {
    return (
      <StepTransition stepKey="tenant">
        <form onSubmit={handleTenant} className="space-y-6" data-testid="tenant-step">
          {formError && <FieldError message={formError} />}

          <InlineField
            id="tenant"
            label="School / Tenant"
            type="text"
            value={tenantSlug}
            onChange={setTenantSlug}
            placeholder="e.g. demo-school"
            autoComplete="off"
            autoFocus
            onClear={() => setTenantSlug('')}
          />
          <p className="-mt-4 text-xs text-[hsl(var(--ink-300))]">
            Your school&apos;s slug (also the subdomain:{' '}
            <code className="rounded bg-[hsl(var(--surface-muted))] px-1 py-0.5">{tenantSlug || 'school'}.schoolsuite.ph</code>)
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep({ kind: 'credentials', tenant: null })}
              className={secondaryBtn}
              data-testid="tenant-skip"
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={submitting || !tenantSlug.trim()}
              className={primaryBtn}
            >
              {submitting ? (
                <>
                  <Spinner /> Looking up school…
                </>
              ) : (
                <>
                  Continue <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </form>
      </StepTransition>
    );
  }

  /* ---------------- MFA verification step ---------------- */

  if (step.kind === 'mfa') {
    return (
      <StepTransition stepKey="mfa">
        <form onSubmit={handleMfaVerify} className="space-y-5" noValidate data-testid="mfa-step">
          {formError && <FieldError message={formError} />}

          <div className="flex flex-col items-center gap-3 rounded-xl bg-[hsl(var(--accent-subtle))] px-4 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--accent-ink))]">
              <KeyRound size={20} />
            </div>
            <div>
              <p className="font-semibold text-[hsl(var(--foreground))]">Two-factor authentication</p>
              <p className="mt-1 text-sm text-[hsl(var(--ink-300))]">
                Enter the 6-digit code from your authenticator app
                {step.email ? <> for <span className="font-medium text-[hsl(var(--foreground))]">{step.email}</span></> : null}.
              </p>
            </div>
          </div>

          {step.mfaSetupRequired && (
            <div className="flex items-start gap-2 rounded-lg bg-[hsl(var(--status-info-surface))] px-3.5 py-2.5 text-xs text-[hsl(var(--status-info-ink))]" role="status">
              <Shield className="mt-0.5 shrink-0" size={14} />
              <span>
                First-time setup: scan the QR code shown by your administrator to link your authenticator, then enter the
                code here to finish enabling MFA.
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="mfa-code" className="text-sm font-medium text-[hsl(var(--foreground))]">
              Verification code
            </label>
            <input
              id="mfa-code"
              ref={mfaInputRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              aria-invalid={!!formError}
              data-testid="mfa-code-input"
              className={cn(fieldBase, 'text-center text-xl font-semibold tracking-[0.5em]')}
            />
          </div>

          <button type="submit" disabled={submitting || mfaCode.length < 6} className={primaryBtn + ' w-full'}>
            {submitting ? (
              <>
                <Spinner /> Verifying…
              </>
            ) : (
              <>
                Verify &amp; sign in <ArrowRight size={15} />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setPassword('');
              setStep({ kind: 'credentials', tenant: step.tenant });
            }}
            className={secondaryBtn + ' w-full'}
          >
            <ArrowLeft size={15} /> Back to sign in
          </button>

          <TrustNote />
        </form>
      </StepTransition>
    );
  }

  /* ---------------- Credentials step ---------------- */

  const tenant = step.kind === 'credentials' ? step.tenant : null;

  return (
    <StepTransition stepKey="credentials">
      <form onSubmit={handleCredentials} className="space-y-5" noValidate data-testid="credentials-step">
        {formError && <FieldError message={formError} />}

        {tenant && (
          <div
            className="flex items-center gap-2 rounded-lg bg-[hsl(var(--accent-subtle))] px-3.5 py-2.5 text-sm"
            data-testid="tenant-pill"
          >
            <Building2 size={15} className="shrink-0 text-[hsl(var(--accent))]" />
            <span className="text-[hsl(var(--ink-300))]">Signing in to</span>
            <span className="font-medium text-[hsl(var(--foreground))]">{tenant.name}</span>
            {showTenantStep && (
              <button
                type="button"
                className="ml-auto text-xs text-[hsl(var(--ink-300))] underline underline-offset-2 transition-colors hover:text-[hsl(var(--foreground))]"
                onClick={() => setStep({ kind: 'tenant' })}
              >
                change
              </button>
            )}
          </div>
        )}
        {!tenant && showTenantStep && (
          <button
            type="button"
            onClick={() => setStep({ kind: 'tenant' })}
            className="text-sm text-[hsl(var(--accent))] hover:underline"
            data-testid="select-school-link"
          >
            Select your school
          </button>
        )}

        <InlineField
          id="email"
          label="Email address"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@school.ph"
          autoComplete="username"
          inputMode="email"
          autoFocus
          onClear={() => setEmail('')}
        />

        <div className="space-y-1.5">
          <InlineField
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Enter your password"
            autoComplete="current-password"
          />
          {forgotPasswordUrl && (
            <button
              type="button"
              className="text-xs text-[hsl(var(--accent))] hover:underline"
              onClick={() => {
                window.location.href = forgotPasswordUrl;
              }}
            >
              Forgot password?
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || !email.trim() || !password}
          className={primaryBtn + ' w-full'}
          data-testid="credentials-submit"
        >
          {submitting ? (
            <>
              <Spinner /> Signing in…
            </>
          ) : (
            <>
              Sign in <ArrowRight size={15} />
            </>
          )}
        </button>

        <TrustNote />
      </form>
    </StepTransition>
  );
}

export { InlineField, TrustNote };
