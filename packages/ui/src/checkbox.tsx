'use client';

import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '@sms/utils';

interface CheckboxProps extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, onCheckedChange, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer h-4 w-4 shrink-0 rounded-sm border border-[hsl(var(--border-strong))] bg-[hsl(var(--surface-input))]',
      'transition-all duration-150',
      'focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_hsl(var(--accent)/0.22)]',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:gradient-bg data-[state=checked]:border-transparent data-[state=checked]:text-white data-[state=checked]:scale-[1.05]',
      className
    )}
    onCheckedChange={onCheckedChange}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current animate-scale-in">
      <Check className="h-3 w-3 stroke-[3]" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };