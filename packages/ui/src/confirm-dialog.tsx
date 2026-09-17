'use client';

import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@sms/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Button } from './button';

/**
 * Confirmation dialog — a styled, keyboard-accessible replacement for
 * `window.confirm`. Use the {@link useConfirm} hook for imperative call sites:
 *
 * ```tsx
 * const confirm = useConfirm();
 * const ok = await confirm({
 *   title: 'Delete tenant?',
 *   description: 'This action cannot be undone.',
 *   confirmLabel: 'Delete',
 *   destructive: true,
 * });
 * if (ok) deleteMutation.mutate(id);
 * ```
 */

export interface ConfirmOptions {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as destructive (red). */
  destructive?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  id: number;
  resolve: (ok: boolean) => void;
}

const ConfirmContext = React.createContext<
  ((options: ConfirmOptions) => Promise<boolean>) | null
>(null);

let confirmCounter = 0;

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState<ConfirmState | null>(null);
  const openRef = React.useRef(false);

  const confirm = React.useCallback((options: ConfirmOptions): Promise<boolean> => {
    // A dialog is already open — resolve immediately as cancelled.
    if (openRef.current) return Promise.resolve(false);
    openRef.current = true;
    return new Promise<boolean>((resolve) => {
      confirmCounter += 1;
      setPending({ ...options, id: confirmCounter, resolve });
    });
  }, []);

  const settle = React.useCallback(
    (ok: boolean) => {
      pending?.resolve(ok);
      openRef.current = false;
      setPending(null);
    },
    [pending]
  );

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) settle(false);
    },
    [settle]
  );

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={!!pending} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <div className="flex items-start gap-4">
            <span
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                pending?.destructive
                  ? 'bg-[hsl(var(--status-danger-surface))] text-[hsl(var(--status-danger-ink))] ring-1 ring-[hsl(var(--status-danger-border))]'
                  : 'gradient-bg text-white shadow-lg shadow-[hsl(var(--gradient-from)/0.3)]'
              )}
              aria-hidden="true"
            >
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogHeader>
                <DialogTitle>{pending?.title ?? ''}</DialogTitle>
                {pending?.description && (
                  <DialogDescription>{pending.description}</DialogDescription>
                )}
              </DialogHeader>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => settle(false)}>
              {pending?.cancelLabel ?? 'Cancel'}
            </Button>
            <Button
              type="button"
              variant={pending?.destructive ? 'destructive' : 'default'}
              autoFocus
              onClick={() => settle(true)}
            >
              {pending?.confirmLabel ?? 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return ctx;
}
