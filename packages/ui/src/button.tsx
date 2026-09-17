'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@sms/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--surface-base))] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-[hsl(var(--accent))] gradient-bg rounded-lg text-white font-semibold shadow-md shadow-[hsl(var(--accent)/0.30)] hover:opacity-95 hover:shadow-lg hover:shadow-[hsl(var(--accent)/0.40)] active:scale-[0.98]',
        destructive:
          'rounded-lg bg-[hsl(var(--destructive))] text-white font-semibold shadow-sm shadow-[hsl(var(--destructive)/0.25)] hover:bg-[hsl(var(--destructive)/0.90)] active:scale-[0.98]',
        outline:
          'rounded-lg border border-[hsl(var(--border-strong))] bg-[hsl(var(--surface-raised))] text-[hsl(var(--ink-100))] font-semibold shadow-xs hover:bg-[hsl(var(--surface-input))] hover:border-[hsl(var(--accent))] hover:text-[hsl(var(--accent))] active:scale-[0.98]',
        secondary:
          'rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-input))] text-[hsl(var(--ink-100))] font-semibold shadow-xs hover:bg-[hsl(var(--surface-muted))] hover:border-[hsl(var(--border-strong))] active:scale-[0.98]',
        ghost:
          'rounded-lg border border-[hsl(var(--border)/0.8)] bg-[hsl(var(--surface-raised))] text-[hsl(var(--ink-100))] hover:border-[hsl(var(--border-strong))] hover:bg-[hsl(var(--surface-input))] hover:text-[hsl(var(--ink-100))] active:scale-[0.98] shadow-xs',
        link:
          'rounded-sm text-[hsl(var(--accent))] font-medium underline-offset-4 hover:underline',
      },
      size: {
        xs:      'h-7 px-2.5 text-[11px]',
        sm:      'h-8 px-3 text-xs',
        default: 'h-10 px-4 py-2 text-sm',
        lg:      'h-11 px-6 text-sm',
        icon:    'h-10 w-10 text-sm',
        'icon-sm': 'h-8 w-8 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
