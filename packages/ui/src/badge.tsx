'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@sms/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide transition-all duration-150 select-none',
  {
    variants: {
      variant: {
        default:
          'border-transparent gradient-bg text-white shadow-sm',
        secondary:
          'border-[hsl(var(--border))] bg-[hsl(var(--surface-muted))] text-[hsl(var(--ink-200))]',
        destructive:
          'border-[hsl(var(--status-danger-border))] bg-[hsl(var(--status-danger-surface))] text-[hsl(var(--status-danger-ink))]',
        outline:
          'border-[hsl(var(--border-strong))] text-[hsl(var(--ink-100))]',
        success:
          'border-[hsl(var(--status-success-border))] bg-[hsl(var(--status-success-surface))] text-[hsl(var(--status-success-ink))]',
        warning:
          'border-[hsl(var(--status-warning-border))] bg-[hsl(var(--status-warning-surface))] text-[hsl(var(--status-warning-ink))]',
        danger:
          'border-[hsl(var(--status-danger-border))] bg-[hsl(var(--status-danger-surface))] text-[hsl(var(--status-danger-ink))]',
        info:
          'border-[hsl(var(--status-info-border))] bg-[hsl(var(--status-info-surface))] text-[hsl(var(--status-info-ink))]',
        neutral:
          'border-[hsl(var(--status-neutral-border))] bg-[hsl(var(--status-neutral-surface))] text-[hsl(var(--status-neutral-ink))]',
        accent:
          'border-[hsl(var(--accent)/0.35)] bg-[hsl(var(--accent-subtle))] text-[hsl(var(--accent))]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/**
 * Map an arbitrary backend status string to a Badge variant.
 *
 * Shared across all portals so "active" is green and "suspended" is amber
 * everywhere. Unknown statuses fall back to `neutral`.
 */
export function statusToVariant(
  status: string | boolean | null | undefined
): NonNullable<BadgeProps['variant']> {
  const s = (status ?? '').toString().trim().toLowerCase();

  if (s === 'true' || s === '1') return 'success';
  if (s === 'false' || s === '0') return 'neutral';

  switch (s) {
    case 'active':
    case 'enabled':
    case 'paid':
    case 'enrolled':
    case 'accepted':
    case 'admitted':
    case 'completed':
    case 'promoted':
    case 'graduated':
    case 'published':
    case 'approved':
    case 'released':
    case 'success':
    case 'present':
      return 'success';
    case 'suspended':
    case 'pending':
    case 'draft':
    case 'requested':
    case 'awaiting':
    case 'partial':
    case 'review':
    case 'requires_approval':
    case 'upcoming':
    case 'maintenance':
    case 'warning':
    case 'late':
    case 'fee_assessed':
      return 'warning';
    case 'rejected':
    case 'deleted':
    case 'failed':
    case 'overdue':
    case 'cancelled':
    case 'canceled':
    case 'absent':
    case 'transferred_out':
    case 'retained':
    case 'error':
      return 'danger';
    case 'info':
    case 'update':
    case 'branch':
    case 'in_progress':
      return 'info';
    case 'archived':
    case 'inactive':
    case 'disabled':
    case 'unknown':
    case '':
      return 'neutral';
    default:
      return 'neutral';
  }
}

/** Small colored dot — optionally animated — used inside status pills. */
export function StatusDot({
  className,
  animate = false,
}: {
  className?: string;
  animate?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'h-1.5 w-1.5 shrink-0 rounded-full bg-current',
        animate && 'animate-dot-pulse',
        className
      )}
    />
  );
}

export { Badge, badgeVariants };

