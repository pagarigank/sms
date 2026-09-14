'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';
import { cn } from '@sms/utils';

const toastVariants = cva(
  'pointer-events-auto relative flex w-full items-start justify-between space-x-3 overflow-hidden rounded-lg border p-4 pr-9 shadow-lg transition-all',
  {
    variants: {
      variant: {
        default:
          'border-[hsl(var(--border))] bg-[hsl(var(--surface-raised))] text-[hsl(var(--ink-100))]',
        destructive:
          'border-[hsl(var(--status-danger-ink))]/30 bg-[hsl(var(--status-danger-surface))] text-[hsl(var(--status-danger-ink))]',
        success:
          'border-[hsl(var(--status-success-ink))]/30 bg-[hsl(var(--status-success-surface))] text-[hsl(var(--status-success-ink))]',
        warning:
          'border-[hsl(var(--status-warning-ink))]/30 bg-[hsl(var(--status-warning-surface))] text-[hsl(var(--status-warning-ink))]',
        info:
          'border-[hsl(var(--status-info-ink))]/30 bg-[hsl(var(--status-info-surface))] text-[hsl(var(--status-info-ink))]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const TOAST_ICONS: Record<string, React.ReactNode> = {
  default: null,
  success: <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />,
  destructive: <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />,
  warning: <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />,
  info: <Info className="h-5 w-5 shrink-0" aria-hidden="true" />,
};

interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  onClose?: () => void;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant, onClose, children, ...props }, ref) => (
    <div ref={ref} className={cn(toastVariants({ variant }), className)} {...props}>
      {TOAST_ICONS[variant ?? 'default'] ?? null}
      <div className="grid flex-1 gap-0.5">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="absolute right-2 top-2 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
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
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              variant={toast.variant}
              onClose={() => removeToast(toast.id)}
              className="animate-in slide-in-from-bottom-2 fade-in-0 duration-200"
            >
              {toast.title && <div className="text-sm font-semibold leading-snug">{toast.title}</div>}
              {toast.description && (
                <div className="text-sm leading-snug opacity-90">{toast.description}</div>
              )}
            </Toast>
          ))}
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
