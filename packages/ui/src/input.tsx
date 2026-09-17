'use client';

import * as React from 'react';
import { cn } from '@sms/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-input))] px-3 py-2 text-sm text-[hsl(var(--ink-100))] transition-all duration-150',
          'placeholder:text-[hsl(var(--ink-300))]',
          'focus-visible:outline-none focus-visible:border-[hsl(var(--accent)/0.8)] focus-visible:shadow-[0_0_0_3px_hsl(var(--accent)/0.18),0_0_12px_0_hsl(var(--accent)/0.10)]',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'aria-[invalid=true]:border-[hsl(var(--status-danger-ink)/0.7)] aria-[invalid=true]:focus-visible:shadow-[0_0_0_3px_hsl(var(--status-danger-ink)/0.18)]',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
