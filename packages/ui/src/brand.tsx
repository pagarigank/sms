'use client';

import * as React from 'react';
import { cn } from '@sms/utils';

/* ------------------------------------------------------------------ */
/*  Brand mark — interlocking rings + forward chevron                */
/*  Deliberate abstract mark (not a placeholder) for SchoolSuite SMS  */
/* ------------------------------------------------------------------ */

const BrandMark = React.forwardRef<
  SVGSVGElement,
  React.HTMLAttributes<SVGSVGElement> & { variant?: 'default' | 'outline' }
>(({ className, variant = 'default', ...props }, ref) => {
  const isOutline = variant === 'outline';

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn('shrink-0', className)}
      {...props}
    >
      {/* ring A */}
      <circle
        cx="12.5"
        cy="16"
        r="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        opacity={isOutline ? 0.9 : 0.85}
      />
      {/* ring B — overlaps A, offset up-right */}
      <circle
        cx={18.5}
        cy={isOutline ? 16 : 15}
        r="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        opacity={isOutline ? 0.9 : 0.85}
      />
      {/* shared front lobe (where the two rings interlock) */}
      <path
        d="M20.5 15a6 6 0 1 0 -3 -5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        opacity={isOutline ? 0.7 : 0.9}
      />
      {/* forward chevron (the "Suite" / forward motion mark) */}
      <path
        d="M21.4 12.4l3.2 3.2-3.2 3.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={isOutline ? 0.75 : 1}
      />
    </svg>
  );
});
BrandMark.displayName = 'BrandMark';

/* ------------------------------------------------------------------ */
/*  Wordmark                                                          */
/* ------------------------------------------------------------------ */

const Wordmark = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & {
    accent?: boolean;
  }
>(({ className, accent = false, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      'inline-flex items-center gap-2.5 text-lg font-semibold tracking-tight',
      accent ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--foreground))]',
      className
    )}
    {...props}
  >
    SchoolSuite
    <span
      className={cn(
        'rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
        accent
          ? 'bg-[hsl(var(--accent-subtle))] text-[hsl(var(--accent))]'
          : 'bg-[hsl(var(--surface-muted))] text-[hsl(var(--ink-300))]'
      )}
    >
      SMS
    </span>
  </span>
));
Wordmark.displayName = 'Wordmark';

/* ------------------------------------------------------------------ */
/*  BrandLockup — mark + wordmark, with optional subtitle            */
/* ------------------------------------------------------------------ */

interface BrandLockupProps extends React.HTMLAttributes<HTMLDivElement> {
  subtitle?: string;
  accent?: boolean;
  markVariant?: 'default' | 'outline';
  className?: string;
}

const BrandLockup = React.forwardRef<HTMLDivElement, BrandLockupProps>(
  ({ subtitle, accent = false, markVariant = 'default', className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('inline-flex items-center flex-col gap-1.5', className)}
      {...props}
    >
      <BrandMark variant={markVariant} />
      <Wordmark accent={accent} />
      {subtitle ? (
        <span className="text-xs text-[hsl(var(--ink-300))]">{subtitle}</span>
      ) : null}
    </div>
  )
);
BrandLockup.displayName = 'BrandLockup';

export { BrandMark, Wordmark, BrandLockup };
