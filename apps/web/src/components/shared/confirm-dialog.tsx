'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Trash2, Info, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'warning' | 'info';
  loading?: boolean;
  icon?: LucideIcon;
  children?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'destructive',
  loading: externalLoading,
  icon,
  children,
}: ConfirmDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const loading = externalLoading ?? internalLoading;
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const Icon =
    icon ?? (variant === 'destructive' ? Trash2 : variant === 'info' ? Info : AlertTriangle);

  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      setTimeout(() => confirmRef.current?.focus(), 50);
    } else if (previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
      if (e.key === 'Tab') {
        const focusable = [cancelRef.current, confirmRef.current].filter(Boolean) as HTMLElement[];
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  if (!open) return null;

  const handleConfirm = async () => {
    setInternalLoading(true);
    try {
      await onConfirm();
    } finally {
      setInternalLoading(false);
      onOpenChange(false);
    }
  };

  return (
    <div
      className="dialog-fade fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={() => {
        if (!loading) onOpenChange(false);
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
    >
      <div
        className="dialog-pop bg-background border-border w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl shadow-black/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-4 p-6">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-md',
                variant === 'destructive' && 'from-red-500 to-rose-500 shadow-red-500/30',
                variant === 'warning' && 'from-amber-400 to-orange-500 shadow-amber-500/30',
                variant === 'info' && 'from-sky-500 to-blue-600 shadow-sky-500/30',
              )}
            >
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="space-y-1">
              <h2 id="confirm-title" className="text-lg font-semibold">
                {title}
              </h2>
              <p id="confirm-desc" className="text-muted-foreground text-sm">
                {description}
              </p>
              {children && <div className="pt-2">{children}</div>}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              ref={cancelRef}
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {cancelLabel}
            </Button>
            <Button
              ref={confirmRef}
              variant={variant === 'destructive' ? 'destructive' : 'default'}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? 'Processing...' : confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
