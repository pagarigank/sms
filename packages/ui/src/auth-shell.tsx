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
      {/* Ambient field */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-32 top-[-8rem] h-96 w-96 rounded-full bg-[hsl(var(--accent-subtle))] opacity-50 blur-3xl"
          style={hue ? { filter: `hue-rotate(${hue}deg) blur(64px)` } : { filter: 'blur(64px)' }}
        />
        <div
          className="absolute bottom-[-8rem] right-[-6rem] h-96 w-96 rounded-full bg-[hsl(var(--secondary-subtle))] opacity-40 blur-3xl"
          style={hue ? { filter: `hue-rotate(${hue}deg) blur(64px)` } : { filter: 'blur(64px)' }}
        />
      </div>

      {/* Brand panel — desktop only */}
      <aside
        aria-hidden="true"
        className="absolute inset-y-0 left-0 z-0 hidden w-1/2 flex-col justify-between gap-10 p-12 lg:flex"
      >
        <div className="flex items-center gap-3">
          <BrandMark className="h-9 w-9 text-[hsl(var(--accent))]" />
          <Wordmark className="text-xl" />
        </div>

        <div className="max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--accent))]">
            {eyebrow}
          </p>
          <h2 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-[hsl(var(--foreground))]">
            {headline}
          </h2>
          <p className="mt-4 leading-relaxed text-[hsl(var(--ink-300))]">{description}</p>
        </div>

        <ul className="max-w-md space-y-3">
          {features.map((label, i) => {
            const Icon = featureIcons[i % featureIcons.length];
            return (
              <li key={label} className="flex items-center gap-3 text-sm text-[hsl(var(--ink-300))]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--surface-raised))] shadow-sm ring-1 ring-[hsl(var(--border))]">
                  <Icon className="h-4 w-4 text-[hsl(var(--accent))]" />
                </span>
                {label}
              </li>
            );
          })}
        </ul>

        <p className="text-xs text-[hsl(var(--ink-300))]">{footer}</p>
      </aside>

      {/* Form column — centered on mobile, right half on desktop */}
      <div className="relative z-10 flex w-full max-w-md flex-col items-center lg:mr-[8vw]">
        <h1 className="sr-only">SchoolSuite — Sign in to {mobileSubtitle}</h1>

        {/* Mobile brand lockup */}
        <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
          <BrandMark className="h-10 w-10 text-[hsl(var(--accent))]" />
          <Wordmark />
          <span className="text-xs text-[hsl(var(--ink-300))]">{mobileSubtitle}</span>
        </div>

        <div
          className={cn(
            'w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-raised))] p-8 shadow-xl shadow-black/5 sm:p-10',
            cardClassName
          )}
        >
          {children}
        </div>

        <p className="mt-6 text-center text-xs text-[hsl(var(--ink-300))]">{footer}</p>
      </div>
    </div>
  );
}
