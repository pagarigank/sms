'use client';

import { useState, useRef, useEffect } from 'react';
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
  'h-12 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--surface-input))] px-3.5 text-sm text-[hsl(var(--ink-100))] ' +
  'placeholder:text-[hsl(var(--ink-300))] transition-all duration-150 ' +
  'hover:border-[hsl(var(--border-strong))] ' +
  'focus-visible:outline-none focus-visible:border-[hsl(var(--accent))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent)/0.25)]';

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
  const [visible, setVisible] = useState(stepKey);

  useEffect(() => {
    // Animate in on step change; animate out (hide) immediately on the
    // outgoing step so the new step's mount-in animation is not layered.
    setVisible(stepKey);
  }, [stepKey]);

  return (
    <div className={cn('transition-opacity duration-200 ease-out', visible === stepKey ? 'opacity-100' : 'opacity-0')}>
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
    <div
      className={cn(
        'flex items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-overlay)/0.4)] px-3 py-2 text-xs text-[hsl(var(--ink-300))] backdrop-blur-sm',
        className
      )}
    >
      <Shield size={13} className="shrink-0 text-[hsl(var(--accent))]" />
      <span>Your session is encrypted and audit-logged.</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step indicator dots for multi-step progress.                      */
/* ------------------------------------------------------------------ */

function StepIndicator({ currentStep, showTenant }: { currentStep: 'tenant' | 'credentials' | 'mfa'; showTenant: boolean }) {
  const steps = showTenant
    ? [
        { key: 'tenant', label: 'School' },
        { key: 'credentials', label: 'Account' },
        { key: 'mfa', label: 'Security' },
      ]
    : [
        { key: 'credentials', label: 'Account' },
        { key: 'mfa', label: 'Security' },
      ];

  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="mb-5 flex items-center justify-center gap-1.5" aria-hidden="true">
      {steps.map((s, idx) => {
        const isActive = idx === currentIndex;
        const isPast = idx < currentIndex;
        return (
          <div
            key={s.key}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              isActive
                ? 'w-7 bg-gradient-to-r from-[hsl(var(--gradient-from))] to-[hsl(var(--gradient-to))] shadow-sm shadow-[hsl(var(--accent)/0.5)]'
                : isPast
                ? 'w-2 bg-[hsl(var(--accent)/0.7)]'
                : 'w-2 bg-[hsl(var(--border-strong))]'
            )}
          />
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared button styles for step actions.                            */
/* ------------------------------------------------------------------ */

const primaryBtn =
  'inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl gradient-bg px-5 text-sm font-semibold text-white border border-[hsl(var(--gradient-to)/0.5)] shadow-md shadow-[hsl(var(--gradient-from)/0.30)] transition-all duration-150 hover:shadow-lg hover:shadow-[hsl(var(--gradient-from)/0.40)] hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none';

const secondaryBtn =
  'inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border-strong))] bg-[hsl(var(--surface-input))] px-4 text-sm font-medium text-[hsl(var(--ink-100))] transition-all duration-150 hover:bg-[hsl(var(--surface-muted))] hover:border-[hsl(var(--accent)/0.4)] active:scale-[0.98]';

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
          <StepIndicator currentStep="tenant" showTenant={showTenantStep} />
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
            <code className="rounded bg-[hsl(var(--surface-muted))] px-1.5 py-0.5 text-[hsl(var(--ink-200))] font-mono">{tenantSlug || 'school'}.schoolsuite.ph</code>)
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
          <StepIndicator currentStep="mfa" showTenant={showTenantStep} />
          {formError && <FieldError message={formError} />}

          <div className="flex flex-col items-center gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-raised)/0.5)] px-4 py-6 text-center backdrop-blur-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-bg text-white shadow-lg shadow-[hsl(var(--gradient-from)/0.3)]">
              <KeyRound size={22} />
            </div>
            <div>
              <p className="font-semibold text-[hsl(var(--ink-100))]">Two-factor authentication</p>
              <p className="mt-1 text-sm text-[hsl(var(--ink-300))]">
                Enter the 6-digit code from your authenticator app
                {step.email ? <> for <span className="font-medium text-[hsl(var(--ink-100))]">{step.email}</span></> : null}.
              </p>
            </div>
          </div>

          {step.mfaSetupRequired && (
            <div className="flex items-start gap-2.5 rounded-xl border border-[hsl(var(--status-info-border))] bg-[hsl(var(--status-info-surface))] px-3.5 py-2.5 text-xs text-[hsl(var(--status-info-ink))]" role="status">
              <Shield className="mt-0.5 shrink-0" size={14} />
              <span>
                First-time setup: scan the QR code shown by your administrator to link your authenticator, then enter the
                code here to finish enabling MFA.
              </span>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="mfa-code" className="block text-center text-sm font-medium text-[hsl(var(--ink-100))]">
              Verification code
            </label>
            <div className="relative flex justify-center">
              <div className="flex gap-2.5" aria-hidden="true">
                {Array.from({ length: 6 }).map((_, idx) => {
                  const char = mfaCode[idx] ?? '';
                  const isCurrent = idx === mfaCode.length && mfaCode.length < 6;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        'flex h-13 w-11 sm:w-12 items-center justify-center rounded-xl border text-xl font-bold transition-all duration-150',
                        char
                          ? 'border-[hsl(var(--accent))] bg-[hsl(var(--surface-overlay))] text-[hsl(var(--ink-100))] shadow-sm shadow-[hsl(var(--accent)/0.2)]'
                          : 'border-[hsl(var(--input))] bg-[hsl(var(--surface-input))] text-[hsl(var(--ink-300))]',
                        isCurrent && 'ring-2 ring-[hsl(var(--accent))] border-[hsl(var(--accent))] scale-105'
                      )}
                    >
                      {char || (isCurrent ? <span className="h-5 w-0.5 animate-pulse bg-[hsl(var(--accent))]" /> : '')}
                    </div>
                  );
                })}
              </div>
              <input
                id="mfa-code"
                ref={mfaInputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder=""
                aria-invalid={!!formError}
                data-testid="mfa-code-input"
                className="absolute inset-0 h-full w-full cursor-text opacity-0"
              />
            </div>
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
        <StepIndicator currentStep="credentials" showTenant={showTenantStep} />
        {formError && <FieldError message={formError} />}

        {tenant && (
          <div
            className="flex items-center gap-2.5 rounded-xl border border-[hsl(var(--accent)/0.3)] bg-[hsl(var(--accent)/0.08)] px-3.5 py-2.5 text-sm"
            data-testid="tenant-pill"
          >
            <Building2 size={16} className="shrink-0 text-[hsl(var(--accent))]" />
            <span className="text-[hsl(var(--ink-300))]">Signing in to</span>
            <span className="font-semibold text-[hsl(var(--ink-100))]">{tenant.name}</span>
            {showTenantStep && (
              <button
                type="button"
                className="ml-auto rounded px-1.5 py-0.5 text-xs font-medium text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.15)] transition-colors"
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
