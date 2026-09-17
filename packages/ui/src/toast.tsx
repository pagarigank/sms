'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';
import { cn } from '@sms/utils';

const VARIANT_BORDER: Record<string, string> = {
  default:     'border-l-[hsl(var(--border-strong))]',
  success:     'border-l-[hsl(var(--status-success-ink))]',
  destructive: 'border-l-[hsl(var(--status-danger-ink))]',
  warning:     'border-l-[hsl(var(--status-warning-ink))]',
  info:        'border-l-[hsl(var(--status-info-ink))]',
};

const VARIANT_PROGRESS: Record<string, string> = {
  default:     'bg-[hsl(var(--ink-300))]',
  success:     'bg-[hsl(var(--status-success-ink))]',
  destructive: 'bg-[hsl(var(--status-danger-ink))]',
  warning:     'bg-[hsl(var(--status-warning-ink))]',
  info:        'bg-[hsl(var(--status-info-ink))]',
};

const toastVariants = cva(
  [
    'pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden',
    'rounded-xl border border-[hsl(var(--border))] border-l-4',
    'bg-[hsl(var(--surface-raised))] backdrop-blur-xl',
    'p-4 pr-10 shadow-xl shadow-[hsl(var(--ink-100)/0.10)]',
    'transition-all duration-200',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'border-l-[hsl(var(--border-strong))] text-[hsl(var(--ink-100))]',
        destructive:
          'border-l-[hsl(var(--status-danger-ink))] text-[hsl(var(--ink-100))]',
        success:
          'border-l-[hsl(var(--status-success-ink))] text-[hsl(var(--ink-100))]',
        warning:
          'border-l-[hsl(var(--status-warning-ink))] text-[hsl(var(--ink-100))]',
        info:
          'border-l-[hsl(var(--status-info-ink))] text-[hsl(var(--ink-100))]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const TOAST_ICONS: Record<string, React.ReactNode> = {
  default:     null,
  success:     <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--status-success-ink))]" aria-hidden="true" />,
  destructive: <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--status-danger-ink))]" aria-hidden="true" />,
  warning:     <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--status-warning-ink))]" aria-hidden="true" />,
  info:        <Info className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--status-info-ink))]" aria-hidden="true" />,
};

interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  onClose?: () => void;
  /** Duration in ms for the progress bar. 0 = no bar. */
  duration?: number;
  progressDuration?: number;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant, onClose, children, progressDuration, ...props }, ref) => (
    <div ref={ref} className={cn(toastVariants({ variant }), className)} {...props}>
      {TOAST_ICONS[variant ?? 'default'] ?? null}
      <div className="grid flex-1 gap-0.5 min-w-0">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="absolute right-2 top-2 rounded-md p-1 text-[hsl(var(--ink-300))] opacity-70 transition-opacity hover:opacity-100 hover:text-[hsl(var(--ink-100))]"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {/* Auto-dismiss progress bar */}
      {progressDuration && progressDuration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-b-xl">
          <div
            className={cn('h-full animate-progress-shrink', VARIANT_PROGRESS[variant ?? 'default'] ?? VARIANT_PROGRESS.default)}
            style={{ animationDuration: `${progressDuration}ms` }}
          />
        </div>
      )}
    </div>
  )
);
Toast.displayName = 'Toast';

// ---------------------------------------------------------------------------
//  Toast Provider System
//  - Auto-dismisses after `duration` ms (default 4s, destructive 6s)
//  - Caps the stack at 4 (oldest removed first)
//  - Screen-reader friendly via an aria-live viewport
// ---------------------------------------------------------------------------

interface ToastState {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
  duration?: number;
}

interface ToastContextType {
  toasts: ToastState[];
  addToast: (toast: Omit<ToastState, 'id'>) => string;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | null>(null);

const MAX_VISIBLE_TOASTS = 4;
const DEFAULT_DURATION = 4000;
const DESTRUCTIVE_DURATION = 6000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastState[]>([]);
  const timers = React.useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const removeToast = React.useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = React.useCallback(
    (toast: Omit<ToastState, 'id'>) => {
      const id = Math.random().toString(36).substring(7);
      const duration =
        toast.duration ?? (toast.variant === 'destructive' ? DESTRUCTIVE_DURATION : DEFAULT_DURATION);
      setToasts((prev) => [...prev.slice(-(MAX_VISIBLE_TOASTS - 1)), { ...toast, id }]);
      timers.current.set(
        id,
        setTimeout(() => removeToast(id), duration)
      );
      return id;
    },
    [removeToast]
  );

  // Clear pending timers on unmount.
  React.useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const contextValue = React.useMemo(
    () => ({ toasts, addToast, removeToast }),
    [toasts, addToast, removeToast]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        className="pointer-events-none fixed bottom-0 right-0 z-50 flex w-80 flex-col gap-2 p-4 md:w-96"
        role="region"
        aria-label="Notifications"
      >
        <div aria-live="polite" aria-atomic="false" className="flex flex-col gap-2">
          {toasts.map((toast) => {
            const dur = toast.duration ?? (toast.variant === 'destructive' ? DESTRUCTIVE_DURATION : DEFAULT_DURATION);
            return (
              <Toast
                key={toast.id}
                variant={toast.variant}
                onClose={() => removeToast(toast.id)}
                progressDuration={dur}
                className="animate-slide-up-fade"
              >
                {toast.title && <div className="text-sm font-semibold leading-snug">{toast.title}</div>}
                {toast.description && (
                  <div className="text-sm leading-snug text-[hsl(var(--ink-200))]">{toast.description}</div>
                )}
              </Toast>
            );
          })}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return {
    toast: context.addToast,
    dismiss: context.removeToast,
  };
}

export { Toast, toastVariants };

