'use client';

import * as React from 'react';
import { ShieldCheck, Sparkles, GraduationCap } from 'lucide-react';
import { cn } from '@sms/utils';
import { BrandMark, Wordmark } from './brand';

/* ------------------------------------------------------------------ */
/*  AuthShell — shared split-screen authentication layout.            */
/*  Desktop: brand panel left, form panel right. Mobile: centered.    */
/*  Portals customize headline, feature list, and accent hue.         */
/* ------------------------------------------------------------------ */

export interface AuthShellProps {
  /** Small kicker above the headline on the brand panel. */
  eyebrow: string;
  /** Hero headline on the brand panel. */
  headline: string;
  /** Supporting paragraph on the brand panel. */
  description: string;
  /** One-line footer for the form column, e.g. "SchoolSuite SMS · Platform Console". */
  footer: string;
  /** Subtitle under the mobile brand lockup. */
  mobileSubtitle: string;
  /** Feature bullets shown on the brand panel (desktop only). */
  features?: string[];
  /** Extra CSS hue rotation for per-portal differentiation (school: warm, platform: cool, guardian: fresh). */
  hue?: number;
  /** Max width of the sign-in card. */
  cardClassName?: string;
  children: React.ReactNode;
}

const DEFAULT_FEATURES = [
  'Multi-tenant isolation',
  'Audit-logged every action',
  'OIDC + MFA ready',
];

export function AuthShell({
  eyebrow,
  headline,
  description,
  footer,
  mobileSubtitle,
  features = DEFAULT_FEATURES,
  hue = 0,
  cardClassName,
  children,
}: AuthShellProps) {
  const featureIcons = [ShieldCheck, Sparkles, GraduationCap];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[hsl(var(--surface-base))] px-4 py-10 lg:justify-end lg:px-0 lg:py-0">
      {/* Ambient background with glowing mesh and floating orbs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-32 -top-32 h-[34rem] w-[34rem] rounded-full bg-gradient-to-br from-[hsl(var(--gradient-from)/0.3)] to-[hsl(var(--gradient-to)/0.15)] opacity-70 blur-3xl animate-float"
          style={hue ? { filter: `hue-rotate(${hue}deg) blur(72px)` } : { filter: 'blur(72px)' }}
        />
        <div
          className="absolute -bottom-32 -right-24 h-[34rem] w-[34rem] rounded-full bg-gradient-to-tl from-[hsl(var(--secondary)/0.25)] to-[hsl(var(--accent)/0.2)] opacity-60 blur-3xl"
          style={hue ? { filter: `hue-rotate(${hue}deg) blur(80px)` } : { filter: 'blur(80px)' }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[hsl(var(--accent)/0.06)] via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Brand panel — desktop only */}
      <aside
        aria-hidden="true"
        className="absolute inset-y-0 left-0 z-0 hidden w-1/2 flex-col justify-between gap-10 p-14 lg:flex"
      >
        <div className="flex items-center gap-3">
          <BrandMark className="h-9 w-9 text-[hsl(var(--accent))]" />
          <Wordmark className="text-xl font-bold tracking-tight" />
        </div>

        <div className="max-w-md space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--accent)/0.25)] bg-[hsl(var(--accent)/0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--accent))]">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))] animate-pulse" />
            {eyebrow}
          </div>
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-[hsl(var(--ink-100))]">
            {headline}
          </h2>
          <p className="leading-relaxed text-[hsl(var(--ink-300))] text-base">{description}</p>
        </div>

        <ul className="max-w-md space-y-3.5">
          {features.map((label, i) => {
            const Icon = featureIcons[i % featureIcons.length];
            return (
              <li key={label} className="flex items-center gap-3.5 text-sm font-medium text-[hsl(var(--ink-200))]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl gradient-bg text-white shadow-lg shadow-[hsl(var(--gradient-from)/0.25)]">
                  <Icon className="h-4 w-4" />
                </span>
                {label}
              </li>
            );
          })}
        </ul>

        <p className="text-xs text-[hsl(var(--ink-300))] opacity-80">{footer}</p>
      </aside>

      {/* Form column — centered on mobile, right half on desktop */}
      <div className="relative z-10 flex w-full max-w-md flex-col items-center lg:mr-[8vw]">
        <h1 className="sr-only">SchoolSuite — Sign in to {mobileSubtitle}</h1>

        {/* Mobile brand lockup */}
        <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
          <BrandMark className="h-11 w-11 text-[hsl(var(--accent))]" />
          <Wordmark className="text-xl" />
          <span className="text-xs font-medium text-[hsl(var(--ink-300))]">{mobileSubtitle}</span>
        </div>

        <div
          className={cn(
            'w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-raised)/0.88)] backdrop-blur-2xl p-8 shadow-xl shadow-[hsl(var(--accent)/0.08)] sm:p-10 ring-1 ring-[hsl(var(--border))]',
            cardClassName
          )}
        >
          {children}
        </div>

        <p className="mt-6 text-center text-xs text-[hsl(var(--ink-300))] opacity-80">{footer}</p>
      </div>
    </div>
  );
}
